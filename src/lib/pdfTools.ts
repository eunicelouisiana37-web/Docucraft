import { PDFDocument } from 'pdf-lib';

export async function mergeFiles(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }
  const mergedPdfBytes = await mergedPdf.save();
  return new Blob([mergedPdfBytes], { type: 'application/pdf' });
}

export async function splitFile(file: File, rangeText: string): Promise<Blob[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  const totalPages = pdf.getPageCount();
  
  const pageIndicesToExtract: number[] = [];
  const parts = rangeText.split(',');
  
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) {
            pageIndicesToExtract.push(i - 1);
          }
        }
      }
    } else {
      const pageNum = Number(trimmed);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
        pageIndicesToExtract.push(pageNum - 1);
      }
    }
  }

  const finalIndices = pageIndicesToExtract.length > 0 ? pageIndicesToExtract : Array.from({ length: totalPages }, (_, i) => i);
  
  const results: Blob[] = [];
  for (const index of finalIndices) {
    const newPdf = await PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdf, [index]);
    newPdf.addPage(copiedPage);
    const bytes = await newPdf.save();
    results.push(new Blob([bytes], { type: 'application/pdf' }));
  }
  return results;
}

export async function compressFile(file: File, level: 'low' | 'medium' | 'high'): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuffer);
  
  // Strip metadata to reduce size
  pdf.setTitle('');
  pdf.setAuthor('');
  pdf.setSubject('');
  pdf.setKeywords([]);
  pdf.setProducer('');
  pdf.setCreator('');
  
  const compressedBytes = await pdf.save({
    useObjectStreams: true,
  });
  return new Blob([compressedBytes], { type: 'application/pdf' });
}

async function convertToPngViaCanvas(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Canvas conversion failed'));
        }, 'image/png');
      } else {
        reject(new Error('Canvas context error'));
      }
    };
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = URL.createObjectURL(file);
  });
}

export async function imageToPdf(files: File[], pageSize: 'A4' | 'Letter' | 'Fit', orientation: 'portrait' | 'landscape'): Promise<Blob> {
  const pdfDoc = await PDFDocument.create();
  
  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    let img;
    try {
      if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
        img = await pdfDoc.embedJpg(arrayBuffer);
      } else if (file.type === 'image/png') {
        img = await pdfDoc.embedPng(arrayBuffer);
      } else {
        const pngBlob = await convertToPngViaCanvas(file);
        const ab = await pngBlob.arrayBuffer();
        img = await pdfDoc.embedPng(ab);
      }
    } catch {
      // Fallback
      const pngBlob = await convertToPngViaCanvas(file);
      const ab = await pngBlob.arrayBuffer();
      img = await pdfDoc.embedPng(ab);
    }

    const { width, height } = img.scale(1);
    let pageW = width;
    let pageH = height;

    if (pageSize === 'A4') {
      pageW = orientation === 'portrait' ? 595.28 : 841.89;
      pageH = orientation === 'portrait' ? 841.89 : 595.28;
    } else if (pageSize === 'Letter') {
      pageW = orientation === 'portrait' ? 612 : 792;
      pageH = orientation === 'portrait' ? 792 : 612;
    }

    const page = pdfDoc.addPage([pageW, pageH]);
    
    const widthRatio = pageW / width;
    const heightRatio = pageH / height;
    const ratio = Math.min(widthRatio, heightRatio, 1);
    
    const drawW = width * ratio;
    const drawH = height * ratio;
    const drawX = (pageW - drawW) / 2;
    const drawY = (pageH - drawH) / 2;

    page.drawImage(img, {
      x: drawX,
      y: drawY,
      width: drawW,
      height: drawH,
    });
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes], { type: 'application/pdf' });
}

export async function convertImage(file: File, format: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        let mimeType = 'image/png';
        if (format === 'JPG' || format === 'JPEG') mimeType = 'image/jpeg';
        else if (format === 'WebP') mimeType = 'image/webp';
        else if (format === 'GIF') mimeType = 'image/gif';
        
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error('Conversion to blob failed'));
        }, mimeType, quality / 100);
      } else {
        reject(new Error('Canvas context not available'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image file'));
    img.src = URL.createObjectURL(file);
  });
}

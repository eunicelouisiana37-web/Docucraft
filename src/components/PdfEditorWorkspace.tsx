import React, { useState, useEffect, useRef } from 'react';
import { showToast } from '../utils/toast';
import { 
  Type, Pencil, Square, Circle, Download, Trash2, Undo2, Redo2, 
  ZoomIn, ZoomOut, Check, RotateCw, Copy, Plus, X, Palette, 
  ChevronLeft, ChevronRight, FileText, MousePointer, Image as ImageIcon,
  CheckCircle2, Eraser
} from 'lucide-react';
import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';

// Color palette options
const COLORS = [
  { name: 'Black', hex: '#000000', rgb: [0, 0, 0] },
  { name: 'Red', hex: '#ef4444', rgb: [239/255, 68/255, 68/255] },
  { name: 'Blue', hex: '#3b82f6', rgb: [59/255, 130/255, 246/255] },
  { name: 'Green', hex: '#10b981', rgb: [16/255, 185/255, 129/255] },
  { name: 'Yellow', hex: '#f59e0b', rgb: [245/255, 158/255, 11/255] },
  { name: 'Purple', hex: '#8b5cf6', rgb: [139/255, 92/255, 246/255] }
];

interface TextAnnotation {
  id: string;
  pageNum: number;
  text: string;
  x: number; // percentage from left
  y: number; // percentage from top
  fontSize: number;
  color: string;
}

interface ShapeAnnotation {
  id: string;
  pageNum: number;
  type: 'rect' | 'circle';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

interface SignatureAnnotation {
  id: string;
  pageNum: number;
  dataUrl: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PageModification {
  pageNum: number; // original page index (1-based)
  rotation: number; // 0, 90, 180, 270
  isDeleted: boolean;
}

interface PdfEditorWorkspaceProps {
  file: File;
  onClose: () => void;
  onSave: (editedBlob: Blob, filename: string) => void;
  loadPdfJS: () => Promise<any>;
}

export default function PdfEditorWorkspace({
  file,
  onClose,
  onSave,
  loadPdfJS
}: PdfEditorWorkspaceProps) {
  // Rendering & State
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [activeTool, setActiveTool] = useState<'browse' | 'draw' | 'text' | 'rect' | 'circle' | 'signature'>('browse');
  const [selectedColor, setSelectedColor] = useState<string>('#ef4444');
  const [brushSize, setBrushSize] = useState<number>(3);
  const [fontSize, setFontSize] = useState<number>(16);

  // PDF Document Instance Refs
  const pdfDocumentRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Annotation Data States
  const [textAnnotations, setTextAnnotations] = useState<TextAnnotation[]>([]);
  const [shapeAnnotations, setShapeAnnotations] = useState<ShapeAnnotation[]>([]);
  const [signatureAnnotations, setSignatureAnnotations] = useState<SignatureAnnotation[]>([]);
  const [drawings, setDrawings] = useState<{ [pageNum: number]: string }>({}); // pageNum -> transparent base64 PNG data URL
  const [pageModifications, setPageModifications] = useState<PageModification[]>([]);

  // Selected Elements (for move/delete options)
  const [selectedElement, setSelectedElement] = useState<{ type: 'text' | 'shape' | 'signature'; id: string } | null>(null);

  // Undo / Redo Stacks (Simulated for text, shapes, and signature adds)
  const [undoStack, setUndoStack] = useState<any[]>([]);
  const [redoStack, setRedoStack] = useState<any[]>([]);

  // Interactive drawing states
  const [isDrawing, setIsDrawing] = useState(false);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const workspaceContainerRef = useRef<HTMLDivElement>(null);

  // Signature Modal
  const [sigModalOpen, setSigModalOpen] = useState(false);
  const [sigType, setSigType] = useState<'draw' | 'type'>('draw');
  const [sigTypedName, setSigTypedName] = useState('');
  const [sigTypedFont, setSigTypedFont] = useState<'font-cursive' | 'font-serif' | 'font-sans'>('font-cursive');
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  // Helper styles for cursive signature fonts
  useEffect(() => {
    // Add custom font for signatures
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@700&family=Playfair+Display:ital@1&display=swap');
      .font-cursive { font-family: 'Caveat', cursive; }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Load PDF on mount
  useEffect(() => {
    const loadPdf = async () => {
      try {
        setIsLoading(true);
        const pdfjs = await loadPdfJS();
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({
          data: arrayBuffer,
          disableRange: true,
          disableStream: true,
          verbosity: 0
        });
        const pdf = await loadingTask.promise;
        pdfDocumentRef.current = pdf;
        setNumPages(pdf.numPages);
        
        // Initialize page modifications list
        const mods: PageModification[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          mods.push({ pageNum: i, rotation: 0, isDeleted: false });
        }
        setPageModifications(mods);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load PDF editor document', err);
        showToast('Error loading PDF document for editing. Please try another file.', 'error');
        onClose();
      }
    };
    loadPdf();
  }, [file]);

  // Render current PDF page on the background canvas
  useEffect(() => {
    if (isLoading || !pdfDocumentRef.current) return;

    const renderPage = async () => {
      try {
        const pdf = pdfDocumentRef.current;
        // Skip rendering if current page is flagged as deleted
        const mod = pageModifications.find(m => m.pageNum === currentPage);
        if (mod?.isDeleted) {
          // Find next available page
          const available = pageModifications.find(m => !m.isDeleted);
          if (available) {
            setCurrentPage(available.pageNum);
          }
          return;
        }

        const page = await pdf.getPage(currentPage);
        
        // Setup scale & rotation
        const rotationDegrees = mod ? mod.rotation : 0;
        const baseViewport = page.getViewport({ scale: 1.0 });
        
        // Determine viewport matching target column width
        const workspaceWidth = workspaceContainerRef.current?.clientWidth || 700;
        const targetWidth = Math.min(workspaceWidth - 60, baseViewport.width * zoom * 1.3);
        const calculatedScale = (targetWidth / baseViewport.width) * zoom;
        
        const viewport = page.getViewport({ 
          scale: calculatedScale, 
          rotation: (baseViewport.rotation + rotationDegrees) % 360 
        });

        const canvas = pdfCanvasRef.current;
        if (canvas) {
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          
          const context = canvas.getContext('2d');
          if (context) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            const renderContext = {
              canvasContext: context,
              viewport: viewport
            };
            await page.render(renderContext).promise;

            // Re-sync size of drawing overlay canvas to match
            const drawCanvas = drawingCanvasRef.current;
            if (drawCanvas) {
              drawCanvas.width = viewport.width;
              drawCanvas.height = viewport.height;
              const drawCtx = drawCanvas.getContext('2d');
              if (drawCtx) {
                drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                // Draw existing drawing base64 if it exists for this page
                if (drawings[currentPage]) {
                  const img = new Image();
                  img.onload = () => {
                    drawCtx.drawImage(img, 0, 0);
                  };
                  img.src = drawings[currentPage];
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Failed to render page', err);
      }
    };

    renderPage();
  }, [currentPage, zoom, isLoading, pageModifications]);

  // Push state to Undo stack before performing an operation
  const pushToUndo = (stateToPush?: any) => {
    const currentState = {
      textAnnotations: [...textAnnotations],
      shapeAnnotations: [...shapeAnnotations],
      signatureAnnotations: [...signatureAnnotations],
      drawings: { ...drawings },
      pageModifications: JSON.parse(JSON.stringify(pageModifications))
    };
    setUndoStack(prev => [...prev, stateToPush || currentState]);
    setRedoStack([]); // Clear redo
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));

    // Save current state to Redo stack
    const currentState = {
      textAnnotations: [...textAnnotations],
      shapeAnnotations: [...shapeAnnotations],
      signatureAnnotations: [...signatureAnnotations],
      drawings: { ...drawings },
      pageModifications: JSON.parse(JSON.stringify(pageModifications))
    };
    setRedoStack(prev => [...prev, currentState]);

    // Restore previous state
    setTextAnnotations(previous.textAnnotations);
    setShapeAnnotations(previous.shapeAnnotations);
    setSignatureAnnotations(previous.signatureAnnotations);
    setDrawings(previous.drawings);
    setPageModifications(previous.pageModifications);
    setSelectedElement(null);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));

    // Save current state to Undo stack
    const currentState = {
      textAnnotations: [...textAnnotations],
      shapeAnnotations: [...shapeAnnotations],
      signatureAnnotations: [...signatureAnnotations],
      drawings: { ...drawings },
      pageModifications: JSON.parse(JSON.stringify(pageModifications))
    };
    setUndoStack(prev => [...prev, currentState]);

    // Restore next state
    setTextAnnotations(next.textAnnotations);
    setShapeAnnotations(next.shapeAnnotations);
    setSignatureAnnotations(next.signatureAnnotations);
    setDrawings(next.drawings);
    setPageModifications(next.pageModifications);
    setSelectedElement(null);
  };

  // Click on Page Workspace Container to Insert Text, Shapes, or Signatures
  const handleWorkspaceClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (activeTool === 'browse' || activeTool === 'draw') return;

    const overlay = drawingCanvasRef.current;
    if (!overlay) return;

    const rect = overlay.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    pushToUndo();

    if (activeTool === 'text') {
      const newText: TextAnnotation = {
        id: 'txt_' + Math.random().toString(36).substring(2, 9),
        pageNum: currentPage,
        text: 'Type text here...',
        x,
        y,
        fontSize,
        color: selectedColor
      };
      setTextAnnotations(prev => [...prev, newText]);
      setSelectedElement({ type: 'text', id: newText.id });
      setActiveTool('browse'); // Switch back to browse/select to allow direct editing
    } else if (activeTool === 'rect' || activeTool === 'circle') {
      const newShape: ShapeAnnotation = {
        id: 'shp_' + Math.random().toString(36).substring(2, 9),
        pageNum: currentPage,
        type: activeTool,
        x,
        y,
        w: 18,
        h: 12,
        color: selectedColor
      };
      setShapeAnnotations(prev => [...prev, newShape]);
      setSelectedElement({ type: 'shape', id: newShape.id });
      setActiveTool('browse');
    }
  };

  // Drawing Freehand Canvas Actions
  const getDrawingCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    // Support mouse or touch events
    if ('touches' in e) {
      if (e.touches.length === 0) return { x: 0, y: 0 };
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'draw') return;
    e.preventDefault();
    pushToUndo(); // Record state before brush stroke
    setIsDrawing(true);

    const coords = getDrawingCoords(e);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = selectedColor;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // Draw single dot
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const drawMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== 'draw') return;
    e.preventDefault();

    const coords = getDrawingCoords(e);
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Save drawings array state for this page as a dataURL
    const canvas = drawingCanvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setDrawings(prev => ({
        ...prev,
        [currentPage]: dataUrl
      }));
    }
  };

  // Delete element action
  const handleDeleteSelectedElement = () => {
    if (!selectedElement) return;
    pushToUndo();

    if (selectedElement.type === 'text') {
      setTextAnnotations(prev => prev.filter(t => t.id !== selectedElement.id));
    } else if (selectedElement.type === 'shape') {
      setShapeAnnotations(prev => prev.filter(s => s.id !== selectedElement.id));
    } else if (selectedElement.type === 'signature') {
      setSignatureAnnotations(prev => prev.filter(s => s.id !== selectedElement.id));
    }
    setSelectedElement(null);
  };

  // Text changes handler
  const handleUpdateText = (id: string, text: string) => {
    setTextAnnotations(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  };

  // Clear drawings overlay for active page
  const handleClearDrawing = () => {
    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      pushToUndo();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setDrawings(prev => {
        const next = { ...prev };
        delete next[currentPage];
        return next;
      });
    }
  };

  // Page Actions (Rotate, Duplicate, Delete)
  const handleRotatePage = () => {
    pushToUndo();
    setPageModifications(prev => prev.map(m => {
      if (m.pageNum === currentPage) {
        return { ...m, rotation: (m.rotation + 90) % 360 };
      }
      return m;
    }));
  };

  const handleDeletePage = () => {
    const activeMods = pageModifications.filter(m => !m.isDeleted);
    if (activeMods.length <= 1) {
      showToast('A document must have at least one page. Cannot delete the only remaining page.', 'error');
      return;
    }

    pushToUndo();
    setPageModifications(prev => prev.map(m => {
      if (m.pageNum === currentPage) {
        return { ...m, isDeleted: true };
      }
      return m;
    }));

    // Switch to another available page
    const nextAvail = activeMods.find(m => m.pageNum !== currentPage);
    if (nextAvail) {
      setCurrentPage(nextAvail.pageNum);
    }
  };

  const handleDuplicatePage = () => {
    pushToUndo();
    const currentMod = pageModifications.find(m => m.pageNum === currentPage);
    if (!currentMod) return;

    // Insert duplicated configuration right after the current page index
    const newModList = [...pageModifications];
    const newPageNum = pageModifications.length + 1;
    
    // In our modifications we can specify duplicatedPageSource
    newModList.push({
      pageNum: newPageNum,
      rotation: currentMod.rotation,
      isDeleted: false
    });

    // Also we duplicate drawings/annotations
    // Let's copy page drawings
    if (drawings[currentPage]) {
      setDrawings(prev => ({
        ...prev,
        [newPageNum]: drawings[currentPage]
      }));
    }

    // Copy text annotations
    const pageTexts = textAnnotations.filter(t => t.pageNum === currentPage);
    const duplicatedTexts = pageTexts.map(t => ({
      ...t,
      id: 'txt_' + Math.random().toString(36).substring(2, 9),
      pageNum: newPageNum
    }));
    setTextAnnotations(prev => [...prev, ...duplicatedTexts]);

    // Copy shapes
    const pageShapes = shapeAnnotations.filter(s => s.pageNum === currentPage);
    const duplicatedShapes = pageShapes.map(s => ({
      ...s,
      id: 'shp_' + Math.random().toString(36).substring(2, 9),
      pageNum: newPageNum
    }));
    setShapeAnnotations(prev => [...prev, ...duplicatedShapes]);

    // Copy signatures
    const pageSigs = signatureAnnotations.filter(s => s.pageNum === currentPage);
    const duplicatedSigs = pageSigs.map(s => ({
      ...s,
      id: 'sig_' + Math.random().toString(36).substring(2, 9),
      pageNum: newPageNum
    }));
    setSignatureAnnotations(prev => [...prev, ...duplicatedSigs]);

    setPageModifications(newModList);
    setCurrentPage(newPageNum); // Navigate to new duplicate page
  };

  // Signature drawing pad handlers
  const startSigDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawingSig(true);
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const rect = canvas?.getBoundingClientRect();
    if (ctx && rect) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const moveSigDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    const rect = canvas?.getBoundingClientRect();
    if (ctx && rect) {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  };

  const saveSigAndPlace = () => {
    pushToUndo();
    let dataUrl = '';

    if (sigType === 'draw') {
      const canvas = sigCanvasRef.current;
      if (!canvas) return;
      dataUrl = canvas.toDataURL('image/png');
    } else {
      // Draw Typed cursive signature onto an offscreen canvas
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 150;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0)'; // transparent
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Select cursive font
        ctx.font = 'bold 55px Caveat, cursive';
        ctx.fillStyle = '#1e3a8a'; // Deep blue signature
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sigTypedName || 'Eunice Louisiana', canvas.width / 2, canvas.height / 2);
        dataUrl = canvas.toDataURL('image/png');
      }
    }

    if (dataUrl) {
      const newSig: SignatureAnnotation = {
        id: 'sig_' + Math.random().toString(36).substring(2, 9),
        pageNum: currentPage,
        dataUrl,
        x: 40,
        y: 40,
        w: 24,
        h: 12
      };
      setSignatureAnnotations(prev => [...prev, newSig]);
      setSelectedElement({ type: 'signature', id: newSig.id });
    }

    // Reset sig elements
    setSigModalOpen(false);
    setSigTypedName('');
    const canvas = sigCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Compile and Export the final edited PDF document using pdf-lib
  const handleExportPDF = async () => {
    try {
      setIsLoading(true);
      const originalBytes = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(originalBytes);
      
      const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

      // We need to apply page modifications (deletions, rotation, duplicate adds)
      const pages = pdfDoc.getPages();
      
      // Setup a brand new target PDF Document to easily construct modified sequence
      const newPdf = await PDFDocument.create();

      for (let i = 0; i < pageModifications.length; i++) {
        const mod = pageModifications[i];
        if (mod.isDeleted) continue;

        // Determine source page index
        // If mod.pageNum corresponds to original pages we copy, otherwise duplicate original page pageNum mapping
        const originalPageIndex = mod.pageNum <= pages.length ? mod.pageNum - 1 : (currentPage <= pages.length ? currentPage - 1 : 0);
        
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [originalPageIndex]);
        const addedPage = newPdf.addPage(copiedPage);

        // Apply rotation
        addedPage.setRotation(degrees(mod.rotation));

        const width = addedPage.getWidth();
        const height = addedPage.getHeight();

        // Check if there are drawing base64 images for this pageNum (original or duplicated index)
        const pageDrawings = drawings[mod.pageNum] || (mod.pageNum > pages.length ? drawings[currentPage] : null);
        if (pageDrawings) {
          try {
            const pngImage = await newPdf.embedPng(pageDrawings);
            addedPage.drawImage(pngImage, {
              x: 0,
              y: 0,
              width: width,
              height: height
            });
          } catch (pngErr) {
            console.warn('Could not embed drawings PNG on page', mod.pageNum, pngErr);
          }
        }

        // Apply shapes on this page
        const shapes = shapeAnnotations.filter(s => s.pageNum === mod.pageNum || (mod.pageNum > pages.length && s.pageNum === currentPage));
        for (const shape of shapes) {
          const colorHex = COLORS.find(c => c.hex === shape.color) || COLORS[1]; // default red
          const [r, g, b] = colorHex.rgb;
          
          // PDF-lib coordinates start from bottom-left
          const pX = (shape.x / 100) * width;
          const pY = ((100 - shape.y - shape.h) / 100) * height;
          const pW = (shape.w / 100) * width;
          const pH = (shape.h / 100) * height;

          if (shape.type === 'rect') {
            addedPage.drawRectangle({
              x: pX,
              y: pY,
              width: pW,
              height: pH,
              borderColor: rgb(r, g, b),
              borderWidth: 2,
              color: rgb(r, g, b),
              opacity: 0.2 // translucent highlights
            });
          } else {
            addedPage.drawCircle({
              x: pX + pW / 2,
              y: pY + pH / 2,
              size: Math.min(pW, pH) / 2,
              borderColor: rgb(r, g, b),
              borderWidth: 2,
              color: rgb(r, g, b),
              opacity: 0.2
            });
          }
        }

        // Apply textboxes on this page
        const texts = textAnnotations.filter(t => t.pageNum === mod.pageNum || (mod.pageNum > pages.length && t.pageNum === currentPage));
        for (const annotation of texts) {
          const colorHex = COLORS.find(c => c.hex === annotation.color) || COLORS[0];
          const [r, g, b] = colorHex.rgb;
          
          const pX = (annotation.x / 100) * width;
          // Approximate height offset for baseline alignment
          const pY = ((100 - annotation.y) / 100) * height - annotation.fontSize;

          addedPage.drawText(annotation.text, {
            x: pX,
            y: pY,
            size: annotation.fontSize,
            font: helveticaFont,
            color: rgb(r, g, b)
          });
        }

        // Apply signatures on this page
        const sigs = signatureAnnotations.filter(s => s.pageNum === mod.pageNum || (mod.pageNum > pages.length && s.pageNum === currentPage));
        for (const sig of sigs) {
          try {
            const pngImage = await newPdf.embedPng(sig.dataUrl);
            const pX = (sig.x / 100) * width;
            const pY = ((100 - sig.y - sig.h) / 100) * height;
            const pW = (sig.w / 100) * width;
            const pH = (sig.h / 100) * height;

            addedPage.drawImage(pngImage, {
              x: pX,
              y: pY,
              width: pW,
              height: pH
            });
          } catch (sigErr) {
            console.warn('Could not render signature on page', mod.pageNum, sigErr);
          }
        }
      }

      const compiledBytes = await newPdf.save();
      const compiledBlob = new Blob([compiledBytes], { type: 'application/pdf' });
      onSave(compiledBlob, `${file.name.replace('.pdf', '')}_edited.pdf`);
    } catch (err) {
      console.error('Failed to compile edited PDF', err);
      showToast('Error building your edited PDF. Please check your page layouts and try again.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10rem)] bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl overflow-hidden text-left" id="pdf-editor-canvas-workspace">
      
      {/* 1. Left Thumbnails Navigation Bar */}
      <div className="w-full lg:w-48 bg-gray-50/50 dark:bg-gray-900/30 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-900 flex flex-col h-32 lg:h-full shrink-0 select-none">
        <div className="p-3 border-b border-gray-100 dark:border-gray-900 hidden lg:block">
          <span className="text-[10px] font-bold font-sans text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
            <FileText size={12} />
            Pages ({pageModifications.filter(m => !m.isDeleted).length})
          </span>
        </div>
        
        {/* Horizontal scroll for mobile/tablet, Vertical for desktop */}
        <div className="flex-1 flex lg:flex-col overflow-x-auto lg:overflow-x-hidden lg:overflow-y-auto p-3 gap-2.5 max-h-24 lg:max-h-none">
          {pageModifications.map((mod, idx) => {
            if (mod.isDeleted) return null;
            const isActive = currentPage === mod.pageNum;
            return (
              <button
                key={mod.pageNum}
                onClick={() => setCurrentPage(mod.pageNum)}
                className={`flex-col items-center justify-center p-2 rounded-xl border text-center transition-all shrink-0 w-20 lg:w-full ${
                  isActive 
                    ? 'bg-indigo-600/10 border-indigo-600/40 text-indigo-600 dark:text-indigo-400 font-bold' 
                    : 'bg-white dark:bg-gray-950 border-gray-100 dark:border-gray-900 text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                id={`pdf-thumbnail-btn-${mod.pageNum}`}
              >
                <div className="w-10 h-10 lg:w-16 lg:h-16 mx-auto mb-1 rounded bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-xs font-mono font-bold shadow-sm border border-gray-200/20">
                  Pg {idx + 1}
                </div>
                <span className="text-[10px] hidden lg:block">Original Pg {mod.pageNum}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Main Large Canvas Canvas View (Center Panel) */}
      <div className="flex-1 flex flex-col bg-gray-100/60 dark:bg-gray-950/20 overflow-hidden relative" ref={workspaceContainerRef}>
        
        {/* Interactive Workspace Top Action Tool Rail */}
        <div className="p-3 bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-900 flex flex-wrap items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 text-gray-600 dark:text-gray-300 transition-colors"
              title="Undo Action (Ctrl+Z)"
              id="pdf-editor-undo"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 disabled:opacity-30 text-gray-600 dark:text-gray-300 transition-colors"
              title="Redo Action"
              id="pdf-editor-redo"
            >
              <Redo2 size={16} />
            </button>
            <span className="text-gray-200 dark:text-gray-800 text-lg">|</span>
            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-colors"
              title="Zoom Out"
              id="pdf-editor-zoom-out"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono font-bold px-1.5 text-gray-500">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(prev => Math.min(2.0, prev + 0.1))}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-600 dark:text-gray-300 transition-colors"
              title="Zoom In"
              id="pdf-editor-zoom-in"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-500 hidden sm:inline">Page:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  const activePages = pageModifications.filter(m => !m.isDeleted).map(m => m.pageNum);
                  const currentIndex = activePages.indexOf(currentPage);
                  if (currentIndex > 0) {
                    setCurrentPage(activePages[currentIndex - 1]);
                  }
                }}
                className="p-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500"
                id="pdf-editor-prev-page"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-mono font-bold px-2 text-gray-700 dark:text-gray-300">
                {pageModifications.filter(m => !m.isDeleted).map(m => m.pageNum).indexOf(currentPage) + 1} / {pageModifications.filter(m => !m.isDeleted).length}
              </span>
              <button
                onClick={() => {
                  const activePages = pageModifications.filter(m => !m.isDeleted).map(m => m.pageNum);
                  const currentIndex = activePages.indexOf(currentPage);
                  if (currentIndex < activePages.length - 1) {
                    setCurrentPage(activePages[currentIndex + 1]);
                  }
                }}
                className="p-1.5 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500"
                id="pdf-editor-next-page"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportPDF}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
              id="pdf-editor-save-pdf"
            >
              <Download size={14} />
              Save & Compile
            </button>
            <button
              onClick={onClose}
              className="p-2 border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 rounded-xl text-xs font-bold text-gray-500"
              id="pdf-editor-cancel"
            >
              Exit
            </button>
          </div>
        </div>

        {/* Workspace Drawing Area with Layers */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center relative select-none">
          {isLoading ? (
            <div className="space-y-3 text-center">
              <Plus className="animate-spin text-indigo-600 mx-auto" size={32} />
              <p className="text-xs text-gray-400">Loading document canvas workspace...</p>
            </div>
          ) : (
            <div 
              onClick={handleWorkspaceClick}
              className="relative shadow-xl rounded-lg border border-gray-200/20 bg-white dark:bg-gray-950 overflow-hidden"
              style={{
                cursor: activeTool === 'browse' ? 'default' : activeTool === 'draw' ? 'crosshair' : 'cell'
              }}
            >
              {/* Layer 1: PDF Background Page Canvas */}
              <canvas ref={pdfCanvasRef} className="block select-none" />

              {/* Layer 2: Freehand Drawings Overlay Canvas */}
              <canvas
                ref={drawingCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={drawMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={drawMove}
                onTouchEnd={stopDrawing}
                className="absolute inset-0 pointer-events-auto select-none"
                style={{
                  pointerEvents: activeTool === 'draw' ? 'auto' : 'none'
                }}
              />

              {/* Layer 3: Dynamic Absolute Elements Overlay (Texts, Shapes, Sigs) */}
              <div 
                className="absolute inset-0 pointer-events-none select-none"
                style={{
                  pointerEvents: activeTool === 'browse' ? 'auto' : 'none'
                }}
              >
                {/* Render Text Annotations */}
                {textAnnotations
                  .filter(t => t.pageNum === currentPage)
                  .map(txt => {
                    const isSelected = selectedElement?.type === 'text' && selectedElement.id === txt.id;
                    return (
                      <div
                        key={txt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'text', id: txt.id });
                        }}
                        className={`absolute p-1 rounded border pointer-events-auto cursor-pointer flex items-center gap-1.5 select-all ${
                          isSelected 
                            ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20' 
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        style={{
                          left: `${txt.x}%`,
                          top: `${txt.y}%`,
                          fontSize: `${txt.fontSize * zoom}px`,
                          color: txt.color,
                        }}
                      >
                        {isSelected ? (
                          <input
                            type="text"
                            value={txt.text}
                            onChange={(e) => handleUpdateText(txt.id, e.target.value)}
                            onBlur={() => setSelectedElement(null)}
                            autoFocus
                            className="bg-transparent border-none outline-none focus:ring-0 p-0 m-0 w-44 font-sans text-gray-900 dark:text-white"
                          />
                        ) : (
                          <span>{txt.text}</span>
                        )}
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSelectedElement();
                            }}
                            className="p-0.5 rounded bg-red-50 hover:bg-red-100 text-red-600 pointer-events-auto"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                {/* Render Shape Annotations */}
                {shapeAnnotations
                  .filter(s => s.pageNum === currentPage)
                  .map(shape => {
                    const isSelected = selectedElement?.type === 'shape' && selectedElement.id === shape.id;
                    return (
                      <div
                        key={shape.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'shape', id: shape.id });
                        }}
                        className={`absolute pointer-events-auto cursor-pointer group select-none flex items-center justify-center ${
                          isSelected 
                            ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50/10' 
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        style={{
                          left: `${shape.x}%`,
                          top: `${shape.y}%`,
                          width: `${shape.w}%`,
                          height: `${shape.h}%`,
                          borderColor: shape.color,
                          borderWidth: '2px',
                          borderRadius: shape.type === 'circle' ? '9999px' : '6px',
                        }}
                      >
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSelectedElement();
                            }}
                            className="absolute -top-3.5 -right-3.5 p-0.5 rounded-full bg-red-100 text-red-600 pointer-events-auto shadow"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                {/* Render Signature Annotations */}
                {signatureAnnotations
                  .filter(s => s.pageNum === currentPage)
                  .map(sig => {
                    const isSelected = selectedElement?.type === 'signature' && selectedElement.id === sig.id;
                    return (
                      <div
                        key={sig.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedElement({ type: 'signature', id: sig.id });
                        }}
                        className={`absolute pointer-events-auto cursor-pointer select-none p-1 flex items-center justify-center ${
                          isSelected 
                            ? 'ring-2 ring-indigo-500 ring-offset-1 bg-indigo-50/10' 
                            : 'hover:ring-1 hover:ring-gray-300'
                        }`}
                        style={{
                          left: `${sig.x}%`,
                          top: `${sig.y}%`,
                          width: `${sig.w}%`,
                          height: `${sig.h}%`,
                        }}
                      >
                        <img 
                          src={sig.dataUrl} 
                          alt="Signature element" 
                          className="w-full h-full object-contain pointer-events-none select-none" 
                        />
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSelectedElement();
                            }}
                            className="absolute -top-3.5 -right-3.5 p-0.5 rounded-full bg-red-100 text-red-600 pointer-events-auto shadow"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Right Sidebar Control Properties Panel */}
      <div className="w-full lg:w-72 bg-gray-50/50 dark:bg-gray-900/30 border-t lg:border-t-0 lg:border-l border-gray-100 dark:border-gray-900 p-5 flex flex-col justify-between overflow-y-auto select-none">
        <div className="space-y-6">
          
          {/* Tool mode selector */}
          <div className="space-y-2">
            <span className="text-[10px] font-bold font-sans text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Select Tool Mode</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setActiveTool('browse'); setSelectedElement(null); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTool === 'browse'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
                id="tool-mode-browse"
              >
                <MousePointer size={14} />
                Browse/Select
              </button>
              <button
                onClick={() => { setActiveTool('draw'); setSelectedElement(null); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTool === 'draw'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
                id="tool-mode-draw"
              >
                <Pencil size={14} />
                Freehand Draw
              </button>
              <button
                onClick={() => { setActiveTool('text'); setSelectedElement(null); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTool === 'text'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
                id="tool-mode-text"
              >
                <Type size={14} />
                Text Annotate
              </button>
              <button
                onClick={() => setSigModalOpen(true)}
                className="py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50"
                id="tool-mode-signature"
              >
                <ImageIcon size={14} />
                Add Signature
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                onClick={() => { setActiveTool('rect'); setSelectedElement(null); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTool === 'rect'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
                id="tool-mode-rect"
              >
                <Square size={14} />
                Rectangle Shape
              </button>
              <button
                onClick={() => { setActiveTool('circle'); setSelectedElement(null); }}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                  activeTool === 'circle'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50'
                }`}
                id="tool-mode-circle"
              >
                <Circle size={14} />
                Circle Shape
              </button>
            </div>
          </div>

          {/* Properties editor section */}
          <div className="space-y-3.5 pt-4 border-t border-gray-100 dark:border-gray-900">
            <span className="text-[10px] font-bold font-sans text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Styling & Properties</span>
            
            {/* Color palette */}
            <div className="space-y-1.5">
              <label className="text-[11px] text-gray-500 flex items-center gap-1">
                <Palette size={12} /> Color Tone:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COLORS.map(c => (
                  <button
                    key={c.hex}
                    onClick={() => {
                      setSelectedColor(c.hex);
                      // Update color of currently active selected element if any
                      if (selectedElement) {
                        pushToUndo();
                        if (selectedElement.type === 'text') {
                          setTextAnnotations(prev => prev.map(t => t.id === selectedElement.id ? { ...t, color: c.hex } : t));
                        } else if (selectedElement.type === 'shape') {
                          setShapeAnnotations(prev => prev.map(s => s.id === selectedElement.id ? { ...s, color: c.hex } : s));
                        }
                      }
                    }}
                    className={`w-7 h-7 rounded-full border transition-all flex items-center justify-center ${
                      selectedColor === c.hex ? 'scale-110 border-indigo-600' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                  >
                    {selectedColor === c.hex && <Check size={12} className="text-white mix-blend-difference" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Brush sizes */}
            {activeTool === 'draw' && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Brush Stroke Width:</span>
                  <span className="font-mono font-bold">{brushSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="12"
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-600"
                />
                <button
                  onClick={handleClearDrawing}
                  className="w-full py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg text-[11px] transition-colors flex items-center justify-center gap-1 mt-2"
                >
                  <Eraser size={12} />
                  Clear Drawing Ink
                </button>
              </div>
            )}

            {/* Font sizes */}
            {activeTool === 'text' && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-[11px] text-gray-500">
                  <span>Default Text Size:</span>
                  <span className="font-mono font-bold">{fontSize}pt</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="48"
                  value={fontSize}
                  onChange={(e) => {
                    setFontSize(Number(e.target.value));
                    if (selectedElement && selectedElement.type === 'text') {
                      pushToUndo();
                      setTextAnnotations(prev => prev.map(t => t.id === selectedElement.id ? { ...t, fontSize: Number(e.target.value) } : t));
                    }
                  }}
                  className="w-full h-1 bg-gray-200 dark:bg-gray-800 rounded appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}
          </div>

          {/* Page modifications controls */}
          <div className="space-y-2 pt-4 border-t border-gray-100 dark:border-gray-900">
            <span className="text-[10px] font-bold font-sans text-gray-400 dark:text-gray-500 uppercase tracking-widest block">Active Page Controls</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleRotatePage}
                className="w-full py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                id="pdf-editor-rotate-btn"
              >
                <RotateCw size={12} />
                Rotate 90° Clockwise
              </button>
              <button
                onClick={handleDuplicatePage}
                className="w-full py-2 bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-900 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
                id="pdf-editor-duplicate-btn"
              >
                <Copy size={12} />
                Duplicate Current Page
              </button>
              <button
                onClick={handleDeletePage}
                className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                id="pdf-editor-delete-btn"
              >
                <Trash2 size={12} />
                Delete Current Page
              </button>
            </div>
          </div>
        </div>

        {/* Informative instruction block */}
        <div className="p-3 bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/35 rounded-2xl text-[11px] text-indigo-700 dark:text-indigo-400 mt-6 space-y-1">
          <p className="font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} className="shrink-0" />
            Workspace Instructions
          </p>
          {activeTool === 'browse' ? (
            <p>Click on textboxes, shapes, or signature elements to update text strings, resize options, or delete from layout.</p>
          ) : activeTool === 'draw' ? (
            <p>Left-click and hold your mouse or drag your touch finger directly over the document to sketch, write freehand notes, or doodle.</p>
          ) : (
            <p>Click anywhere on the PDF page viewport to drop your configured label element or rectangle/circle layout.</p>
          )}
        </div>
      </div>

      {/* 4. Signature Draw/Type Creator Modal */}
      {sigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 backdrop-blur-xs select-none p-4">
          <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-2xl max-w-md w-full overflow-hidden text-left animate-fade-in">
            <div className="p-5 border-b border-gray-100 dark:border-gray-900 flex items-center justify-between">
              <h3 className="font-sans font-extrabold text-lg text-gray-900 dark:text-white">Create Electronic Signature</h3>
              <button 
                onClick={() => setSigModalOpen(false)}
                className="p-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 text-gray-400"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Type vs Draw tab bar */}
              <div className="flex bg-gray-100 dark:bg-gray-900 p-0.5 rounded-lg">
                <button
                  onClick={() => setSigType('draw')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    sigType === 'draw' 
                      ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Draw Signature
                </button>
                <button
                  onClick={() => setSigType('type')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    sigType === 'type' 
                      ? 'bg-white dark:bg-gray-800 text-gray-950 dark:text-white shadow-xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Type Styled Cursive
                </button>
              </div>

              {sigType === 'draw' ? (
                <div className="space-y-2">
                  <label className="text-[11px] text-gray-400 font-bold tracking-wider block uppercase">Draw signature inside box</label>
                  <canvas
                    ref={sigCanvasRef}
                    onMouseDown={startSigDraw}
                    onMouseMove={moveSigDraw}
                    onMouseUp={() => setIsDrawingSig(false)}
                    onMouseLeave={() => setIsDrawingSig(false)}
                    className="w-full h-36 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 cursor-crosshair block"
                  />
                  <button
                    onClick={() => {
                      const canvas = sigCanvasRef.current;
                      const ctx = canvas?.getContext('2d');
                      if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }}
                    className="text-xs text-red-600 hover:underline font-semibold block text-right w-full"
                  >
                    Clear Drawing Canvas
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="text-[11px] text-gray-400 font-bold tracking-wider block uppercase mb-1">Your Full Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Alex Rivera"
                      value={sigTypedName}
                      onChange={(e) => setSigTypedName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-gray-800 bg-transparent text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>

                  {/* Cursive Signature live preview */}
                  <div className="p-5 bg-gray-50 dark:bg-gray-900/60 rounded-2xl text-center select-none border border-gray-100 dark:border-gray-900/50">
                    <span className="text-gray-400 text-[10px] block mb-1">Cursive Preview:</span>
                    <span className={`text-4xl text-indigo-800 dark:text-indigo-400 font-cursive block py-4 ${sigTypedFont}`}>
                      {sigTypedName || 'Your Signature'}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-900/20 flex gap-3">
              <button
                onClick={saveSigAndPlace}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-colors"
                id="sig-modal-place"
              >
                Place Signature On Document
              </button>
              <button
                onClick={() => setSigModalOpen(false)}
                className="px-4 py-2.5 bg-white dark:bg-gray-950 hover:bg-gray-50 border border-gray-200 dark:border-gray-900 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

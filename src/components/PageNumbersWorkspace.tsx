import React, { useState, useEffect, useRef } from 'react';
import { 
  Binary, ArrowLeft, Loader2, Download, Settings, Sliders, Layout, Eye
} from 'lucide-react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PageNumbersWorkspaceProps {
  file: File;
  onClose: () => void;
  onSave: (editedBlob: Blob, filename: string) => void;
  loadPdfJS: () => Promise<any>;
}

export default function PageNumbersWorkspace({
  file,
  onClose,
  onSave,
  loadPdfJS
}: PageNumbersWorkspaceProps) {
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);

  // Form States
  const [position, setPosition] = useState<string>('bottom-center');
  const [format, setFormat] = useState<string>('page_of_n');
  const [startFrom, setStartFrom] = useState<number>(1);
  const [fontSize, setFontSize] = useState<number>(12);
  const [color, setColor] = useState<string>('#000000');
  const [skipPages, setSkipPages] = useState<string>('');

  const pdfDocRef = useRef<any>(null); // PDF.js document instance
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Load PDF on mount
  useEffect(() => {
    let active = true;
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
        
        if (!active) return;
        pdfDocRef.current = pdf;
        setTotalPages(pdf.numPages);

        // Render page 1 for preview
        try {
          const page = await pdf.getPage(1);
          const viewport = page.getViewport({ scale: 0.6 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            await page.render({
              canvasContext: ctx,
              viewport: viewport
            }).promise;
            if (active) {
              setPreviewUrl(canvas.toDataURL('image/jpeg', 0.85));
            }
          }
        } catch (err) {
          console.error('Failed to render page 1 preview', err);
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load PDF in PageNumbersWorkspace', err);
        setIsLoading(false);
      }
    };

    loadPdf();
    return () => {
      active = false;
    };
  }, [file, loadPdfJS]);

  // Helper function to hexToRgb
  const hexToRgb = (hex: string): [number, number, number] => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Generate label for live preview
  const getPreviewLabel = () => {
    const pageNum = startFrom;
    switch (format) {
      case 'plain':       return `${pageNum}`;
      case 'page':        return `Page ${pageNum}`;
      case 'page_of_n':   return `Page ${pageNum} of ${totalPages + startFrom - 1}`;
      case 'dash':        return `- ${pageNum} -`;
      default:            return `${pageNum}`;
    }
  };

  // Convert position value to Tailwind overlay classes
  const getPositionClasses = () => {
    switch (position) {
      case 'bottom-center': return 'bottom-4 left-1/2 -translate-x-1/2 text-center';
      case 'bottom-left':   return 'bottom-4 left-4 text-left';
      case 'bottom-right':  return 'bottom-4 right-4 text-right';
      case 'top-center':    return 'top-4 left-1/2 -translate-x-1/2 text-center';
      case 'top-left':      return 'top-4 left-4 text-left';
      case 'top-right':     return 'top-4 right-4 text-right';
      default:              return 'bottom-4 left-1/2 -translate-x-1/2 text-center';
    }
  };

  const handleApplyPageNumbers = async () => {
    try {
      setIsProcessing(true);
      setProgress(15);

      const arrayBuffer = await file.arrayBuffer();
      setProgress(40);

      const pdfDoc = await PDFDocument.load(arrayBuffer);
      setProgress(60);

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const pages = pdfDoc.getPages();
      
      // Parse skip list
      const skipSet = new Set<number>();
      if (skipPages.trim()) {
        skipPages.split(',').forEach(item => {
          const num = parseInt(item.trim(), 10);
          if (!isNaN(num)) {
            skipSet.add(num - 1);
          }
        });
      }

      const totalPdfPages = pages.length;

      pages.forEach((page, i) => {
        if (skipSet.has(i)) return;
        const { width, height } = page.getSize();
        const pageNum = i + startFrom;
        
        let label = '';
        switch (format) {
          case 'plain':       label = `${pageNum}`; break;
          case 'page':        label = `Page ${pageNum}`; break;
          case 'page_of_n':   label = `Page ${pageNum} of ${totalPdfPages + startFrom - 1}`; break;
          case 'dash':        label = `- ${pageNum} -`; break;
          default:            label = `${pageNum}`;
        }

        const textWidth = font.widthOfTextAtSize(label, fontSize);
        const margin = 28;
        let x = 0;
        let y = 0;

        switch (position) {
          case 'bottom-center': x = (width - textWidth) / 2; y = margin; break;
          case 'bottom-left':   x = margin; y = margin; break;
          case 'bottom-right':  x = width - textWidth - margin; y = margin; break;
          case 'top-center':    x = (width - textWidth) / 2; y = height - margin; break;
          case 'top-left':      x = margin; y = height - margin; break;
          case 'top-right':     x = width - textWidth - margin; y = height - margin; break;
          default:              x = (width - textWidth) / 2; y = margin;
        }

        const [r, g, b] = hexToRgb(color);
        page.drawText(label, {
          x,
          y,
          size: fontSize,
          font,
          color: rgb(r / 255, g / 255, b / 255)
        });
      });

      setProgress(85);
      const outputBytes = await pdfDoc.save();
      const finalBlob = new Blob([outputBytes], { type: 'application/pdf' });
      setProgress(100);

      setTimeout(() => {
        onSave(finalBlob, `${file.name.replace('.pdf', '')}_numbered.pdf`);
        setIsProcessing(false);
      }, 500);

    } catch (err) {
      console.error('Failed to add page numbers to PDF', err);
      setIsProcessing(false);
      alert('Failed to stamp page numbers. Please try again with a valid file.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] text-left">
      {/* Loading overlay */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px]">
          <Loader2 size={36} className="text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading document details...</p>
        </div>
      )}

      {/* Processing overlay */}
      {isProcessing && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] bg-white/95 dark:bg-gray-950/95 absolute inset-0 z-50">
          <div className="w-full max-w-md text-center space-y-4">
            <h3 className="font-sans font-extrabold text-xl text-gray-900 dark:text-white">Stamping Page Numbers</h3>
            <p className="text-sm text-gray-500">Please wait while professional page numbers are aligned and written to your document.</p>
            
            <div className="processing-steps">
              <div className={`proc-step ${progress > 30 ? 'proc-step--completed' : 'proc-step--active'}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Reading PDF Structure</span>
              </div>
              <div className={`proc-step ${progress > 80 ? 'proc-step--completed' : progress > 30 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Calculating Positions</span>
              </div>
              <div className={`proc-step ${progress === 100 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Writing File</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 font-mono">
              <span>PROGRESS</span>
              <span>{progress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      {!isLoading && !isProcessing && (
        <>
          {/* Main Visual Preview Area */}
          <div className="flex-1 p-6 md:p-8 space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-900 pb-4 mb-6">
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Add Page Numbers to PDF</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{file.name} • {totalPages} Pages</p>
                </div>
              </div>

              {/* Preview Container */}
              <div className="flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900/40 rounded-2xl p-6 min-h-[350px] border border-gray-100 dark:border-gray-900/60">
                <div className="text-center mb-4 flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                  <Eye size={13} className="text-indigo-500" />
                  Live Preview (Page 1)
                </div>

                <div className="relative bg-white dark:bg-gray-950 rounded-xl shadow-lg border border-gray-200/80 dark:border-gray-800 p-1 select-none max-w-xs aspect-[3/4] flex items-center justify-center">
                  {previewUrl ? (
                    <div className="relative w-full h-full overflow-hidden rounded-lg">
                      <img 
                        src={previewUrl} 
                        alt="Page 1 Preview" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain"
                      />
                      {/* CSS absolute overlay simulating page numbers placement */}
                      <div 
                        className={`absolute px-2 py-0.5 bg-yellow-100/80 dark:bg-indigo-950/90 text-yellow-800 dark:text-indigo-200 border border-yellow-300/60 dark:border-indigo-500/30 rounded font-medium shadow-sm transition-all pointer-events-none`}
                        style={{ 
                          fontSize: `${Math.max(8, Math.min(15, fontSize))}px`, 
                          color: color,
                          ...getPositionStyles(position)
                        }}
                      >
                        {getPreviewLabel()}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                      <Loader2 size={24} className="animate-spin text-gray-300 mb-2" />
                      <span className="text-xs">Generating preview...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Information Notice */}
            <div className="text-xs text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-900 pt-4">
              * The live preview simulates the relative position of page numbers. When you click <strong>Add Page Numbers</strong>, the values will be injected natively into your PDF file using vector fonts.
            </div>
          </div>

          {/* Configuration Panel Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/20 p-6 md:p-8 flex flex-col justify-between space-y-8 shrink-0">
            <div className="space-y-6">
              <div>
                <h4 className="font-sans font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Settings size={14} className="text-indigo-500" />
                  Stamping Options
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tailor the appearance and positioning of page numbers to fit your document style perfectly.
                </p>
              </div>

              {/* Position */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bottom-left">Bottom Left</option>
                  <option value="bottom-center">Bottom Center</option>
                  <option value="bottom-right">Bottom Right</option>
                  <option value="top-left">Top Left</option>
                  <option value="top-center">Top Center</option>
                  <option value="top-right">Top Right</option>
                </select>
              </div>

              {/* Format */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Format
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                  className="w-full px-4.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="plain">1, 2, 3...</option>
                  <option value="page">Page 1, Page 2...</option>
                  <option value="page_of_n">Page 1 of N</option>
                  <option value="dash">- 1 -, - 2 -</option>
                </select>
              </div>

              {/* Start From */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Start From
                </label>
                <input
                  type="number"
                  min="1"
                  value={startFrom}
                  onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Font Size
                  </label>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400">{fontSize}px</span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="20"
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Color */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-10 h-10 border border-gray-200 dark:border-gray-800 bg-transparent rounded-xl cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="#000000"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white font-semibold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Skip Pages */}
              <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-900">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Skip Pages
                </label>
                <input
                  type="text"
                  value={skipPages}
                  onChange={(e) => setSkipPages(e.target.value)}
                  placeholder="e.g. 1, 3"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-xs text-gray-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-gray-400 block leading-normal">
                  Comma-separated page numbers to exclude from stamping (like cover pages).
                </span>
              </div>
            </div>

            {/* Bottom Button Actions */}
            <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-900">
              <button
                onClick={handleApplyPageNumbers}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Binary size={15} />
                Add Page Numbers
              </button>
              <button
                onClick={onClose}
                className="w-full py-2.5 bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-500 dark:text-gray-400 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel / Reset
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper to calculate exact positioning inline styles for the absolute preview overlay
function getPositionStyles(position: string): React.CSSProperties {
  switch (position) {
    case 'bottom-center':
      return { bottom: '12px', left: '50%', transform: 'translateX(-50%)' };
    case 'bottom-left':
      return { bottom: '12px', left: '12px' };
    case 'bottom-right':
      return { bottom: '12px', right: '12px' };
    case 'top-center':
      return { top: '12px', left: '50%', transform: 'translateX(-50%)' };
    case 'top-left':
      return { top: '12px', left: '12px' };
    case 'top-right':
      return { top: '12px', right: '12px' };
    default:
      return { bottom: '12px', left: '50%', transform: 'translateX(-50%)' };
  }
}

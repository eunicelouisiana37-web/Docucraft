import React, { useState, useEffect, useRef } from 'react';
import { 
  RotateCw, RotateCcw, Trash2, Download, Check, X, ShieldAlert, FileText, ArrowLeft, Loader2
} from 'lucide-react';
import { PDFDocument, degrees } from 'pdf-lib';

interface PageItem {
  id: string; // Unique id to keep keys stable during dragging
  originalIndex: number; // 0-based index in the original document
  rotation: number; // 0, 90, 180, 270
}

interface RotateReorderWorkspaceProps {
  file: File;
  onClose: () => void;
  onSave: (editedBlob: Blob, filename: string) => void;
  loadPdfJS: () => Promise<any>;
}

export default function RotateReorderWorkspace({
  file,
  onClose,
  onSave,
  loadPdfJS
}: RotateReorderWorkspaceProps) {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveProgress, setSaveProgress] = useState<number>(0);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const pdfDocRef = useRef<any>(null); // PDF.js document instance
  const canvasCacheRef = useRef<Record<number, string>>({}); // originalIndex -> base64 data url cache

  // Load PDF on mount and initialize page list
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

        const initialPages: PageItem[] = [];
        for (let i = 0; i < pdf.numPages; i++) {
          initialPages.push({
            id: `page-${i}-${Math.random().toString(36).substr(2, 9)}`,
            originalIndex: i,
            rotation: 0
          });
        }
        setPages(initialPages);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load PDF in RotateReorderWorkspace', err);
        setIsLoading(false);
      }
    };

    loadPdf();
    return () => {
      active = false;
    };
  }, [file, loadPdfJS]);

  // Handle Multi-Selection Click (not on checkbox/buttons)
  const handlePageClick = (id: string, e: React.MouseEvent) => {
    // Avoid triggered if clicked on checkbox input or sub-elements that handle their own clicks
    const target = e.target as HTMLElement;
    if (target.closest('.checkbox-container') || target.closest('button') || target.closest('input')) {
      return;
    }

    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Rotation logic
  const rotateSelected = (direction: 'CW' | 'CCW') => {
    const activeSet = selectedIds.size > 0 ? selectedIds : new Set(pages.map(p => p.id));
    
    setPages(prev => prev.map(page => {
      if (activeSet.has(page.id)) {
        let currentRotation = page.rotation;
        if (direction === 'CW') {
          currentRotation = (currentRotation + 90) % 360;
        } else {
          currentRotation = (currentRotation - 90 + 360) % 360;
        }
        return { ...page, rotation: currentRotation };
      }
      return page;
    }));
  };

  const rotateAll = (direction: 'CW' | 'CCW') => {
    setPages(prev => prev.map(page => {
      let currentRotation = page.rotation;
      if (direction === 'CW') {
        currentRotation = (currentRotation + 90) % 360;
      } else {
        currentRotation = (currentRotation - 90 + 360) % 360;
      }
      return { ...page, rotation: currentRotation };
    }));
  };

  // Delete page logic
  const deleteSelected = () => {
    if (selectedIds.size === 0) return;
    
    const remainingCount = pages.length - selectedIds.size;
    if (remainingCount < 1) {
      alert('You must keep at least 1 page in the PDF.');
      return;
    }

    if (remainingCount === 1) {
      if (!confirm('Only 1 page will remain. Are you sure you want to delete these pages?')) {
        return;
      }
    }

    setPages(prev => prev.filter(page => !selectedIds.has(page.id)));
    setSelectedIds(new Set());
  };

  // Drag and Drop implementation
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Make transparent image effect or standard drag start
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === index) {
      setDragOverIndex(null);
      return;
    }
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updatedPages = [...pages];
    const [draggedItem] = updatedPages.splice(draggedIndex, 1);
    updatedPages.splice(index, 0, draggedItem);
    
    setPages(updatedPages);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Save / Compile edited PDF
  const handleDownload = async () => {
    try {
      setIsSaving(true);
      setSaveProgress(15);
      
      // Step 1: Uploading / Reading original bytes
      const originalBytes = await file.arrayBuffer();
      setSaveProgress(40);

      // Step 2: Processing using pdf-lib
      const pdfDoc = await PDFDocument.load(originalBytes);
      const newPdfDoc = await PDFDocument.create();
      setSaveProgress(60);

      // Copy and rotate pages
      for (let i = 0; i < pages.length; i++) {
        const item = pages[i];
        // Copy the specific page from the loaded pdf
        const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [item.originalIndex]);
        if (item.rotation !== 0) {
          copiedPage.setRotation(degrees(item.rotation));
        }
        newPdfDoc.addPage(copiedPage);
        
        // Progress update
        const currentProg = 60 + Math.floor((i / pages.length) * 30);
        setSaveProgress(currentProg);
      }

      setSaveProgress(95);
      const outputBytes = await newPdfDoc.save();
      const finalBlob = new Blob([outputBytes], { type: 'application/pdf' });
      
      setSaveProgress(100);
      setTimeout(() => {
        onSave(finalBlob, `${file.name.replace('.pdf', '')}_reordered.pdf`);
        setIsSaving(false);
      }, 500);

    } catch (err) {
      console.error('Failed to create new PDF', err);
      setIsSaving(false);
      alert('Failed to process and compile the PDF file.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-950 rounded-3xl border border-gray-100 dark:border-gray-900 shadow-xl overflow-hidden flex flex-col md:flex-row min-h-[600px] text-left">
      {/* Loading overlay */}
      {isLoading && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px]">
          <Loader2 size={36} className="text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Loading document pages...</p>
        </div>
      )}

      {/* Saving steps overlay */}
      {isSaving && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px] bg-white/95 dark:bg-gray-950/95 absolute inset-0 z-50">
          <div className="w-full max-w-md text-center space-y-4">
            <h3 className="font-sans font-extrabold text-xl text-gray-900 dark:text-white">Compiling PDF</h3>
            <p className="text-sm text-gray-500">Please wait while your pages are rotated, reordered, and compiled into a secure local file.</p>
            
            <div className="processing-steps">
              <div className={`proc-step ${saveProgress > 30 ? 'proc-step--completed' : 'proc-step--active'}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Reading Original PDF</span>
              </div>
              <div className={`proc-step ${saveProgress > 85 ? 'proc-step--completed' : saveProgress > 30 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Applying Order & Rotations</span>
              </div>
              <div className={`proc-step ${saveProgress === 100 ? 'proc-step--active' : ''}`}>
                <span className="proc-dot"></span>
                <span className="proc-label">Writing File</span>
              </div>
            </div>

            <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${saveProgress}%` }} />
            </div>
            <div className="flex justify-between items-center text-xs font-semibold text-gray-400 font-mono">
              <span>PROGRESS</span>
              <span>{saveProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Workspace view */}
      {!isLoading && !isSaving && (
        <>
          {/* Thumbnail Grid Main Area */}
          <div className="flex-1 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-900 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-all"
                >
                  <ArrowLeft size={16} />
                </button>
                <div>
                  <h3 className="text-lg font-extrabold text-gray-900 dark:text-white">Rotate & Reorder Pages</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{file.name} • {pages.length} Pages</p>
                </div>
              </div>
              
              <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-xl">
                {selectedIds.size > 0 ? `${selectedIds.size} Selected` : 'Select pages to modify'}
              </div>
            </div>

            {/* Thumbnail Grid */}
            <div 
              className="grid gap-6 justify-center"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))' }}
            >
              {pages.map((item, index) => {
                const isSelected = selectedIds.has(item.id);
                const isDraggingItem = draggedIndex === index;
                const isDropIndicator = dragOverIndex === index;

                return (
                  <div
                    key={item.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    onClick={(e) => handlePageClick(item.id, e)}
                    className={`relative flex flex-col bg-gray-50 dark:bg-gray-900 border-2 rounded-2xl p-3 cursor-grab transition-all duration-200 select-none group ${
                      isSelected 
                        ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' 
                        : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
                    } ${isDraggingItem ? 'opacity-40 cursor-grabbing bg-gray-100 dark:bg-gray-800' : ''} ${
                      isDropIndicator ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 scale-[1.02]' : ''
                    }`}
                  >
                    {/* Multi-Select Checkbox Top-Left */}
                    <label className="checkbox-container absolute top-2.5 left-2.5 z-10 p-1 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isSelected}
                        onChange={() => handleCheckboxChange(item.id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                    </label>

                    {/* Rotation Badge Top-Right */}
                    {item.rotation !== 0 && (
                      <span className="absolute top-2.5 right-2.5 z-10 px-1.5 py-0.5 bg-indigo-600 text-white text-[9px] font-mono font-bold rounded">
                        {item.rotation}°
                      </span>
                    )}

                    {/* Canvas / Image Thumbnail Area */}
                    <div className="aspect-[3/4] bg-white dark:bg-gray-950 rounded-xl overflow-hidden shadow-sm flex items-center justify-center relative border border-gray-100 dark:border-gray-900/60 p-2">
                      <PageRenderer 
                        pdfDoc={pdfDocRef.current}
                        originalIndex={item.originalIndex}
                        rotation={item.rotation}
                        cache={canvasCacheRef.current}
                      />
                    </div>

                    {/* Footer Stats / Reorder handle */}
                    <div className="mt-3 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
                      <span className="bg-gray-200/60 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 font-mono text-[10px] px-2 py-0.5 rounded-md">
                        Page {index + 1}
                      </span>
                      {item.originalIndex !== index && (
                        <span className="text-[9px] text-gray-400 font-mono">
                          (Orig: {item.originalIndex + 1})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Sidebar */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 dark:border-gray-900 bg-gray-50/50 dark:bg-gray-950/20 p-6 md:p-8 flex flex-col justify-between space-y-8 shrink-0 md:sticky md:top-0">
            <div className="space-y-6">
              <div>
                <h4 className="font-sans font-extrabold text-sm text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                  Edit Controls
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Select individual pages to rotate or delete them. Drag and drop any card to rearrange its sequence in the final output document.
                </p>
              </div>

              {/* Rotate Selected Controls */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                  Rotate Selected ({selectedIds.size > 0 ? `${selectedIds.size} selected` : 'all pages'})
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => rotateSelected('CCW')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm"
                  >
                    <RotateCcw size={14} />
                    90° CCW
                  </button>
                  <button
                    onClick={() => rotateSelected('CW')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm"
                  >
                    <RotateCw size={14} />
                    90° CW
                  </button>
                </div>
              </div>

              {/* Rotate All Controls */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest block">
                  Rotate All Pages
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => rotateAll('CCW')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm"
                  >
                    <RotateCcw size={14} />
                    All CCW
                  </button>
                  <button
                    onClick={() => rotateAll('CW')}
                    className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-all shadow-sm"
                  >
                    <RotateCw size={14} />
                    All CW
                  </button>
                </div>
              </div>

              {/* Delete Control */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100 dark:border-gray-900">
                <button
                  disabled={selectedIds.size === 0}
                  onClick={deleteSelected}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 dark:bg-red-950/25 dark:hover:bg-red-950/50 disabled:opacity-45 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold transition-all border border-red-100 dark:border-red-950"
                >
                  <Trash2 size={14} />
                  Delete Selected Page ({selectedIds.size})
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-3 pt-6 border-t border-gray-100 dark:border-gray-900">
              <button
                onClick={handleDownload}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
              >
                <Download size={16} />
                Download Reordered PDF
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

// Internal page rendering component that avoids heavy layout shifts & memoizes canvases
interface PageRendererProps {
  pdfDoc: any;
  originalIndex: number;
  rotation: number;
  cache: Record<number, string>;
}

function PageRenderer({ pdfDoc, originalIndex, rotation, cache }: PageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [renderedUrl, setRenderedUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    if (!pdfDoc) return;

    // Check Cache first
    if (cache[originalIndex]) {
      setRenderedUrl(cache[originalIndex]);
      return;
    }

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(originalIndex + 1);
        const viewport = page.getViewport({ scale: 0.3 }); // scaled down for thumbnail performance

        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport: viewport
        }).promise;

        if (!active) return;
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        cache[originalIndex] = dataUrl;
        setRenderedUrl(dataUrl);
      } catch (err) {
        console.error('Failed rendering page thumbnail', err);
      }
    };

    renderPage();
    return () => {
      active = false;
    };
  }, [pdfDoc, originalIndex, cache]);

  // Apply CSS rotation transform directly on the image/canvas element for instant snappy UI
  return (
    <div className="w-full h-full flex items-center justify-center overflow-hidden">
      {renderedUrl ? (
        <img 
          src={renderedUrl} 
          alt={`Page ${originalIndex + 1}`}
          referrerPolicy="no-referrer"
          className="max-w-full max-h-full object-contain shadow-sm rounded-lg transition-transform duration-200"
          style={{ transform: `rotate(${rotation}deg)` }}
        />
      ) : (
        <div className="animate-pulse flex flex-col items-center gap-1">
          <Loader2 size={16} className="text-gray-400 animate-spin" />
          <span className="text-[9px] text-gray-400 font-mono">RENDERING</span>
        </div>
      )}
    </div>
  );
}

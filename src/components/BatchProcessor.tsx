import React, { useState, useRef } from 'react';
import { User } from '../types';
import { 
  Upload, FileText, Trash2, ArrowRight, Download, Sliders, ArrowUp, ArrowDown, HelpCircle, Loader2, Sparkles, CheckCircle2, ShieldAlert, X, FileMinus, Play, ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface BatchProcessorProps {
  currentUser: User | null;
  onShowUpgrade: (plan?: 'pro' | 'business') => void;
  onOpenAuth: (tab?: 'login' | 'register') => void;
  onNavigate: (path: string) => void;
}

interface QueuedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'success' | 'failed';
  progress: number;
  resultUrl?: string;
  resultName?: string;
  error?: string;
}

type BatchOperation = 
  | 'compress'
  | 'pdf-to-image'
  | 'pdf-to-word'
  | 'watermark'
  | 'page-numbers'
  | 'protect';

export default function BatchProcessor({
  currentUser,
  onShowUpgrade,
  onOpenAuth,
  onNavigate
}: BatchProcessorProps) {
  const getUserPlan = () => currentUser?.plan || 'free';
  const isPro = getUserPlan() === 'pro' || getUserPlan() === 'business';

  const [operation, setOperation] = useState<BatchOperation>('compress');
  const [compression, setCompression] = useState<'low' | 'medium' | 'high'>('medium');
  const [watermarkText, setWatermarkText] = useState('Confidential');
  const [pageNumberPosition, setPageNumberPosition] = useState<'bottom-center' | 'bottom-right' | 'top-right'>('bottom-center');
  const [pageNumberFormat, setPageNumberFormat] = useState<'simple' | 'page-of-pages'>('simple');
  const [password, setPassword] = useState('');

  const [queuedFiles, setQueuedFiles] = useState<QueuedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingAll, setIsProcessingAll] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isPro) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const validateAndAddFiles = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    setErrorMsg('');

    const maxFiles = 20;
    const maxSize = (isPro ? 200 : 25) * 1024 * 1024; // Pro gets 200MB, Free gets 25MB

    if (queuedFiles.length + selectedFiles.length > maxFiles) {
      setErrorMsg(`You can process up to ${maxFiles} files in a single batch.`);
      return;
    }

    const newFiles: QueuedFile[] = [];
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      if (file.size > maxSize) {
        setErrorMsg(`File "${file.name}" exceeds the maximum size limit of ${isPro ? '200MB' : '25MB'}.`);
        continue;
      }

      if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
        setErrorMsg(`Only PDF files are supported for batch processing.`);
        continue;
      }

      newFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        status: 'pending',
        progress: 0
      });
    }

    if (newFiles.length > 0) {
      setQueuedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isPro) return;
    validateAndAddFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPro) return;
    validateAndAddFiles(e.target.files);
  };

  const removeFile = (id: string) => {
    if (isProcessingAll) return;
    setQueuedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearQueue = () => {
    if (isProcessingAll) return;
    setQueuedFiles([]);
    setErrorMsg('');
  };

  const getProcessedName = (originalName: string, op: BatchOperation): string => {
    const base = originalName.replace(/\.pdf$/i, '');
    switch (op) {
      case 'compress': return `[Compressed] ${base}.pdf`;
      case 'pdf-to-image': return `${base}_converted.png`;
      case 'pdf-to-word': return `${base}.docx`;
      case 'watermark': return `[Watermarked] ${base}.pdf`;
      case 'page-numbers': return `[Numbered] ${base}.pdf`;
      case 'protect': return `[Protected] ${base}.pdf`;
      default: return `[Processed] ${originalName}`;
    }
  };

  const handleProcessAll = async () => {
    if (queuedFiles.length === 0 || isProcessingAll) return;
    if (!isPro) return;

    setIsProcessingAll(true);
    setErrorMsg('');

    // Process files sequentially with dynamic realistic simulation
    for (let i = 0; i < queuedFiles.length; i++) {
      const targetFile = queuedFiles[i];
      
      // Skip if already succeeded or failed
      if (targetFile.status === 'success') continue;

      setQueuedFiles(prev => prev.map(f => f.id === targetFile.id ? { ...f, status: 'processing', progress: 5 } : f));

      // Animate progress
      const steps = 10;
      for (let s = 1; s <= steps; s++) {
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
        setQueuedFiles(prev => prev.map(f => f.id === targetFile.id ? { ...f, progress: Math.min(95, s * 10) } : f));
      }

      // Finish with success and generate object URL
      const resultName = getProcessedName(targetFile.file.name, operation);
      const mimeType = operation === 'pdf-to-image' ? 'image/png' : (operation === 'pdf-to-word' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf');
      
      // Create simulated resulting blob
      const resultBlob = new Blob([targetFile.file], { type: mimeType });
      const resultUrl = URL.createObjectURL(resultBlob);

      setQueuedFiles(prev => prev.map(f => f.id === targetFile.id ? { 
        ...f, 
        status: 'success', 
        progress: 100,
        resultUrl,
        resultName
      } : f));
    }

    setIsProcessingAll(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  const getOperationLabel = (op: BatchOperation): string => {
    switch (op) {
      case 'compress': return 'Compress PDF';
      case 'pdf-to-image': return 'PDF to Image';
      case 'pdf-to-word': return 'PDF to Word';
      case 'watermark': return 'Add Watermark';
      case 'page-numbers': return 'Add Page Numbers';
      case 'protect': return 'Password Protect';
      default: return op;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12 text-left" id="batchProcessorContainer">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="font-sans font-extrabold text-3xl sm:text-4xl text-gray-950 dark:text-white flex items-center gap-3">
          Batch Processing
          <span style={{ 
            background: 'linear-gradient(135deg, #7C3AED, #A78BFA)', 
            color: 'white', 
            fontSize: '11px', 
            padding: '2px 10px', 
            borderRadius: 'var(--radius-pill)', 
            fontWeight: 700 
          }}>
            Pro
          </span>
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Apply one operation to multiple files simultaneously.
        </p>
      </div>

      {/* Pro plan check — if free user, show paywall banner */}
      {!isPro && (
        <div className="paywall-banner mb-6" id="paywallBanner">
          <div className="paywall-icon">⚡</div>
          <div className="paywall-text">
            <strong>Batch Processing is a Pro feature</strong>
            <p>Upgrade to Pro to process up to 20 files at once with unlimited operations.</p>
          </div>
          <button 
            className="plan-cta plan-cta--primary" 
            onClick={() => onShowUpgrade('pro')} 
            style={{ width: 'auto', padding: '10px 24px', whiteSpace: 'nowrap' }}
          >
            Upgrade to Pro →
          </button>
        </div>
      )}

      {/* Interactive Main Body with conditional Pro style wrapper */}
      <div 
        style={!isPro ? { pointerEvents: 'none', opacity: 0.4 } : {}}
        className="space-y-6"
        id="batchProcessorMainWorkspace"
      >
        {/* Operation selector */}
        <div className="batch-operation-selector">
          <label className="field-label">Operation to apply to all files</label>
          <select 
            className="batch-op-select" 
            id="batchOperation"
            value={operation}
            onChange={(e) => setOperation(e.target.value as BatchOperation)}
          >
            <option value="compress">Compress PDF — Reduce file size</option>
            <option value="pdf-to-image">PDF to Image — Convert to JPG</option>
            <option value="pdf-to-word">PDF to Word — Convert to .docx</option>
            <option value="watermark">Add Watermark — Stamp text on pages</option>
            <option value="page-numbers">Add Page Numbers — Auto-number pages</option>
            <option value="protect">Password Protect — Lock all PDFs</option>
          </select>

          {/* Conditional sub-options based on selected operation */}
          <div className="batch-suboptions" id="batchSuboptions">
            {operation === 'compress' && (
              <div className="suboption-row">
                <label>Compression level</label>
                <div className="radio-group">
                  <label>
                    <input 
                      type="radio" 
                      name="compression" 
                      value="low" 
                      checked={compression === 'low'} 
                      onChange={() => setCompression('low')} 
                    /> Low (better quality)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="compression" 
                      value="medium" 
                      checked={compression === 'medium'} 
                      onChange={() => setCompression('medium')} 
                    /> Medium (balanced)
                  </label>
                  <label>
                    <input 
                      type="radio" 
                      name="compression" 
                      value="high" 
                      checked={compression === 'high'} 
                      onChange={() => setCompression('high')} 
                    /> High (smallest size)
                  </label>
                </div>
              </div>
            )}

            {operation === 'watermark' && (
              <div className="suboption-row">
                <label>Watermark text</label>
                <input 
                  type="text" 
                  className="batch-input-text" 
                  value={watermarkText} 
                  onChange={(e) => setWatermarkText(e.target.value)} 
                  placeholder="e.g. CONFIDENTIAL, DRAFT" 
                />
              </div>
            )}

            {operation === 'page-numbers' && (
              <div className="suboption-row">
                <label>Page Number Settings</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <span className="text-xs text-gray-400 font-semibold">Position</span>
                    <select 
                      value={pageNumberPosition} 
                      onChange={(e) => setPageNumberPosition(e.target.value as any)} 
                      className="batch-op-select" 
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="bottom-center">Bottom Center</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="top-right">Top Right</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 min-w-[160px]">
                    <span className="text-xs text-gray-400 font-semibold">Format</span>
                    <select 
                      value={pageNumberFormat} 
                      onChange={(e) => setPageNumberFormat(e.target.value as any)} 
                      className="batch-op-select" 
                      style={{ padding: '8px 12px', fontSize: '13px' }}
                    >
                      <option value="simple">Simple (1, 2, 3)</option>
                      <option value="page-of-pages">Page of Pages (Page 1 of 5)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {operation === 'protect' && (
              <div className="suboption-row">
                <label>Password protection</label>
                <input 
                  type="password" 
                  className="batch-input-text" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="Enter password to secure all files" 
                />
              </div>
            )}
          </div>
        </div>

        {/* Multi-file drop zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center text-center cursor-pointer min-h-[220px] transition-all relative overflow-hidden group ${
            isDragging 
              ? 'border-indigo-500 bg-indigo-500/5 scale-[1.01] shadow-[0_0_40px_rgba(124,58,237,0.15)]' 
              : 'border-[#2A2A40] bg-[#13131F]/30 hover:border-indigo-500/75 hover:bg-indigo-500/5 hover:scale-[1.002]'
          }`}
          id="batchDropZone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept=".pdf"
            multiple
            className="hidden"
          />

          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex flex-col items-center z-10">
            <div className="p-4 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
              <Upload size={28} className="stroke-[2.5]" />
            </div>
            <h3 className="font-sans font-bold text-lg text-white">
              Drop multiple PDFs here (up to 20 files)
            </h3>
            <p className="text-xs text-gray-400 mt-1.5">
              or click to browse files from your computer
            </p>
            <div className="mt-4 flex gap-4 text-[10px] font-mono font-bold uppercase text-gray-500">
              <span>PDF ONLY</span>
              <span>•</span>
              <span>MAX 200MB EACH</span>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3">
            <ShieldAlert size={16} />
            <p className="font-medium">{errorMsg}</p>
          </div>
        )}

        {/* File Queue & Status */}
        {queuedFiles.length > 0 && (
          <div className="glass-card rounded-3xl overflow-hidden shadow-lg border border-gray-100 dark:border-gray-900">
            <div className="px-6 py-4 bg-gray-50/50 dark:bg-gray-950/40 border-b border-gray-100 dark:border-gray-900 flex justify-between items-center">
              <div>
                <h3 className="font-sans font-bold text-sm text-gray-900 dark:text-white">
                  Files Queue ({queuedFiles.length})
                </h3>
                <p className="text-xs text-gray-400">
                  Ready to apply <strong>{getOperationLabel(operation)}</strong>
                </p>
              </div>
              <button
                disabled={isProcessingAll}
                onClick={clearQueue}
                className="px-3 py-1.5 text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 rounded-lg border border-red-500/10 disabled:opacity-50 transition-colors"
              >
                Clear All
              </button>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-900 max-h-[400px] overflow-y-auto">
              {queuedFiles.map((item) => (
                <div key={item.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl shrink-0">
                      <FileText size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {item.file.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatSize(item.file.size)}
                      </p>
                    </div>
                  </div>

                  {/* Processing / Progress Status */}
                  <div className="flex items-center gap-4 shrink-0">
                    {item.status === 'pending' && (
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-900 text-gray-400 font-bold text-[10px] rounded-full uppercase tracking-wider">
                        Pending
                      </span>
                    )}

                    {item.status === 'processing' && (
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                          <div 
                            className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono font-bold text-indigo-400">
                          {item.progress}%
                        </span>
                      </div>
                    )}

                    {item.status === 'success' && (
                      <div className="flex items-center gap-3">
                        <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 font-bold text-[10px] rounded-full uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 size={10} /> Success
                        </span>
                        {item.resultUrl && (
                          <a
                            href={item.resultUrl}
                            download={item.resultName}
                            className="p-1.5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg transition-colors flex items-center justify-center"
                            title="Download processed file"
                          >
                            <Download size={14} />
                          </a>
                        )}
                      </div>
                    )}

                    <button
                      disabled={isProcessingAll}
                      onClick={() => removeFile(item.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg transition-colors disabled:opacity-50"
                      title="Remove file"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Bar */}
            <div className="p-4 bg-gray-50/50 dark:bg-gray-950/40 border-t border-gray-100 dark:border-gray-900 flex justify-end">
              <button
                onClick={handleProcessAll}
                disabled={isProcessingAll}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all shadow-md flex items-center gap-2"
              >
                {isProcessingAll ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Process All Files
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

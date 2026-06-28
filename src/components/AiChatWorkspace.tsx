import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Upload, FileText, Send, Copy, Check, Sparkles, Loader2, ArrowLeft, ArrowRight
} from 'lucide-react';
import { User } from '../types';
import { AppStore } from '../lib/store';

interface AiChatWorkspaceProps {
  onClose?: () => void;
  currentUser: User | null;
  onUserUpdate?: () => void;
}

const loadPdfJS = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).pdfjsLib) {
      resolve((window as any).pdfjsLib);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    script.onload = () => {
      const pdfjs = (window as any).pdfjsLib;
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjs);
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js library from CDN.'));
    document.body.appendChild(script);
  });
};

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  isNew?: boolean;
}

// Simulated character-by-character typewriter reveal at 12ms speed
const TypewriterMessage = ({ text, isNew }: { text: string; isNew: boolean }) => {
  const [displayedText, setDisplayedText] = useState(isNew ? '' : text);

  useEffect(() => {
    if (!isNew) {
      setDisplayedText(text);
      return;
    }

    let i = 0;
    setDisplayedText('');

    const interval = setInterval(() => {
      if (i >= text.length) {
        clearInterval(interval);
        return;
      }
      setDisplayedText(text.slice(0, i + 1));
      i++;

      // Auto-scroll chat to bottom
      const chatEl = document.getElementById('chatMessages');
      if (chatEl) {
        chatEl.scrollTop = chatEl.scrollHeight;
      }
    }, 12); // speed = 12

    return () => clearInterval(interval);
  }, [text, isNew]);

  return <span className="whitespace-pre-wrap">{displayedText}</span>;
};

export default function AiChatWorkspace({ onClose, currentUser, onUserUpdate }: AiChatWorkspaceProps) {
  // Navigation back to tool dashboard
  const handleBack = () => {
    if (onClose) onClose();
  };

  // Reset document workspace state
  const handleReset = () => {
    setFile(null);
    setIsDragging(false);
    setIsExtracting(false);
    setTotalPages(0);
    setThumbnailUrl('');
    setExtractedText('');
    setError('');
    setSummary('');
    setIsSummarizing(false);
    setSuggestedQuestions([]);
    setMessages([]);
    setInputText('');
    setIsSending(false);
    setCopiedId(null);
  };

  // State managers
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [extractedText, setExtractedText] = useState<string>('');
  const [error, setError] = useState<string>('');

  // AI Content States
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Chat States
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const thumbnailCanvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-scroll messages to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Bind copyMessage to window to support custom onclick handlers
  useEffect(() => {
    (window as any).copyMessage = (elementId: string) => {
      const el = document.getElementById(elementId);
      if (el) {
        const text = el.textContent || '';
        navigator.clipboard.writeText(text).then(() => {
          // Find button styled with onclick="copyMessage('elementId')"
          const buttons = document.querySelectorAll(`button`);
          buttons.forEach((btn) => {
            const onClickAttr = btn.getAttribute('onclick');
            const dataId = btn.getAttribute('data-element-id');
            if ((onClickAttr && onClickAttr.includes(elementId)) || dataId === elementId) {
              const originalText = btn.innerHTML;
              btn.innerHTML = '✓ Copied';
              setTimeout(() => {
                btn.innerHTML = originalText;
              }, 2000);
            }
          });
        });
      }
    };
    return () => {
      delete (window as any).copyMessage;
    };
  }, []);

  // Draw the generated page 1 thumbnail image on the canvas
  useEffect(() => {
    if (thumbnailUrl && thumbnailCanvasRef.current) {
      const canvas = thumbnailCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = thumbnailUrl;
      }
    }
  }, [thumbnailUrl]);

  // Handle Drag-and-Drop Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      processFile(droppedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerUploadInput = () => {
    fileInputRef.current?.click();
  };

  // Validate and Process PDF File
  const processFile = async (selectedFile: File) => {
    if (selectedFile.type !== 'application/pdf' && !selectedFile.name.endsWith('.pdf')) {
      setError('This tool only supports PDF documents (.pdf).');
      return;
    }

    const maxSize = 25 * 1024 * 1024; // 25MB limit
    if (selectedFile.size > maxSize) {
      setError('File size exceeds the 25MB limit for PDF processing.');
      return;
    }

    setFile(selectedFile);
    setError('');
    
    // Clear previous workflow states
    setMessages([]);
    setSummary('');
    setSuggestedQuestions([]);
    setThumbnailUrl('');

    // Begin text extraction
    await extractText(selectedFile);
  };

  // PDF.js text and thumbnail extraction
  const extractText = async (fileToExtract: File) => {
    try {
      setIsExtracting(true);
      setError('');
      
      const pdfjs = await loadPdfJS();
      const arrayBuffer = await fileToExtract.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: arrayBuffer,
        disableRange: true,
        disableStream: true,
        verbosity: 0,
      });

      const pdf = await loadingTask.promise;
      setTotalPages(pdf.numPages);

      // Render page 1 thumbnail
      try {
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 0.4 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          await page.render({
            canvasContext: ctx,
            viewport: viewport
          }).promise;
          setThumbnailUrl(canvas.toDataURL('image/jpeg', 0.85));
        }
      } catch (thumbErr) {
        console.warn('Thumbnail generation failed, skipping thumbnail', thumbErr);
      }

      // Extract all text
      let text = '';
      const numPages = Math.min(pdf.numPages, 100); // capped at 100 for memory and tokens safety
      for (let i = 1; i <= numPages; i++) {
        try {
          const p = await pdf.getPage(i);
          const textContent = await p.getTextContent();
          const items = textContent.items as any[];
          const pageText = items.map(item => item.str).join(' ');
          text += pageText + '\n';
        } catch (pageErr) {
          console.warn(`Failed to extract text from page ${i}`, pageErr);
        }
      }

      const finalExtractedText = text.trim() || 'No selectable text found in the PDF (it might be scanned).';
      setExtractedText(finalExtractedText);
      setIsExtracting(false);
      
      // Generate AI Summary and suggested questions
      await generateSummaryAndQuestions(finalExtractedText);
    } catch (err: any) {
      console.error('PDF processing or text extraction failed:', err);
      setError('Failed to extract text from the PDF file.');
      setIsExtracting(false);
    }
  };

  // Call Express API proxies for Gemini auto-summary & questions
  const generateSummaryAndQuestions = async (text: string) => {
    setIsSummarizing(true);
    try {
      // 1. Fetch Auto-Summary
      const summaryRes = await fetch('/api/gemini/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const summaryData = await summaryRes.json();
      if (!summaryRes.ok) {
        throw new Error(summaryData.error || 'Failed to generate summary');
      }
      setSummary(summaryData.summary || 'Summary could not be generated.');

      // 2. Fetch Suggested Questions
      const questionsRes = await fetch('/api/gemini/suggest-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const questionsData = await questionsRes.json();
      if (!questionsRes.ok) {
        throw new Error(questionsData.error || 'Failed to generate suggested questions');
      }
      setSuggestedQuestions(questionsData.questions || [
        'Summarize this document',
        'What are the key points?',
        'Are there any important dates or deadlines?'
      ]);
    } catch (err: any) {
      console.error('AI Summary or Questions request failed:', err);
      setSummary(`The AI summarization service is currently busy or experiencing high demand. Please try again or type a question directly in the chat below.`);
      setSuggestedQuestions([
        'Summarize this document',
        'What are the key points?',
        'Are there any important dates or deadlines?'
      ]);
    } finally {
      setIsSummarizing(false);
    }
  };

  // Send a message to the AI
  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isSending) return;

    if (!currentUser) {
      setError('Please sign in or register to use AI Chat PDF.');
      return;
    }

    if (currentUser.plan === 'free' && (currentUser.credits || 0) < 1) {
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: '⚠️ You have run out of credits. Please claim your free Daily Gift on the dashboard, refer friends (+20 credits), or upgrade your plan to get more credits!',
        isNew: true
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: Math.random().toString(),
      sender: 'user',
      text: textToSend.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsSending(true);

    // Auto-reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const chatRes = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          messages: [...messages, userMessage],
          message: textToSend.trim(),
        }),
      });

      const data = await chatRes.json();
      if (!chatRes.ok) {
        throw new Error(data.error || 'Failed to get chat response');
      }

      // Deduct 1 credit for successful AI query for free plan
      if (currentUser.plan === 'free') {
        const updated = AppStore.consumeCredits(currentUser.id, 1);
        if (updated.success && updated.user) {
          onUserUpdate?.();
        }
      }
      
      const aiMessage: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: data.response || "I'm sorry, I encountered an issue processing your query.",
        isNew: true, // triggers the typewriter effect
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Failed to get AI chat response:', err);
      const errorMessage: Message = {
        id: Math.random().toString(),
        sender: 'ai',
        text: 'Failed to connect to the AI model. Please check your connection and try again.',
        isNew: true,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Keyboard and dynamic resizing for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputText);
    }
  };

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Auto-resize textarea height (min 1 row, max 4 rows)
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  // Copy Message to Clipboard
  const handleCopyMessage = (msgId: string) => {
    const el = document.getElementById(`aiMsg_${msgId}`);
    if (el) {
      const text = el.textContent || '';
      navigator.clipboard.writeText(text).then(() => {
        setCopiedId(msgId);
        setTimeout(() => setCopiedId(null), 2000);
      });
    }
  };

  return (
    <div className="w-full text-[#F0EEFF] select-text">
      {/* Inline styles for custom dotPulse animation */}
      <style>{`
        @keyframes dotPulse {
          0%, 80%, 100% { opacity: 0.2; }
          40% { opacity: 1; }
        }
        .dot-pulse-1 { animation: dotPulse 1.4s infinite ease-in-out; }
        .dot-pulse-2 { animation: dotPulse 1.4s infinite ease-in-out; animation-delay: 0.2s; }
        .dot-pulse-3 { animation: dotPulse 1.4s infinite ease-in-out; animation-delay: 0.4s; }

        /* Left Panel - Document Info styles */
        .chat-doc-panel {
          background: var(--color-surface);
          border-right: 1px solid var(--color-border);
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
          overflow-y: auto;
        }
        .doc-thumbnail-wrapper {
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background-color: var(--color-surface-2);
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .doc-thumbnail-wrapper canvas {
          width: 100%;
          height: auto;
          display: block;
        }
        .doc-filename {
          font-family: var(--font-mono);
          font-size: 13px;
          color: var(--color-text-primary);
          word-break: break-all;
        }
        .doc-pagecount {
          font-size: 12px;
          color: var(--color-text-muted);
        }
        .doc-summary-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-accent);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .doc-summary-text {
          font-size: 14px;
          color: var(--color-text-secondary);
          line-height: 1.65;
          background: var(--color-surface-2);
          border-radius: var(--radius-md);
          padding: var(--space-3);
          border: 1px solid var(--color-border);
        }
        .upload-new-btn {
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-muted);
          padding: 10px;
          border-radius: var(--radius-md);
          font-size: 13px;
          cursor: pointer;
          margin-top: auto;
          transition: all 0.2s ease-in-out;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .upload-new-btn:hover {
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        
        /* Loading animation for summary loading dots */
        .summary-loading {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--color-text-muted);
        }
        .loading-dot {
          width: 6px;
          height: 6px;
          background-color: var(--color-accent);
          border-radius: 50%;
          display: inline-block;
          animation: dotPulse 1.4s infinite ease-in-out;
        }
        .loading-dot:nth-child(1) {
          animation-delay: 0s;
        }
        .loading-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .loading-dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* Right Panel - Chat Interface styles */
        .chat-main-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          position: relative;
          overflow: hidden;
          background: var(--color-bg);
        }
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-5);
          display: flex;
          flex-direction: column;
          gap: var(--space-4);
        }
        .chat-welcome {
          text-align: center;
          padding: var(--space-6) var(--space-4);
          max-width: 480px;
          margin: auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }
        .chat-welcome-icon {
          font-size: 40px;
          margin-bottom: var(--space-3);
        }
        .chat-welcome h3 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 700;
          color: var(--color-text-primary);
          margin-bottom: var(--space-2);
        }
        .chat-welcome p {
          font-size: 13px;
          color: var(--color-text-secondary);
          line-height: 1.6;
        }
        .suggested-questions {
          padding: var(--space-3) var(--space-5);
          border-top: 1px solid var(--color-border);
          background: rgba(19, 19, 31, 0.4);
        }
        .suggested-label {
          font-size: 12px;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          margin-bottom: var(--space-2);
        }
        .suggested-chips {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-2);
        }
        .suggested-chip {
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          padding: 8px 14px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease-in-out;
        }
        .suggested-chip:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: var(--color-primary-glow);
        }
        .chat-input-bar {
          padding: var(--space-4) var(--space-5);
          border-top: 1px solid var(--color-border);
          display: flex;
          gap: var(--space-3);
          align-items: flex-end;
          background: var(--color-surface);
        }
        .chat-input {
          flex: 1;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 12px 16px;
          color: var(--color-text-primary);
          font-size: 15px;
          resize: none;
          max-height: 120px;
          overflow-y: auto;
          line-height: 1.5;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .chat-input:focus {
          border-color: var(--color-primary);
          box-shadow: 0 0 0 3px var(--color-primary-glow);
          outline: none;
        }
        .chat-send-btn {
          width: 44px;
          height: 44px;
          border-radius: var(--radius-md);
          background: var(--color-primary);
          border: none;
          color: white;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .chat-send-btn:hover:not(:disabled) {
          background: var(--color-primary-dark);
        }
        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Message Styling */
        .chat-message {
          display: flex;
          gap: var(--space-3);
          width: 100%;
        }
        .chat-message--user {
          justify-content: flex-end;
          flex-direction: column;
          align-items: flex-end;
        }
        .chat-message--ai {
          justify-content: flex-start;
          align-items: flex-start;
        }
        .message-bubble--user {
          background: var(--color-primary);
          color: white;
          border-radius: 18px 18px 4px 18px;
          padding: 12px 16px;
          max-width: 75%;
          align-self: flex-end;
          font-size: 15px;
        }
        .message-bubble--ai {
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          border-radius: 4px 18px 18px 18px;
          padding: 12px 16px;
          max-width: 100%;
          font-size: 15px;
          line-height: 1.7;
        }
        .message-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          max-width: 85%;
        }
        .message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-primary-glow);
          border: 1px solid var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .message-meta {
          font-size: 11px;
          color: var(--color-text-muted);
          font-family: var(--font-mono);
          margin-top: 4px;
        }
        .msg-action-btn {
          background: transparent;
          border: none;
          font-size: 12px;
          color: var(--color-text-muted);
          cursor: pointer;
          transition: color 0.15s ease-in-out;
        }
        .msg-action-btn:hover {
          color: var(--color-accent);
        }
        .message-actions {
          display: flex;
          gap: var(--space-2);
          margin-top: 6px;
        }

        /* Upload State Styling */
        .chat-upload-state {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
          min-height: calc(100vh - 8rem);
        }
        .chat-upload-inner {
          max-width: 640px;
          width: 100%;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: var(--space-3);
        }
        .upload-icon {
          font-size: 48px;
          margin-bottom: var(--space-2);
        }
        .chat-upload-inner h2 {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--color-text-primary);
        }
        .chat-upload-inner p {
          font-size: 15px;
          color: var(--color-text-secondary);
          max-width: 480px;
          line-height: 1.6;
        }
        .chat-capability-chips {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--space-3);
          margin-top: var(--space-6);
          max-width: 520px;
        }
        .capability-chip {
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          color: var(--color-text-secondary);
          padding: 6px 14px;
          border-radius: var(--radius-pill);
          font-size: 13px;
          font-weight: 500;
        }
        
        /* Typing indicator styling */
        .typing-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 12px 16px;
          background: var(--color-surface-2);
          border: 1px solid var(--color-border);
          border-radius: 4px 18px 18px 18px;
          max-width: 80px;
        }
      `}</style>

      {/* BEFORE UPLOAD: Custom Drop Zone View */}
      {!file && (
        <div 
          className="chat-upload-state" 
          id="chatUploadState"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="chat-upload-inner">
            <div className="upload-icon">🤖</div>
            <h2>AI Chat PDF</h2>
            <p>Upload a PDF to start a conversation. Ask questions, get summaries, extract key information — all instantly.</p>
            
            <div 
              className={`hero-drop-zone ${isDragging ? 'dragging' : ''}`}
              style={{ maxWidth: '480px', margin: 'var(--space-5) auto 0' }}
              onClick={triggerUploadInput}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf"
                className="hidden"
              />
              
              {isExtracting ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 size={32} className="text-indigo-400 animate-spin" />
                  <p className="drop-zone-primary">Analyzing Document...</p>
                  <p className="drop-zone-secondary">Reading pages and extracting text...</p>
                </div>
              ) : (
                <>
                  <div className="drop-zone-icon">⬆</div>
                  <p className="drop-zone-primary">Drop your PDF here</p>
                  <p className="drop-zone-secondary">Max 25MB · Processed in your browser · Never uploaded to servers</p>
                  <button className="drop-zone-browse">Browse Files</button>
                </>
              )}
            </div>

            <div className="chat-capability-chips">
              <span className="capability-chip">📋 Summarize documents</span>
              <span className="capability-chip">🔍 Find specific information</span>
              <span className="capability-chip">⚖️ Explain legal terms</span>
              <span className="capability-chip">📊 Extract data & numbers</span>
            </div>

            {error && (
              <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-3 justify-center">
                <span className="text-lg">⚠️</span>
                <p className="font-medium">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* AFTER UPLOAD: Responsive Split Panel Layout */}
      {file && (
        <div className="flex flex-col lg:flex-row h-[calc(100vh-6rem)] min-h-[500px] bg-[#13131F]/30 border border-[#2A2A40] rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.3)] select-text">
          
          {/* LEFT PANEL: Document Info */}
          {/* Desktop Left-Panel (chat-doc-panel) */}
          <div className="chat-doc-panel hidden lg:flex shrink-0 w-80">
            <div className="doc-thumbnail-wrapper">
              <canvas id="docThumbnail" ref={thumbnailCanvasRef}></canvas>
            </div>
            <div className="doc-meta">
              <p className="doc-filename" id="docFilename" title={file.name}>{file.name}</p>
              <p className="doc-pagecount" id="docPageCount">{totalPages} {totalPages === 1 ? 'page' : 'pages'}</p>
            </div>

            {/* Credit Balance & Query Cost display for sidebar */}
            <div className="px-5 py-3.5 mx-4 mt-2 mb-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-left space-y-1.5 font-sans">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-indigo-400 uppercase tracking-widest">
                  <span>⚡ Balance</span>
                </div>
                <span className="text-xs font-mono font-extrabold text-indigo-300 bg-indigo-500/20 px-2.5 py-0.5 rounded-full">
                  {currentUser?.plan === 'business' ? 'Unlimited' : `${currentUser?.credits ?? 10} left`}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>Cost per query</span>
                <span className="font-mono text-indigo-300 font-bold">1 credit</span>
              </div>
            </div>

            <div className="doc-summary-section">
              <div className="doc-summary-label">
                <span className="summary-icon">✦</span>
                AI Summary
              </div>
              <div className="doc-summary-text" id="docSummary">
                {isSummarizing ? (
                  <div className="summary-loading">
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    Generating summary...
                  </div>
                ) : (
                  summary || 'No summary could be generated.'
                )}
              </div>
            </div>
            <button className="upload-new-btn" id="uploadNewBtn" onClick={handleReset}>Upload New PDF →</button>
          </div>

          {/* Mobile Compact Top Bar */}
          <div className="flex lg:hidden items-center justify-between w-full border-b border-[#2A2A40] bg-[#13131F]/90 p-4 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <FileText className="text-indigo-400 shrink-0" size={20} />
              <div className="min-w-0">
                <p className="font-sans font-bold text-xs text-white truncate max-w-[180px]" title={file.name}>
                  {file.name}
                </p>
                <p className="text-[10px] text-gray-400">
                  {totalPages} pages · <span className="text-indigo-400 font-mono font-bold">{currentUser?.plan === 'business' ? 'Unlimited' : `${currentUser?.credits ?? 10} credits`}</span>
                </p>
              </div>
            </div>
            <button 
              onClick={handleReset}
              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#2A2A40] bg-[#1C1C2E] text-gray-300 hover:text-white hover:border-indigo-500 transition-colors"
            >
              Upload New
            </button>
          {/* RIGHT PANEL: Chat Workspace */}
          <div className="chat-main-panel">
            
            {/* Scrollable Message Box */}
            <div className="chat-messages" id="chatMessages">
              
              {/* WELCOME / EMPTY STATE */}
              {messages.length === 0 && (
                <div className="chat-welcome" id="chatWelcome">
                  <div className="chat-welcome-icon">🤖</div>
                  <h3>Ask anything about this document</h3>
                  <p>I've read your PDF. You can ask me to summarize sections, explain terms, find specific information, or compare clauses.</p>
                </div>
              )}

              {/* MESSAGE HISTORY BUBBLES */}
              {messages.map((msg) => {
                if (msg.sender === 'user') {
                  return (
                    <div key={msg.id} className="chat-message chat-message--user">
                      <div className="message-bubble message-bubble--user">
                        {msg.text}
                      </div>
                      <div className="message-meta">You &middot; just now</div>
                    </div>
                  );
                } else {
                  return (
                    <div key={msg.id} className="chat-message chat-message--ai">
                      <div className="message-avatar">🤖</div>
                      <div className="message-content">
                        <div className="message-bubble message-bubble--ai" id={`aiMsg_${msg.id}`}>
                          <TypewriterMessage text={msg.text} isNew={!!msg.isNew} />
                        </div>
                        <div className="message-actions">
                          <button 
                            className="msg-action-btn" 
                            onClick={() => handleCopyMessage(msg.id)} 
                            data-element-id={`aiMsg_${msg.id}`}
                            title="Copy"
                          >
                            {copiedId === msg.id ? '✓ Copied' : '📋 Copy'}
                          </button>
                        </div>
                        <div className="message-meta">Doculux AI &middot; just now</div>
                      </div>
                    </div>
                  );
                }
              })}

              {/* AI THINKING INDICATOR */}
              {isSending && (
                <div className="chat-message chat-message--ai" id="typingIndicator">
                  <div className="message-avatar">🤖</div>
                  <div className="message-bubble message-bubble--ai typing-indicator">
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                    <span className="loading-dot"></span>
                  </div>
                </div>
              )}

              {/* End Anchor for Scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested questions (shown after upload, hidden after first user message) */}
            {messages.length === 0 && suggestedQuestions.length > 0 && (
              <div className="suggested-questions" id="suggestedQuestions">
                <p className="suggested-label">Suggested questions</p>
                <div className="suggested-chips" id="suggestedChips">
                  {suggestedQuestions.map((question, index) => (
                    <button
                      key={index}
                      className="suggested-chip"
                      onClick={() => handleSendMessage(question)}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="chat-input-bar">
              <textarea
                ref={textareaRef}
                className="chat-input"
                id="chatInput"
                placeholder="Ask a question about your document..."
                rows={1}
                value={inputText}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                disabled={isSending}
              />
              <button
                className="chat-send-btn"
                id="chatSendBtn"
                aria-label="Send"
                onClick={() => handleSendMessage(inputText)}
                disabled={!inputText.trim() || isSending}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"></line>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                </svg>
              </button>
            </div>
          </div>       </div>
        </div>
      )}
    </div>
  );
}

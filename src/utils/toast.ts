export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

export function showToast(message: string, type: ToastType = 'info') {
  const event = new CustomEvent('doculux-toast', {
    detail: { message, type }
  });
  window.dispatchEvent(event);
}

// Make it available on window too for convenience or legacy scripts
(window as any).showToast = showToast;

interface ToastProps {
  toasts: Array<{ id: number; message: string; type: 'success' | 'info' }>;
}

export function ToastContainer({ toasts }: ToastProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-slide-up ${
            t.type === 'success'
              ? 'bg-teal-600 text-white'
              : 'bg-gray-800 text-white'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

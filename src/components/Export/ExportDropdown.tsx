import { useState, useRef, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../Toast';
import { generateTypeScript, generatePython, generateJSON, generateCICD } from './generators';

interface ExportDropdownProps {
  policyCode: string;
}

const EXPORT_OPTIONS = [
  { id: 'typescript', label: 'TypeScript SDK', icon: 'TS', desc: 'Ready-to-use TealEngine setup' },
  { id: 'python', label: 'Python SDK', icon: 'PY', desc: 'Ready-to-use Python setup' },
  { id: 'json', label: 'JSON Policy', icon: '{}', desc: 'Portable policy config file' },
  { id: 'cicd', label: 'GitHub Actions', icon: 'CI', desc: 'CI/CD workflow snippet' },
] as const;

type ExportFormat = typeof EXPORT_OPTIONS[number]['id'];

export function ExportDropdown({ policyCode }: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [preview, setPreview] = useState<{ format: ExportFormat; code: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { toasts, show } = useToast();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (format: ExportFormat) => {
    if (!policyCode.trim()) {
      show('Write a policy first', 'info');
      setIsOpen(false);
      return;
    }

    const generators: Record<ExportFormat, (code: string) => string> = {
      typescript: generateTypeScript,
      python: generatePython,
      json: generateJSON,
      cicd: generateCICD,
    };

    const code = generators[format](policyCode);
    setPreview({ format, code });
    setIsOpen(false);
  };

  const handleCopy = async () => {
    if (!preview) return;
    await navigator.clipboard.writeText(preview.code);
    show('Copied to clipboard', 'success');
  };

  const handleDownload = () => {
    if (!preview) return;
    const ext: Record<ExportFormat, string> = {
      typescript: 'ts', python: 'py', json: 'json', cicd: 'yml',
    };
    const blob = new Blob([preview.code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealtiger-policy.${ext[preview.format]}`;
    a.click();
    URL.revokeObjectURL(url);
    show(`Downloaded as .${ext[preview.format]}`, 'success');
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-md transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export
          <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
            {EXPORT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => handleExport(opt.id)}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <span className="w-6 text-center text-[10px] font-bold text-gray-400 font-mono">{opt.icon}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900">{opt.label}</p>
                  <p className="text-[10px] text-gray-500">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">
                {EXPORT_OPTIONS.find(o => o.id === preview.format)?.icon}{' '}
                {EXPORT_OPTIONS.find(o => o.id === preview.format)?.label}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-md hover:bg-teal-700"
                >
                  Copy
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md hover:bg-gray-200"
                >
                  Download
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-auto p-6 bg-gray-900 text-green-400 text-sm font-mono leading-relaxed">
              {preview.code}
            </pre>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} />
    </>
  );
}

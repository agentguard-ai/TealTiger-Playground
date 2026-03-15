import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { configureMonaco } from './MonacoConfig';
import { registerCompletionProvider } from './CompletionProvider';
import { usePlaygroundStore } from '@/store/playgroundStore';
import type { ValidationError } from '@/types';

interface PolicyEditorProps {
  onValidationChange?: (isValid: boolean, errors: ValidationError[]) => void;
  onEvaluate?: () => void;
}

export function PolicyEditor({ onValidationChange, onEvaluate }: PolicyEditorProps) {
  const { policyCode, setPolicyCode } = usePlaygroundStore();
  const [isReady, setIsReady] = useState(false);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const completionProviderRef = useRef<monaco.IDisposable | null>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Configure Monaco on mount
    configureMonaco();
    setIsReady(true);

    return () => {
      // Cleanup
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, []);

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;

    // Register completion provider
    completionProviderRef.current = registerCompletionProvider();

    // Set up keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onEvaluate?.();
    });

    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        editor.getAction('editor.action.formatDocument')?.run();
      }
    );

    // Set theme
    monaco.editor.setTheme('tealtiger-dark');
  };

  const handleEditorChange = (value: string | undefined) => {
    const code = value || '';
    setPolicyCode(code);

    // Debounced validation (300ms)
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      validateCode(code);
    }, 300);
  };

  const validateCode = (code: string) => {
    // Basic validation - check for syntax errors
    const errors: ValidationError[] = [];

    // Check if code has default export
    if (!code.includes('export default')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Policy must have a default export',
        severity: 'error',
      });
    }

    // Check if it's a function
    if (!code.includes('function') && !code.includes('=>')) {
      errors.push({
        line: 1,
        column: 1,
        message: 'Policy must export a function',
        severity: 'error',
      });
    }

    const isValid = errors.length === 0;
    onValidationChange?.(isValid, errors);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center h-full bg-[#1E1E1E]">
        <div className="text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <Editor
        height="100%"
        defaultLanguage="typescript"
        value={policyCode}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="tealtiger-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          formatOnPaste: true,
          formatOnType: true,
        }}
      />
    </div>
  );
}

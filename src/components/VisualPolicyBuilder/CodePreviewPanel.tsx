/**
 * Code Preview Panel Component
 * 
 * Displays generated TypeScript code from visual policies using Monaco Editor.
 * Features:
 * - Read-only Monaco Editor with syntax highlighting
 * - Copy to clipboard functionality
 * - Export as .ts file
 * - Real-time updates with debouncing (300ms)
 * - Error and warning display
 * 
 * @module components/VisualPolicyBuilder/CodePreviewPanel
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Copy, Download, AlertCircle, CheckCircle } from 'lucide-react';
import { useVisualPolicyStore } from '../../stores/visualPolicyStore';
import { codeGenerator } from '../../services/CodeGenerator';
import type { GeneratedCode } from '../../types/visual-policy';

/**
 * CodePreviewPanel Props
 */
export interface CodePreviewPanelProps {
  /** Policy name for export filename */
  policyName?: string;
  /** Whether to show the panel */
  visible?: boolean;
  /** Custom height */
  height?: string;
}

/**
 * Code Preview Panel Component
 * 
 * Displays generated code with Monaco Editor and provides copy/export actions.
 */
export const CodePreviewPanel: React.FC<CodePreviewPanelProps> = ({
  policyName = 'policy',
  visible = true,
  height = '400px',
}) => {
  const { blocks, connections, viewport } = useVisualPolicyStore();
  const [generatedCode, setGeneratedCode] = useState<GeneratedCode | null>(null);
  const [copied, setCopied] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Generate code with debouncing
   */
  const generateCodeDebounced = useCallback(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer for 300ms debounce
    debounceTimerRef.current = setTimeout(() => {
      const policy = {
        id: 'preview',
        workspaceId: 'preview',
        name: policyName,
        description: 'Generated from visual policy',
        blocks,
        connections,
        viewport,
        metadata: {
          tags: [],
          category: 'custom',
          providers: [],
          models: [],
          estimatedCost: 0,
          testCoverage: 0,
          isVisual: true,
        },
        version: '1.0.0',
        createdBy: 'user',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const result = codeGenerator.generateCode(policy);
      setGeneratedCode(result);
    }, 300);
  }, [blocks, connections, viewport, policyName]);
  
  /**
   * Regenerate code when blocks or connections change
   */
  useEffect(() => {
    generateCodeDebounced();
    
    // Cleanup timer on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [generateCodeDebounced]);
  
  /**
   * Copy code to clipboard
   */
  const handleCopy = useCallback(async () => {
    if (!generatedCode) return;
    
    try {
      // Combine imports and code
      const fullCode = `${generatedCode.imports.join('\n')}\n\n${generatedCode.code}`;
      await navigator.clipboard.writeText(fullCode);
      setCopied(true);
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  }, [generatedCode]);
  
  /**
   * Export code as .ts file
   */
  const handleExport = useCallback(() => {
    if (!generatedCode) return;
    
    // Combine imports and code
    const fullCode = `${generatedCode.imports.join('\n')}\n\n${generatedCode.code}`;
    
    // Create blob and download
    const blob = new Blob([fullCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${policyName.replace(/[^a-zA-Z0-9]/g, '_')}.ts`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [generatedCode, policyName]);
  
  if (!visible) {
    return null;
  }
  
  // Combine imports and code for display
  const displayCode = generatedCode
    ? `${generatedCode.imports.join('\n')}\n\n${generatedCode.code}`
    : '// No blocks added yet\n// Drag blocks from the library to start building your policy';
  
  const hasErrors = generatedCode && generatedCode.errors.length > 0;
  const hasWarnings = generatedCode && generatedCode.warnings.length > 0;
  
  return (
    <div className="flex flex-col h-full bg-white border-t border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">Generated Code</h3>
          
          {/* Status indicators */}
          {hasErrors && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{generatedCode.errors.length} error(s)</span>
            </div>
          )}
          
          {hasWarnings && !hasErrors && (
            <div className="flex items-center gap-1 text-yellow-600">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs">{generatedCode.warnings.length} warning(s)</span>
            </div>
          )}
          
          {!hasErrors && !hasWarnings && generatedCode && blocks.length > 0 && (
            <div className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs">Valid</span>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!generatedCode || blocks.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy'}
          </button>
          
          <button
            onClick={handleExport}
            disabled={!generatedCode || blocks.length === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Export as .ts file"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
      
      {/* Error/Warning Messages */}
      {(hasErrors || hasWarnings) && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          {hasErrors && (
            <div className="space-y-1">
              {generatedCode.errors.map((error, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{error.message}</span>
                </div>
              ))}
            </div>
          )}
          
          {hasWarnings && !hasErrors && (
            <div className="space-y-1">
              {generatedCode.warnings.map((warning, index) => (
                <div key={index} className="flex items-start gap-2 text-sm text-yellow-600">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{warning.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Monaco Editor */}
      <div className="flex-1 overflow-hidden" style={{ height }}>
        <Editor
          height="100%"
          defaultLanguage="typescript"
          value={displayCode}
          theme="vs-light"
          options={{
            readOnly: true,
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            fontSize: 13,
            lineNumbers: 'on',
            renderWhitespace: 'selection',
            folding: true,
            automaticLayout: true,
            wordWrap: 'on',
            tabSize: 2,
          }}
          loading={
            <div className="flex items-center justify-center h-full">
              <div className="text-sm text-gray-500">Loading editor...</div>
            </div>
          }
        />
      </div>
      
      {/* Footer with stats */}
      {generatedCode && blocks.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>{blocks.length} block(s)</span>
            <span>{connections.length} connection(s)</span>
            <span>{displayCode.split('\n').length} lines</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CodePreviewPanel;

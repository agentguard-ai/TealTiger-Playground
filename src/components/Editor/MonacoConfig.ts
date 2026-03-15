import * as monaco from 'monaco-editor';

export function configureMonaco() {
  // TypeScript compiler options
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    noEmit: true,
    esModuleInterop: true,
    jsx: monaco.languages.typescript.JsxEmit.React,
    allowJs: true,
    typeRoots: ['node_modules/@types'],
  });

  // Add TealTiger SDK type definitions
  monaco.languages.typescript.typescriptDefaults.addExtraLib(
    `
    declare module 'tealtiger' {
      export interface Request {
        provider: string;
        model: string;
        prompt: string;
        parameters: Record<string, unknown>;
      }
      
      export interface Context {
        userId?: string;
        sessionId?: string;
        metadata: Record<string, unknown>;
      }
      
      export interface Decision {
        action: 'ALLOW' | 'DENY' | 'MONITOR';
        reason: string;
        metadata: Record<string, unknown>;
      }
      
      export function detectPII(text: string): string[];
      export function detectInjection(text: string): boolean;
      export function estimateCost(tokens: number, model: string): number;
    }
    `,
    'file:///node_modules/@types/tealtiger/index.d.ts'
  );

  // Configure editor theme
  monaco.editor.defineTheme('tealtiger-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6A9955' },
      { token: 'keyword', foreground: '569CD6' },
      { token: 'string', foreground: 'CE9178' },
    ],
    colors: {
      'editor.background': '#1E1E1E',
      'editor.foreground': '#D4D4D4',
      'editorLineNumber.foreground': '#858585',
      'editor.selectionBackground': '#264F78',
      'editor.inactiveSelectionBackground': '#3A3D41',
    },
  });
}

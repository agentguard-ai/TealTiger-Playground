import * as monaco from 'monaco-editor';

export function registerCompletionProvider(): monaco.IDisposable {
  return monaco.languages.registerCompletionItemProvider('typescript', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn,
      };

      const suggestions: monaco.languages.CompletionItem[] = [
        {
          label: 'detectPII',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Detect personally identifiable information in text',
          insertText: 'detectPII(${1:text})',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        },
        {
          label: 'detectInjection',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Detect prompt injection attempts',
          insertText: 'detectInjection(${1:text})',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        },
        {
          label: 'estimateCost',
          kind: monaco.languages.CompletionItemKind.Function,
          documentation: 'Estimate cost for token usage',
          insertText: 'estimateCost(${1:tokens}, ${2:model})',
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        },
        {
          label: 'policyTemplate',
          kind: monaco.languages.CompletionItemKind.Snippet,
          documentation: 'Basic policy template',
          insertText: [
            'export default function(request: Request, context: Context): Decision {',
            '  // Your policy logic here',
            '  return {',
            '    action: "ALLOW",',
            '    reason: "${1:Policy passed}",',
            '    metadata: {}',
            '  };',
            '}',
          ].join('\n'),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          range,
        },
      ];

      return { suggestions };
    },
  });
}

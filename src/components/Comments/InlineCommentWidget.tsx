// InlineCommentWidget - Monaco Editor integration for inline comments
// Requirements: 6.1, 6.2

import React, { useEffect, useRef } from 'react';
import * as monaco from 'monaco-editor';
import { CommentThread } from '../../types/comment';

interface InlineCommentWidgetProps {
  editor: monaco.editor.IStandaloneCodeEditor;
  threads: CommentThread[];
  onAddComment: (lineNumber: number) => void;
}

export const InlineCommentWidget: React.FC<InlineCommentWidgetProps> = ({
  editor,
  threads,
  onAddComment,
}) => {
  const decorationsRef = useRef<string[]>([]);

  useEffect(() => {
    // Clear previous decorations
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);

    // Add decorations for lines with comments
    const decorations: monaco.editor.IModelDeltaDecoration[] = threads.map((thread) => ({
      range: new monaco.Range(
        thread.comment.lineNumber,
        1,
        thread.comment.lineNumber,
        1
      ),
      options: {
        isWholeLine: true,
        className: thread.comment.resolved
          ? 'comment-line-resolved'
          : 'comment-line-unresolved',
        glyphMarginClassName: thread.comment.resolved
          ? 'comment-glyph-resolved'
          : 'comment-glyph-unresolved',
        glyphMarginHoverMessage: {
          value: `**${thread.author.username}**: ${thread.comment.content.substring(0, 100)}${
            thread.comment.content.length > 100 ? '...' : ''
          }`,
        },
      },
    }));

    decorationsRef.current = editor.deltaDecorations([], decorations);

    // Add click handler for glyph margin
    const disposable = editor.onMouseDown((e) => {
      if (e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN) {
        const lineNumber = e.target.position?.lineNumber;
        if (lineNumber) {
          onAddComment(lineNumber);
        }
      }
    });

    return () => {
      disposable.dispose();
      decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
    };
  }, [editor, threads, onAddComment]);

  return null;
};

// CSS styles to be added to the application
export const commentWidgetStyles = `
  .comment-line-unresolved {
    background-color: rgba(59, 130, 246, 0.1);
    border-left: 3px solid #3b82f6;
  }

  .comment-line-resolved {
    background-color: rgba(34, 197, 94, 0.05);
    border-left: 3px solid #22c55e;
  }

  .comment-glyph-unresolved::before {
    content: '💬';
    font-size: 12px;
  }

  .comment-glyph-resolved::before {
    content: '✓';
    font-size: 12px;
    color: #22c55e;
  }
`;

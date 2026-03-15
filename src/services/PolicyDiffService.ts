// PolicyDiffService - Policy version comparison and diff generation
// Requirements: 3.8, 4.1-4.10

import type {
  PolicyVersion,
  PolicyMetadata,
  PolicyDiff,
  DiffChange,
  MetadataChange,
  DiffSummary
} from '../types/policy';
import { policyRegistryService } from './PolicyRegistryService';

/**
 * Service for calculating and exporting policy diffs
 */
export class PolicyDiffService {
  /**
   * Calculates diff between two policy versions
   * Requirements: 3.8, 4.1-4.9
   */
  async calculateDiff(
    oldVersionId: string,
    newVersionId: string
  ): Promise<PolicyDiff> {
    // Fetch both versions
    const oldVersion = await policyRegistryService.getVersion(oldVersionId);
    const newVersion = await policyRegistryService.getVersion(newVersionId);

    // Calculate code changes
    const changes = this.calculateCodeChanges(oldVersion.code, newVersion.code);

    // Calculate metadata changes
    const metadataChanges = this.compareMetadata(
      oldVersion.metadata,
      newVersion.metadata
    );

    // Calculate summary
    const summary = this.calculateSummary(changes, metadataChanges);

    return {
      oldVersion,
      newVersion,
      changes,
      metadataChanges,
      summary
    };
  }

  /**
   * Exports diff as unified diff format
   * Requirements: 4.10
   */
  async exportUnifiedDiff(diff: PolicyDiff): Promise<string> {
    const lines: string[] = [];

    // Header
    lines.push(`--- ${diff.oldVersion.version}`);
    lines.push(`+++ ${diff.newVersion.version}`);
    lines.push('');

    // Changes
    for (const change of diff.changes) {
      switch (change.type) {
        case 'added':
          lines.push(`+${change.lineNumber}: ${change.newContent || ''}`);
          break;
        case 'removed':
          lines.push(`-${change.lineNumber}: ${change.oldContent || ''}`);
          break;
        case 'modified':
          lines.push(`-${change.lineNumber}: ${change.oldContent || ''}`);
          lines.push(`+${change.lineNumber}: ${change.newContent || ''}`);
          break;
      }
    }

    // Metadata changes
    if (diff.metadataChanges.length > 0) {
      lines.push('');
      lines.push('Metadata Changes:');
      for (const metaChange of diff.metadataChanges) {
        lines.push(`  ${metaChange.field}:`);
        lines.push(`    - ${JSON.stringify(metaChange.oldValue)}`);
        lines.push(`    + ${JSON.stringify(metaChange.newValue)}`);
      }
    }

    return lines.join('\n');
  }

  /**
   * Exports diff as HTML with syntax highlighting
   * Requirements: 4.7, 4.10
   */
  async exportHtmlDiff(diff: PolicyDiff): Promise<string> {
    const html: string[] = [];

    html.push('<!DOCTYPE html>');
    html.push('<html lang="en">');
    html.push('<head>');
    html.push('  <meta charset="UTF-8">');
    html.push('  <meta name="viewport" content="width=device-width, initial-scale=1.0">');
    html.push(`  <title>Policy Diff: ${diff.oldVersion.version} → ${diff.newVersion.version}</title>`);
    html.push('  <style>');
    html.push('    body { font-family: monospace; margin: 20px; background: #f5f5f5; }');
    html.push('    .header { background: white; padding: 20px; margin-bottom: 20px; border-radius: 8px; }');
    html.push('    .diff-container { background: white; padding: 20px; border-radius: 8px; }');
    html.push('    .line { padding: 4px 8px; margin: 2px 0; }');
    html.push('    .added { background-color: #d4edda; color: #155724; }');
    html.push('    .removed { background-color: #f8d7da; color: #721c24; }');
    html.push('    .modified { background-color: #fff3cd; color: #856404; }');
    html.push('    .line-number { display: inline-block; width: 60px; color: #6c757d; }');
    html.push('    .metadata { margin-top: 20px; padding: 15px; background: #e9ecef; border-radius: 4px; }');
    html.push('    .summary { margin-top: 20px; padding: 15px; background: #d1ecf1; border-radius: 4px; }');
    html.push('  </style>');
    html.push('</head>');
    html.push('<body>');
    
    // Header
    html.push('  <div class="header">');
    html.push(`    <h1>Policy Diff</h1>`);
    html.push(`    <p><strong>Old Version:</strong> ${diff.oldVersion.version}</p>`);
    html.push(`    <p><strong>New Version:</strong> ${diff.newVersion.version}</p>`);
    html.push('  </div>');

    // Summary
    html.push('  <div class="summary">');
    html.push('    <h2>Summary</h2>');
    html.push(`    <p>Lines Added: ${diff.summary.linesAdded}</p>`);
    html.push(`    <p>Lines Removed: ${diff.summary.linesRemoved}</p>`);
    html.push(`    <p>Lines Modified: ${diff.summary.linesModified}</p>`);
    html.push(`    <p>Metadata Changed: ${diff.summary.metadataChanged ? 'Yes' : 'No'}</p>`);
    html.push('  </div>');

    // Changes
    html.push('  <div class="diff-container">');
    html.push('    <h2>Code Changes</h2>');
    for (const change of diff.changes) {
      const lineNum = `<span class="line-number">${change.lineNumber}</span>`;
      switch (change.type) {
        case 'added':
          html.push(`    <div class="line added">${lineNum}+ ${this.escapeHtml(change.newContent || '')}</div>`);
          break;
        case 'removed':
          html.push(`    <div class="line removed">${lineNum}- ${this.escapeHtml(change.oldContent || '')}</div>`);
          break;
        case 'modified':
          html.push(`    <div class="line modified">${lineNum}~ ${this.escapeHtml(change.oldContent || '')} → ${this.escapeHtml(change.newContent || '')}</div>`);
          break;
      }
    }
    html.push('  </div>');

    // Metadata changes
    if (diff.metadataChanges.length > 0) {
      html.push('  <div class="metadata">');
      html.push('    <h2>Metadata Changes</h2>');
      for (const metaChange of diff.metadataChanges) {
        html.push(`    <p><strong>${metaChange.field}:</strong></p>`);
        html.push(`    <p style="margin-left: 20px;">Old: ${this.escapeHtml(JSON.stringify(metaChange.oldValue))}</p>`);
        html.push(`    <p style="margin-left: 20px;">New: ${this.escapeHtml(JSON.stringify(metaChange.newValue))}</p>`);
      }
      html.push('  </div>');
    }

    html.push('</body>');
    html.push('</html>');

    return html.join('\n');
  }

  /**
   * Compares metadata changes
   * Requirements: 4.8
   */
  compareMetadata(
    oldMetadata: PolicyMetadata,
    newMetadata: PolicyMetadata
  ): MetadataChange[] {
    const changes: MetadataChange[] = [];

    // Compare each field
    const fields: (keyof PolicyMetadata)[] = [
      'tags',
      'category',
      'providers',
      'models',
      'estimatedCost',
      'testCoverage'
    ];

    for (const field of fields) {
      const oldValue = oldMetadata[field];
      const newValue = newMetadata[field];

      // Deep comparison for arrays and objects
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field,
          oldValue,
          newValue
        });
      }
    }

    return changes;
  }

  // Private helper methods

  /**
   * Calculates code changes using a simple line-by-line diff algorithm
   */
  private calculateCodeChanges(oldCode: string, newCode: string): DiffChange[] {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const changes: DiffChange[] = [];

    // Simple diff algorithm using longest common subsequence (LCS)
    const lcs = this.longestCommonSubsequence(oldLines, newLines);
    
    let oldIndex = 0;
    let newIndex = 0;
    let lineNumber = 1;

    while (oldIndex < oldLines.length || newIndex < newLines.length) {
      const oldLine = oldLines[oldIndex];
      const newLine = newLines[newIndex];

      if (oldIndex < oldLines.length && newIndex < newLines.length) {
        if (oldLine === newLine) {
          // Lines are the same, move forward
          oldIndex++;
          newIndex++;
          lineNumber++;
        } else if (lcs.includes(oldLine) && !lcs.includes(newLine)) {
          // New line added
          changes.push({
            type: 'added',
            lineNumber,
            newContent: newLine
          });
          newIndex++;
          lineNumber++;
        } else if (!lcs.includes(oldLine) && lcs.includes(newLine)) {
          // Old line removed
          changes.push({
            type: 'removed',
            lineNumber,
            oldContent: oldLine
          });
          oldIndex++;
          lineNumber++;
        } else {
          // Line modified
          changes.push({
            type: 'modified',
            lineNumber,
            oldContent: oldLine,
            newContent: newLine
          });
          oldIndex++;
          newIndex++;
          lineNumber++;
        }
      } else if (oldIndex < oldLines.length) {
        // Remaining old lines are removed
        changes.push({
          type: 'removed',
          lineNumber,
          oldContent: oldLine
        });
        oldIndex++;
        lineNumber++;
      } else {
        // Remaining new lines are added
        changes.push({
          type: 'added',
          lineNumber,
          newContent: newLine
        });
        newIndex++;
        lineNumber++;
      }
    }

    return changes;
  }

  /**
   * Calculates longest common subsequence for diff algorithm
   */
  private longestCommonSubsequence(arr1: string[], arr2: string[]): string[] {
    const m = arr1.length;
    const n = arr2.length;
    const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

    // Build LCS table
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i - 1] === arr2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }

    // Backtrack to find LCS
    const lcs: string[] = [];
    let i = m;
    let j = n;

    while (i > 0 && j > 0) {
      if (arr1[i - 1] === arr2[j - 1]) {
        lcs.unshift(arr1[i - 1]);
        i--;
        j--;
      } else if (dp[i - 1][j] > dp[i][j - 1]) {
        i--;
      } else {
        j--;
      }
    }

    return lcs;
  }

  /**
   * Calculates summary statistics
   */
  private calculateSummary(
    changes: DiffChange[],
    metadataChanges: MetadataChange[]
  ): DiffSummary {
    return {
      linesAdded: changes.filter(c => c.type === 'added').length,
      linesRemoved: changes.filter(c => c.type === 'removed').length,
      linesModified: changes.filter(c => c.type === 'modified').length,
      metadataChanged: metadataChanges.length > 0
    };
  }

  /**
   * Escapes HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

// Export singleton instance
export const policyDiffService = new PolicyDiffService();

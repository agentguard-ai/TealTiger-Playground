/**
 * Code Generator Service
 * 
 * Transforms visual policies into executable TypeScript code through:
 * 1. Dependency analysis - Determines block execution order
 * 2. Topological sort - Orders blocks based on dependencies
 * 3. Cycle detection - Identifies circular dependencies
 * 4. Entry/exit point identification - Validates policy structure
 * 
 * @module services/CodeGenerator
 */

import type {
  VisualPolicy,
  PolicyBlock,
  BlockConnection,
  GeneratedCode,
  BlockCodeMapping,
  CodeError,
  CodeWarning,
} from '../types/visual-policy';
import { getBlockById } from '../data/blockLibrary';
import { codeTemplateEngine } from './CodeTemplateEngine';

/**
 * Dependency graph for block execution order analysis
 */
export interface DependencyGraph {
  /** Map of block ID to block instance */
  nodes: Map<string, PolicyBlock>;
  /** Map of block ID to dependent block IDs (adjacency list) */
  edges: Map<string, string[]>;
  /** Block IDs with no incoming connections (entry points) */
  entryPoints: string[];
  /** Block IDs with no outgoing connections (exit points) */
  exitPoints: string[];
}

/**
 * Result of topological sort
 */
export interface TopologicalSortResult {
  /** Ordered list of blocks for execution */
  orderedBlocks: PolicyBlock[];
  /** Whether the sort was successful */
  success: boolean;
  /** Cycles detected (if any) */
  cycles: BlockConnection[];
}

/**
 * Code Generator Service
 * 
 * Main service for generating TypeScript code from visual policies.
 */
export class CodeGenerator {
  /**
   * Analyze dependencies between blocks
   * 
   * Creates a dependency graph showing which blocks depend on which others
   * based on flow connections.
   */
  analyzeDependencies(policy: VisualPolicy): DependencyGraph {
    const nodes = new Map<string, PolicyBlock>();
    const edges = new Map<string, string[]>();
    const incomingCount = new Map<string, number>();
    
    // Initialize nodes and edge lists
    for (const block of policy.blocks) {
      nodes.set(block.id, block);
      edges.set(block.id, []);
      incomingCount.set(block.id, 0);
    }
    
    // Build adjacency list from connections
    for (const connection of policy.connections) {
      const sourceId = connection.sourceBlockId;
      const targetId = connection.targetBlockId;
      
      if (nodes.has(sourceId) && nodes.has(targetId)) {
        edges.get(sourceId)!.push(targetId);
        incomingCount.set(targetId, (incomingCount.get(targetId) || 0) + 1);
      }
    }
    
    // Identify entry points (no incoming connections)
    const entryPoints: string[] = [];
    for (const [blockId, count] of incomingCount.entries()) {
      if (count === 0) {
        entryPoints.push(blockId);
      }
    }
    
    // Identify exit points (no outgoing connections)
    const exitPoints: string[] = [];
    for (const [blockId, dependents] of edges.entries()) {
      if (dependents.length === 0) {
        exitPoints.push(blockId);
      }
    }
    
    return {
      nodes,
      edges,
      entryPoints,
      exitPoints,
    };
  }
  
  /**
   * Perform topological sort on blocks
   * 
   * Uses Kahn's algorithm to determine execution order.
   * Returns ordered blocks or detects cycles.
   */
  topologicalSort(graph: DependencyGraph): TopologicalSortResult {
    const orderedBlocks: PolicyBlock[] = [];
    const incomingCount = new Map<string, number>();
    const queue: string[] = [];
    
    // Calculate incoming edge count for each node
    for (const [blockId] of graph.nodes) {
      let count = 0;
      for (const [, dependents] of graph.edges) {
        if (dependents.includes(blockId)) {
          count++;
        }
      }
      incomingCount.set(blockId, count);
      
      // Add entry points to queue
      if (count === 0) {
        queue.push(blockId);
      }
    }
    
    // Process queue
    while (queue.length > 0) {
      const blockId = queue.shift()!;
      const block = graph.nodes.get(blockId)!;
      orderedBlocks.push(block);
      
      // Reduce incoming count for dependents
      const dependents = graph.edges.get(blockId) || [];
      for (const dependentId of dependents) {
        const count = incomingCount.get(dependentId)! - 1;
        incomingCount.set(dependentId, count);
        
        if (count === 0) {
          queue.push(dependentId);
        }
      }
    }
    
    // Check if all blocks were processed (no cycles)
    const success = orderedBlocks.length === graph.nodes.size;
    const cycles: BlockConnection[] = [];
    
    if (!success) {
      // Detect cycles by finding blocks not in ordered list
      const processedIds = new Set(orderedBlocks.map(b => b.id));
      for (const [blockId] of graph.nodes) {
        if (!processedIds.has(blockId)) {
          // This block is part of a cycle
          // Find connections involving this block
          const dependents = graph.edges.get(blockId) || [];
          for (const dependentId of dependents) {
            if (!processedIds.has(dependentId)) {
              // Create a dummy connection to represent the cycle
              cycles.push({
                id: `cycle-${blockId}-${dependentId}`,
                sourceBlockId: blockId,
                sourceOutputId: 'out',
                targetBlockId: dependentId,
                targetInputId: 'in',
                isValid: false,
                error: 'Circular dependency detected',
              });
            }
          }
        }
      }
    }
    
    return {
      orderedBlocks,
      success,
      cycles,
    };
  }
  
  /**
   * Detect cycles in block connections
   * 
   * Uses depth-first search to find circular dependencies.
   */
  detectCycles(graph: DependencyGraph): BlockConnection[] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: BlockConnection[] = [];
    
    const dfs = (blockId: string, path: string[]): void => {
      visited.add(blockId);
      recursionStack.add(blockId);
      path.push(blockId);
      
      const dependents = graph.edges.get(blockId) || [];
      for (const dependentId of dependents) {
        if (!visited.has(dependentId)) {
          dfs(dependentId, [...path]);
        } else if (recursionStack.has(dependentId)) {
          // Cycle detected
          const cycleStart = path.indexOf(dependentId);
          const cyclePath = path.slice(cycleStart);
          
          // Create connection representing the cycle
          cycles.push({
            id: `cycle-${blockId}-${dependentId}`,
            sourceBlockId: blockId,
            sourceOutputId: 'out',
            targetBlockId: dependentId,
            targetInputId: 'in',
            isValid: false,
            error: `Circular dependency: ${cyclePath.join(' -> ')} -> ${dependentId}`,
          });
        }
      }
      
      recursionStack.delete(blockId);
    };
    
    // Run DFS from each unvisited node
    for (const [blockId] of graph.nodes) {
      if (!visited.has(blockId)) {
        dfs(blockId, []);
      }
    }
    
    return cycles;
  }
  
  /**
   * Identify entry and exit points in the policy
   * 
   * Entry points: blocks with no incoming connections
   * Exit points: blocks with no outgoing connections
   */
  identifyEntryExitPoints(graph: DependencyGraph): {
    entryPoints: PolicyBlock[];
    exitPoints: PolicyBlock[];
  } {
    const entryPoints = graph.entryPoints
      .map(id => graph.nodes.get(id)!)
      .filter(Boolean);
    
    const exitPoints = graph.exitPoints
      .map(id => graph.nodes.get(id)!)
      .filter(Boolean);
    
    return { entryPoints, exitPoints };
  }
  
  /**
   * Generate code from a visual policy
   * 
   * Main entry point for code generation.
   */
  generateCode(policy: VisualPolicy): GeneratedCode {
    const errors: CodeError[] = [];
    const warnings: CodeWarning[] = [];
    
    // Step 1: Analyze dependencies
    const graph = this.analyzeDependencies(policy);
    
    // Step 2: Check for entry and exit points
    if (graph.entryPoints.length === 0) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Policy has no entry point (no blocks without incoming connections)',
        code: 'NO_ENTRY_POINT',
      });
    }
    
    if (graph.exitPoints.length === 0) {
      warnings.push({
        line: 0,
        column: 0,
        message: 'Policy has no exit point (no blocks without outgoing connections)',
        code: 'NO_EXIT_POINT',
      });
    }
    
    // Step 3: Detect cycles
    const cycles = this.detectCycles(graph);
    if (cycles.length > 0) {
      for (const cycle of cycles) {
        errors.push({
          line: 0,
          column: 0,
          message: cycle.error || 'Circular dependency detected',
          code: 'CIRCULAR_DEPENDENCY',
        });
      }
    }
    
    // Step 4: Topological sort
    const sortResult = this.topologicalSort(graph);
    if (!sortResult.success) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Cannot determine execution order due to circular dependencies',
        code: 'SORT_FAILED',
      });
    }
    
    // If there are critical errors, return early
    if (errors.length > 0) {
      return {
        code: '// Code generation failed due to errors\n// See errors for details',
        imports: [],
        exports: [],
        blockMapping: [],
        syntaxValid: false,
        errors,
        warnings,
      };
    }
    
    // Step 5: Generate imports
    const imports = codeTemplateEngine.generateImports(policy.blocks);
    
    // Step 6: Assemble code
    const assemblyResult = this.assembleCode(policy, sortResult.orderedBlocks);
    
    return {
      code: assemblyResult.code,
      imports,
      exports: [`export default ${policy.name.replace(/[^a-zA-Z0-9]/g, '_')}Policy;`],
      blockMapping: assemblyResult.blockMapping,
      syntaxValid: true,
      errors,
      warnings,
    };
  }
  
  /**
   * Assemble complete policy code from ordered blocks
   */
  private assembleCode(
    policy: VisualPolicy,
    orderedBlocks: PolicyBlock[]
  ): { code: string; blockMapping: BlockCodeMapping[] } {
    const blockMapping: BlockCodeMapping[] = [];
    const policyName = policy.name.replace(/[^a-zA-Z0-9]/g, '_');
    
    // Generate file header
    const header = this.generateFileHeader(policy);
    
    // Generate imports
    const imports = codeTemplateEngine.generateImports(policy.blocks);
    
    // Generate policy function signature
    const functionSignature = this.generateFunctionSignature(policyName);
    
    // Generate block code
    const blockCode = this.generateBlockCode(orderedBlocks, policy.connections, blockMapping);
    
    // Generate error handling wrapper
    const errorHandling = this.generateErrorHandling(blockCode);
    
    // Generate return statement
    const returnStatement = this.generateReturnStatement();
    
    // Assemble complete code
    const code = codeTemplateEngine.cleanupCode(`
${header}

${imports.join('\n')}

${functionSignature}
  try {
${codeTemplateEngine.indent(errorHandling, 2)}
    
${codeTemplateEngine.indent(returnStatement, 2)}
  } catch (error) {
    console.error('Policy execution error:', error);
    return {
      decision: 'deny',
      reason: 'Policy execution failed',
      metadata: { 
        error: error instanceof Error ? error.message : String(error),
        policyName: '${policyName}'
      }
    };
  }
};

export default ${policyName}Policy;
`);
    
    return { code, blockMapping };
  }
  
  /**
   * Generate file header with metadata
   */
  private generateFileHeader(policy: VisualPolicy): string {
    const timestamp = new Date().toISOString();
    return `/**
 * Generated by TealTiger Visual Policy Builder
 * 
 * Policy: ${policy.name}
 * Description: ${policy.description || 'No description'}
 * Generated: ${timestamp}
 * Version: ${policy.version}
 * 
 * This file was automatically generated from a visual policy.
 * Manual modifications may be overwritten when regenerating.
 */`;
  }
  
  /**
   * Generate policy function signature
   */
  private generateFunctionSignature(policyName: string): string {
    return `const ${policyName}Policy: TealTigerPolicy = async (
  context: PolicyContext
): Promise<PolicyDecision> => {`;
  }
  
  /**
   * Generate code for all blocks in execution order
   */
  private generateBlockCode(
    orderedBlocks: PolicyBlock[],
    connections: BlockConnection[],
    blockMapping: BlockCodeMapping[]
  ): string {
    const codeLines: string[] = [];
    let currentLine = 1;
    
    for (const block of orderedBlocks) {
      const definition = getBlockById(block.definitionId);
      if (!definition) {
        codeLines.push(`// ERROR: Block definition not found: ${block.definitionId}`);
        continue;
      }
      
      // Check if this block is part of a conditional branch
      const isConditional = definition.category === 'conditional';
      
      if (isConditional) {
        // Handle conditional blocks specially
        const conditionalCode = this.generateConditionalCode(block, definition, connections, orderedBlocks);
        const startLine = currentLine;
        codeLines.push(conditionalCode);
        const endLine = currentLine + conditionalCode.split('\n').length;
        
        blockMapping.push({
          blockId: block.id,
          startLine,
          endLine,
          code: conditionalCode,
        });
        
        currentLine = endLine;
      } else {
        // Regular block
        const blockCode = codeTemplateEngine.processTemplate(block, definition);
        const startLine = currentLine;
        codeLines.push(blockCode);
        const endLine = currentLine + blockCode.split('\n').length;
        
        blockMapping.push({
          blockId: block.id,
          startLine,
          endLine,
          code: blockCode,
        });
        
        currentLine = endLine;
      }
      
      codeLines.push(''); // Add blank line between blocks
      currentLine++;
    }
    
    return codeLines.join('\n');
  }
  
  /**
   * Generate code for conditional blocks (if/else, switch/case)
   */
  private generateConditionalCode(
    block: PolicyBlock,
    definition: any,
    connections: BlockConnection[],
    allBlocks: PolicyBlock[]
  ): string {
    if (definition.id === 'conditional-if-else') {
      return this.generateIfElseCode(block, definition, connections, allBlocks);
    } else if (definition.id === 'conditional-switch') {
      return this.generateSwitchCode(block, definition, connections, allBlocks);
    }
    
    return '// Unsupported conditional block';
  }
  
  /**
   * Generate if/else conditional code
   */
  private generateIfElseCode(
    block: PolicyBlock,
    definition: any,
    connections: BlockConnection[],
    allBlocks: PolicyBlock[]
  ): string {
    const condition = block.parameters.condition || 'true';
    
    // Find blocks connected to true and false branches
    const trueConnections = connections.filter(
      c => c.sourceBlockId === block.id && c.sourceOutputId === 'true'
    );
    const falseConnections = connections.filter(
      c => c.sourceBlockId === block.id && c.sourceOutputId === 'false'
    );
    
    const comment = codeTemplateEngine.generateBlockComment(block, definition);
    
    let code = `${comment}\nif (${condition}) {\n`;
    
    // Generate code for true branch
    if (trueConnections.length > 0) {
      code += '  // True branch\n';
      for (const conn of trueConnections) {
        const targetBlock = allBlocks.find(b => b.id === conn.targetBlockId);
        if (targetBlock) {
          const targetDef = getBlockById(targetBlock.definitionId);
          if (targetDef) {
            const branchCode = codeTemplateEngine.processTemplate(targetBlock, targetDef);
            code += codeTemplateEngine.indent(branchCode, 1) + '\n';
          }
        }
      }
    }
    
    code += '} else {\n';
    
    // Generate code for false branch
    if (falseConnections.length > 0) {
      code += '  // False branch\n';
      for (const conn of falseConnections) {
        const targetBlock = allBlocks.find(b => b.id === conn.targetBlockId);
        if (targetBlock) {
          const targetDef = getBlockById(targetBlock.definitionId);
          if (targetDef) {
            const branchCode = codeTemplateEngine.processTemplate(targetBlock, targetDef);
            code += codeTemplateEngine.indent(branchCode, 1) + '\n';
          }
        }
      }
    }
    
    code += '}';
    
    return code;
  }
  
  /**
   * Generate switch/case conditional code
   */
  private generateSwitchCode(
    block: PolicyBlock,
    definition: any,
    connections: BlockConnection[],
    allBlocks: PolicyBlock[]
  ): string {
    const variable = block.parameters.variable || 'context.value';
    const cases = (block.parameters.cases || '').split(',').map((c: string) => c.trim()).filter(Boolean);
    
    const comment = codeTemplateEngine.generateBlockComment(block, definition);
    
    let code = `${comment}\nswitch (${variable}) {\n`;
    
    // Generate case statements
    for (const caseValue of cases) {
      code += `  case '${caseValue}':\n`;
      
      // Find blocks connected to this case
      const caseConnections = connections.filter(
        c => c.sourceBlockId === block.id && c.condition === caseValue
      );
      
      for (const conn of caseConnections) {
        const targetBlock = allBlocks.find(b => b.id === conn.targetBlockId);
        if (targetBlock) {
          const targetDef = getBlockById(targetBlock.definitionId);
          if (targetDef) {
            const caseCode = codeTemplateEngine.processTemplate(targetBlock, targetDef);
            code += codeTemplateEngine.indent(caseCode, 2) + '\n';
          }
        }
      }
      
      code += '    break;\n';
    }
    
    // Default case
    code += '  default:\n';
    const defaultConnections = connections.filter(
      c => c.sourceBlockId === block.id && c.sourceOutputId === 'default'
    );
    
    for (const conn of defaultConnections) {
      const targetBlock = allBlocks.find(b => b.id === conn.targetBlockId);
      if (targetBlock) {
        const targetDef = getBlockById(targetBlock.definitionId);
        if (targetDef) {
          const defaultCode = codeTemplateEngine.processTemplate(targetBlock, targetDef);
          code += codeTemplateEngine.indent(defaultCode, 2) + '\n';
        }
      }
    }
    
    code += '    break;\n}';
    
    return code;
  }
  
  /**
   * Generate error handling wrapper
   */
  private generateErrorHandling(blockCode: string): string {
    return blockCode;
  }
  
  /**
   * Generate default return statement
   */
  private generateReturnStatement(): string {
    return `return {
  decision: 'allow',
  metadata: { 
    generatedBy: 'visual-policy-builder',
    timestamp: new Date().toISOString()
  }
};`;
  }
}

/**
 * Singleton instance
 */
export const codeGenerator = new CodeGenerator();

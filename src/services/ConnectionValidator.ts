/**
 * ConnectionValidator - Validates connections between policy blocks
 * 
 * Ensures connections are compatible based on connection point types,
 * data types, and block-specific rules.
 */

import { BlockConnection, PolicyBlock, BlockDefinition } from '../types/visual-policy';
import { getBlockById } from '../data/blockLibrary';

/**
 * Validation result for a connection
 */
export interface ConnectionValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validates a connection between two blocks
 * 
 * @param connection - The connection to validate
 * @param sourceBlock - The source policy block
 * @param targetBlock - The target policy block
 * @returns Validation result with error message if invalid
 */
export function validateConnection(
  connection: BlockConnection,
  sourceBlock: PolicyBlock,
  targetBlock: PolicyBlock
): ConnectionValidationResult {
  // Get block definitions
  const sourceDefinition = getBlockById(sourceBlock.definitionId);
  const targetDefinition = getBlockById(targetBlock.definitionId);

  if (!sourceDefinition || !targetDefinition) {
    return {
      isValid: false,
      error: 'Block definition not found',
    };
  }

  // Find connection points
  const sourceOutput = sourceDefinition.outputs.find(
    (output) => output.id === connection.sourceOutputId
  );
  const targetInput = targetDefinition.inputs.find(
    (input) => input.id === connection.targetInputId
  );

  if (!sourceOutput || !targetInput) {
    return {
      isValid: false,
      error: 'Connection point not found',
    };
  }

  // Validate connection types match
  if (sourceOutput.type !== targetInput.type) {
    return {
      isValid: false,
      error: `Connection type mismatch: ${sourceOutput.type} → ${targetInput.type}`,
    };
  }

  // Validate data types for data connections
  if (sourceOutput.type === 'data' && targetInput.type === 'data') {
    if (sourceOutput.dataType && targetInput.dataType) {
      // Check if data types are compatible
      if (
        sourceOutput.dataType !== targetInput.dataType &&
        sourceOutput.dataType !== 'any' &&
        targetInput.dataType !== 'any'
      ) {
        return {
          isValid: false,
          error: `Data type mismatch: ${sourceOutput.dataType} → ${targetInput.dataType}`,
        };
      }
    }
  }

  // Prevent self-connections
  if (sourceBlock.id === targetBlock.id) {
    return {
      isValid: false,
      error: 'Cannot connect block to itself',
    };
  }

  return {
    isValid: true,
  };
}

/**
 * Validates all connections in a policy
 * 
 * @param connections - All connections in the policy
 * @param blocks - All blocks in the policy
 * @returns Array of validation results for each connection
 */
export function validateAllConnections(
  connections: BlockConnection[],
  blocks: PolicyBlock[]
): Map<string, ConnectionValidationResult> {
  const results = new Map<string, ConnectionValidationResult>();

  connections.forEach((connection) => {
    const sourceBlock = blocks.find((b) => b.id === connection.sourceBlockId);
    const targetBlock = blocks.find((b) => b.id === connection.targetBlockId);

    if (!sourceBlock || !targetBlock) {
      results.set(connection.id, {
        isValid: false,
        error: 'Source or target block not found',
      });
      return;
    }

    const result = validateConnection(connection, sourceBlock, targetBlock);
    results.set(connection.id, result);
  });

  return results;
}

/**
 * Checks if a connection would create a cycle in the graph
 * 
 * @param newConnection - The new connection to check
 * @param existingConnections - Existing connections in the policy
 * @returns True if the connection would create a cycle
 */
export function wouldCreateCycle(
  newConnection: BlockConnection,
  existingConnections: BlockConnection[]
): boolean {
  // Build adjacency list
  const adjacencyList = new Map<string, string[]>();

  // Add existing connections
  existingConnections.forEach((conn) => {
    if (!adjacencyList.has(conn.sourceBlockId)) {
      adjacencyList.set(conn.sourceBlockId, []);
    }
    adjacencyList.get(conn.sourceBlockId)!.push(conn.targetBlockId);
  });

  // Add new connection
  if (!adjacencyList.has(newConnection.sourceBlockId)) {
    adjacencyList.set(newConnection.sourceBlockId, []);
  }
  adjacencyList.get(newConnection.sourceBlockId)!.push(newConnection.targetBlockId);

  // Check for cycle using DFS
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacencyList.get(nodeId) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (hasCycle(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check all nodes
  for (const nodeId of adjacencyList.keys()) {
    if (!visited.has(nodeId)) {
      if (hasCycle(nodeId)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Gets the label for a conditional connection
 * 
 * @param sourceOutputId - The source output ID
 * @returns Label for the connection (e.g., "True", "False")
 */
export function getConditionalLabel(sourceOutputId: string): string | undefined {
  if (sourceOutputId === 'true') return 'True';
  if (sourceOutputId === 'false') return 'False';
  if (sourceOutputId.startsWith('case-')) {
    return sourceOutputId.replace('case-', '').toUpperCase();
  }
  return undefined;
}

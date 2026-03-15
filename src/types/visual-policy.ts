/**
 * Visual Policy Builder Type Definitions
 * 
 * This file contains all TypeScript interfaces and types for the Visual Policy Builder feature.
 * These types define the structure of visual policies, blocks, connections, and code generation.
 * 
 * @module visual-policy
 */

/**
 * Block categories for organizing policy blocks in the library
 */
export type BlockCategory = 
  | 'guards'
  | 'actions'
  | 'routing'
  | 'compliance'
  | 'cost-control'
  | 'conditional'
  | 'utility';

/**
 * Parameter types supported by policy blocks
 */
export type ParameterType = 'string' | 'number' | 'boolean' | 'array' | 'object' | 'enum';

/**
 * Connection point types for block inputs/outputs
 */
export type ConnectionType = 'flow' | 'data';

/**
 * Validation severity levels
 */
export type ValidationSeverity = 'error' | 'warning';

/**
 * Security warning severity levels
 */
export type SecuritySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Security warning categories
 */
export type SecurityCategory = 'malicious-code' | 'data-exposure' | 'privilege-escalation' | 'injection';

/**
 * Validation rules for block parameters
 */
export interface ParameterValidation {
  /** Minimum value for numeric parameters */
  min?: number;
  /** Maximum value for numeric parameters */
  max?: number;
  /** Regex pattern for string validation */
  pattern?: string;
  /** Custom validation function */
  customValidator?: (value: any) => BlockValidationError | null;
}

/**
 * Block parameter definition
 * Defines a configurable parameter for a policy block
 */
export interface BlockParameter {
  /** Parameter identifier */
  name: string;
  /** Parameter data type */
  type: ParameterType;
  /** Human-readable label for UI */
  label: string;
  /** Description of the parameter's purpose */
  description: string;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value if not configured */
  defaultValue?: any;
  /** Validation rules */
  validation?: ParameterValidation;
  
  // UI hints
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Additional help text */
  helpText?: string;
  /** Available options for enum type */
  options?: string[];
}

/**
 * Connection point on a block
 * Defines an input or output connector for block connections
 */
export interface ConnectionPoint {
  /** Unique identifier for the connection point */
  id: string;
  /** Human-readable label */
  label: string;
  /** Type of connection (flow control or data) */
  type: ConnectionType;
  /** Data type for data connections */
  dataType?: string;
  /** Whether this connection is required */
  required: boolean;
}

/**
 * Block definition
 * Defines a reusable policy block type in the library
 */
export interface BlockDefinition {
  /** Unique identifier for the block type */
  id: string;
  /** Human-readable name */
  name: string;
  /** Category for organization */
  category: BlockCategory;
  /** Description of the block's purpose */
  description: string;
  /** Icon identifier or SVG */
  icon: string;
  
  // Parameters
  /** Configurable parameters */
  parameters: BlockParameter[];
  
  // Connections
  /** Input connection points */
  inputs: ConnectionPoint[];
  /** Output connection points */
  outputs: ConnectionPoint[];
  
  // Code generation
  /** Template for generating TypeScript code */
  codeTemplate: string;
  
  // Metadata
  /** Tags for searching and filtering */
  tags: string[];
  /** Compatible LLM providers */
  providers: string[];
  /** Relevant compliance frameworks */
  complianceFrameworks: string[];
  /** Estimated cost impact */
  estimatedCost: number;
  
  // Custom blocks
  /** Whether this is a user-created custom block */
  isCustom: boolean;
  /** User ID of creator (for custom blocks) */
  createdBy?: string;
  /** Version string (for custom blocks) */
  version?: string;
}

/**
 * Policy block instance
 * Represents a specific instance of a block on the canvas
 */
export interface PolicyBlock {
  /** Unique instance identifier */
  id: string;
  /** Reference to the block definition */
  definitionId: string;
  
  // Position on canvas
  /** Canvas position */
  position: { x: number; y: number };
  
  // Configuration
  /** Configured parameter values */
  parameters: Record<string, any>;
  
  // UI state
  /** Whether the block is currently selected */
  selected: boolean;
  /** Whether the block is collapsed */
  collapsed: boolean;
  
  // Validation
  /** Validation errors for this block */
  errors: BlockValidationError[];
  /** Validation warnings for this block */
  warnings: BlockValidationWarning[];
}

/**
 * Connection between blocks
 * Represents a connection line between two blocks on the canvas
 */
export interface BlockConnection {
  /** Unique connection identifier */
  id: string;
  /** Source block ID */
  sourceBlockId: string;
  /** Source output connection point ID */
  sourceOutputId: string;
  /** Target block ID */
  targetBlockId: string;
  /** Target input connection point ID */
  targetInputId: string;
  
  // Conditional connections
  /** Condition for if/else branches */
  condition?: string;
  
  // Validation
  /** Whether the connection is valid */
  isValid: boolean;
  /** Error message if invalid */
  error?: string;
}

/**
 * Visual policy
 * Complete representation of a visual policy including blocks, connections, and metadata
 */
export interface VisualPolicy {
  /** Unique policy identifier */
  id: string;
  /** Workspace ID */
  workspaceId: string;
  /** Policy name */
  name: string;
  /** Policy description */
  description: string;
  
  // Visual structure
  /** Policy blocks on the canvas */
  blocks: PolicyBlock[];
  /** Connections between blocks */
  connections: BlockConnection[];
  
  // Canvas state
  /** Canvas viewport state (position and zoom) */
  viewport: { x: number; y: number; zoom: number };
  
  // Metadata
  /** Policy metadata */
  metadata: PolicyMetadata;
  /** Policy version */
  version: string;
  /** Creator user ID */
  createdBy: string;
  /** Creation timestamp */
  createdAt: Date;
  /** Last update timestamp */
  updatedAt: Date;
  
  // Generation info (if from NL)
  /** Natural language generation metadata */
  generationInfo?: GenerationInfo;
}

/**
 * Policy metadata
 * Extended metadata for visual policies
 */
export interface PolicyMetadata {
  // Existing fields
  /** Policy tags */
  tags: string[];
  /** Policy category */
  category: string;
  /** Compatible providers */
  providers: string[];
  /** Compatible models */
  models: string[];
  /** Estimated cost impact */
  estimatedCost: number;
  /** Test coverage percentage */
  testCoverage: number;
  
  // New fields for no-code
  /** Whether this is a visual policy */
  isVisual: boolean;
  /** Visual policy schema version */
  visualVersion?: string;
  /** Number of blocks in the policy */
  blockCount?: number;
  /** IDs of custom blocks used */
  customBlockIds?: string[];
  
  // NL Generation
  /** Whether generated by AI */
  generatedByAI?: boolean;
  /** Model used for generation */
  generationModel?: string;
  /** Cost of generation */
  generationCost?: number;
  
  // Wizard
  /** Whether created by wizard */
  createdByWizard?: boolean;
  /** Type of wizard used */
  wizardType?: string;
}

/**
 * Natural language generation metadata
 * Information about AI-generated policies
 */
export interface GenerationInfo {
  /** Original natural language prompt */
  originalPrompt: string;
  /** Model used for generation */
  model: string;
  /** Tokens consumed */
  tokensUsed: number;
  /** Cost in USD */
  cost: number;
  /** Number of refinement iterations */
  iterations: number;
  /** Generation timestamp */
  generatedAt: Date;
}

/**
 * Block validation error
 * Represents a validation error for a block or connection
 */
export interface BlockValidationError {
  /** Block ID if error is block-specific */
  blockId?: string;
  /** Connection ID if error is connection-specific */
  connectionId?: string;
  /** Error message */
  message: string;
  /** Severity level */
  severity: 'error';
  /** Whether the error can be auto-fixed */
  autoFixable: boolean;
  /** Auto-fix function if available */
  autoFix?: () => void;
}

/**
 * Block validation warning
 * Represents a validation warning for a block
 */
export interface BlockValidationWarning {
  /** Block ID if warning is block-specific */
  blockId?: string;
  /** Warning message */
  message: string;
  /** Severity level */
  severity: 'warning';
  /** Suggestion for resolving the warning */
  suggestion?: string;
}

/**
 * Policy validation result
 * Complete validation result for a visual policy
 */
export interface PolicyValidationResult {
  /** Whether the policy is valid */
  isValid: boolean;
  /** List of validation errors */
  errors: BlockValidationError[];
  /** List of validation warnings */
  warnings: BlockValidationWarning[];
  
  // Specific checks
  /** Whether policy has at least one entry point */
  hasEntryPoint: boolean;
  /** Whether policy has at least one exit point */
  hasExitPoint: boolean;
  /** Whether all blocks are connected */
  allBlocksConnected: boolean;
  /** Whether all required parameters are configured */
  allParametersConfigured: boolean;
}

/**
 * Code error
 * Represents a syntax or semantic error in generated code
 */
export interface CodeError {
  /** Line number where error occurs */
  line: number;
  /** Column number where error occurs */
  column: number;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
}

/**
 * Code warning
 * Represents a warning in generated code
 */
export interface CodeWarning {
  /** Line number where warning occurs */
  line: number;
  /** Column number where warning occurs */
  column: number;
  /** Warning message */
  message: string;
  /** Warning code */
  code?: string;
}

/**
 * Block code mapping
 * Maps a block to its generated code location
 */
export interface BlockCodeMapping {
  /** Block ID */
  blockId: string;
  /** Starting line number in generated code */
  startLine: number;
  /** Ending line number in generated code */
  endLine: number;
  /** Generated code snippet */
  code: string;
}

/**
 * Generated code
 * Result of code generation from a visual policy
 */
export interface GeneratedCode {
  /** Generated TypeScript code */
  code: string;
  /** Required import statements */
  imports: string[];
  /** Export statements */
  exports: string[];
  
  // Source mapping for debugging
  /** Mapping of blocks to code locations */
  blockMapping: BlockCodeMapping[];
  
  // Validation
  /** Whether the generated code is syntactically valid */
  syntaxValid: boolean;
  /** Syntax or semantic errors */
  errors: CodeError[];
  /** Code warnings */
  warnings: CodeWarning[];
}

/**
 * Visual policy JSON export format
 * Serialization format for exporting visual policies
 */
export interface VisualPolicyJSON {
  /** Schema version */
  version: string;
  /** Visual policy data */
  policy: VisualPolicy;
  /** Custom block definitions used in the policy */
  customBlocks: BlockDefinition[];
}

/**
 * Unsupported code pattern
 * Represents a code pattern that cannot be converted to visual blocks
 */
export interface UnsupportedPattern {
  /** Line number where pattern occurs */
  line: number;
  /** Code snippet */
  code: string;
  /** Reason why pattern is unsupported */
  reason: string;
}

/**
 * Parse result
 * Result of parsing TypeScript code into visual blocks
 */
export interface ParseResult {
  /** Whether parsing was successful */
  success: boolean;
  /** Parsed visual policy (if successful) */
  policy?: VisualPolicy;
  /** Unsupported patterns found */
  unsupportedPatterns: UnsupportedPattern[];
  /** Parsing warnings */
  warnings: string[];
}

/**
 * Security warning
 * Represents a security concern in generated code
 */
export interface SecurityWarning {
  /** Severity level */
  severity: SecuritySeverity;
  /** Security category */
  category: SecurityCategory;
  /** Warning message */
  message: string;
  /** Code snippet causing the warning */
  codeSnippet?: string;
  /** Recommendation for fixing */
  recommendation: string;
}

/**
 * Custom block definition
 * Definition for creating a custom block
 */
export interface CustomBlockDefinition extends Omit<BlockDefinition, 'isCustom'> {
  /** Workspace ID where the custom block belongs */
  workspaceId: string;
  /** User ID of creator */
  createdBy: string;
  /** Version string */
  version: string;
  /** Creation timestamp */
  createdAt?: Date;
  /** Last update timestamp */
  updatedAt?: Date;
  /** Whether the block is public (shared with workspace) */
  isPublic?: boolean;
}

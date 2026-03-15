// Policy validation utilities
// Requirements: 3.4

import type { PolicyMetadata } from '../types/policy';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates policy metadata structure and values
 * Requirements: 3.4
 */
export function validatePolicyMetadata(metadata: PolicyMetadata): ValidationResult {
  const errors: string[] = [];

  // Validate tags
  if (!Array.isArray(metadata.tags)) {
    errors.push('Tags must be an array');
  } else {
    if (metadata.tags.some(tag => typeof tag !== 'string')) {
      errors.push('All tags must be strings');
    }
    if (metadata.tags.some(tag => tag.trim().length === 0)) {
      errors.push('Tags cannot be empty strings');
    }
    if (metadata.tags.length > 20) {
      errors.push('Maximum 20 tags allowed');
    }
  }

  // Validate category
  if (typeof metadata.category !== 'string') {
    errors.push('Category must be a string');
  } else if (metadata.category.trim().length === 0) {
    errors.push('Category cannot be empty');
  } else if (metadata.category.length > 100) {
    errors.push('Category must be less than 100 characters');
  }

  // Validate providers
  if (!Array.isArray(metadata.providers)) {
    errors.push('Providers must be an array');
  } else {
    const validProviders = [
      'openai',
      'anthropic',
      'gemini',
      'bedrock',
      'azure-openai',
      'cohere',
      'mistral'
    ];
    
    if (metadata.providers.some(p => typeof p !== 'string')) {
      errors.push('All providers must be strings');
    }
    
    const invalidProviders = metadata.providers.filter(
      p => !validProviders.includes(p.toLowerCase())
    );
    if (invalidProviders.length > 0) {
      errors.push(`Invalid providers: ${invalidProviders.join(', ')}`);
    }
  }

  // Validate models
  if (!Array.isArray(metadata.models)) {
    errors.push('Models must be an array');
  } else {
    if (metadata.models.some(m => typeof m !== 'string')) {
      errors.push('All models must be strings');
    }
    if (metadata.models.some(m => m.trim().length === 0)) {
      errors.push('Models cannot be empty strings');
    }
  }

  // Validate estimatedCost
  if (typeof metadata.estimatedCost !== 'number') {
    errors.push('Estimated cost must be a number');
  } else if (metadata.estimatedCost < 0) {
    errors.push('Estimated cost cannot be negative');
  } else if (!Number.isFinite(metadata.estimatedCost)) {
    errors.push('Estimated cost must be a finite number');
  }

  // Validate testCoverage
  if (typeof metadata.testCoverage !== 'number') {
    errors.push('Test coverage must be a number');
  } else if (metadata.testCoverage < 0 || metadata.testCoverage > 100) {
    errors.push('Test coverage must be between 0 and 100');
  } else if (!Number.isFinite(metadata.testCoverage)) {
    errors.push('Test coverage must be a finite number');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates semantic version format (major.minor.patch)
 * Requirements: 3.2
 */
export function validateSemanticVersion(version: string): ValidationResult {
  const errors: string[] = [];

  if (typeof version !== 'string') {
    errors.push('Version must be a string');
    return { valid: false, errors };
  }

  const semverRegex = /^(\d+)\.(\d+)\.(\d+)$/;
  const match = version.match(semverRegex);

  if (!match) {
    errors.push('Version must follow semantic versioning format (major.minor.patch)');
    return { valid: false, errors };
  }

  const [, major, minor, patch] = match;
  
  // Validate each part is a valid number
  if (parseInt(major) < 0 || parseInt(minor) < 0 || parseInt(patch) < 0) {
    errors.push('Version numbers cannot be negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates policy name
 * Requirements: 3.10
 */
export function validatePolicyName(name: string): ValidationResult {
  const errors: string[] = [];

  if (typeof name !== 'string') {
    errors.push('Policy name must be a string');
    return { valid: false, errors };
  }

  if (name.trim().length === 0) {
    errors.push('Policy name cannot be empty');
  }

  if (name.length < 3) {
    errors.push('Policy name must be at least 3 characters');
  }

  if (name.length > 100) {
    errors.push('Policy name must be less than 100 characters');
  }

  // Check for valid characters (alphanumeric, spaces, hyphens, underscores)
  const validNameRegex = /^[a-zA-Z0-9\s\-_]+$/;
  if (!validNameRegex.test(name)) {
    errors.push('Policy name can only contain letters, numbers, spaces, hyphens, and underscores');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates policy code
 * Requirements: 3.1
 */
export function validatePolicyCode(code: string): ValidationResult {
  const errors: string[] = [];

  if (typeof code !== 'string') {
    errors.push('Policy code must be a string');
    return { valid: false, errors };
  }

  if (code.trim().length === 0) {
    errors.push('Policy code cannot be empty');
  }

  // Check for reasonable size (max 1MB)
  const maxSize = 1024 * 1024; // 1MB
  if (code.length > maxSize) {
    errors.push(`Policy code exceeds maximum size of ${maxSize} bytes`);
  }

  // Basic syntax check - ensure it's valid JavaScript/TypeScript
  try {
    // Try to parse as JavaScript (basic check)
    new Function(code);
  } catch (e) {
    errors.push(`Policy code contains syntax errors: ${(e as Error).message}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Creates default metadata for new policies
 */
export function createDefaultMetadata(): PolicyMetadata {
  return {
    tags: [],
    category: 'general',
    providers: [],
    models: [],
    estimatedCost: 0,
    testCoverage: 0
  };
}

/**
 * Sanitizes metadata by removing invalid values
 */
export function sanitizeMetadata(metadata: Partial<PolicyMetadata>): PolicyMetadata {
  return {
    tags: Array.isArray(metadata.tags) 
      ? metadata.tags.filter(t => typeof t === 'string' && t.trim().length > 0).slice(0, 20)
      : [],
    category: typeof metadata.category === 'string' && metadata.category.trim().length > 0
      ? metadata.category.trim().slice(0, 100)
      : 'general',
    providers: Array.isArray(metadata.providers)
      ? metadata.providers.filter(p => typeof p === 'string' && p.trim().length > 0)
      : [],
    models: Array.isArray(metadata.models)
      ? metadata.models.filter(m => typeof m === 'string' && m.trim().length > 0)
      : [],
    estimatedCost: typeof metadata.estimatedCost === 'number' && Number.isFinite(metadata.estimatedCost) && metadata.estimatedCost >= 0
      ? metadata.estimatedCost
      : 0,
    testCoverage: typeof metadata.testCoverage === 'number' && Number.isFinite(metadata.testCoverage) && metadata.testCoverage >= 0 && metadata.testCoverage <= 100
      ? metadata.testCoverage
      : 0
  };
}

import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { SessionState } from '../../types';

const VERSION = 'v1';
const MAX_URL_LENGTH = 2000;

export interface EncodedState {
  encoded: string;
  truncated: boolean;
  originalSize: number;
  compressedSize: number;
}

/**
 * URLStateEncoder - Encodes and decodes session state for URL sharing
 * 
 * Uses lz-string compression to minimize URL length while preserving
 * all session data including policy code and scenarios.
 */
export class URLStateEncoder {
  /**
   * Encode session state to URL-safe compressed string
   */
  encode(state: SessionState): EncodedState {
    const json = JSON.stringify(state);
    const originalSize = json.length;
    
    // Compress using lz-string
    const compressed = compressToEncodedURIComponent(json);
    const compressedSize = compressed.length;
    
    // Prepend version identifier
    const encoded = `${VERSION}:${compressed}`;
    
    // Check if URL would be too long
    const truncated = encoded.length > MAX_URL_LENGTH;
    
    if (truncated) {
      // Try truncating scenarios to fit within limit
      const truncatedState = this.truncateState(state);
      const truncatedJson = JSON.stringify(truncatedState);
      const truncatedCompressed = compressToEncodedURIComponent(truncatedJson);
      const truncatedEncoded = `${VERSION}:${truncatedCompressed}`;
      
      return {
        encoded: truncatedEncoded,
        truncated: true,
        originalSize,
        compressedSize: truncatedEncoded.length,
      };
    }
    
    return {
      encoded,
      truncated: false,
      originalSize,
      compressedSize,
    };
  }

  /**
   * Decode URL-safe compressed string to session state
   */
  decode(encoded: string): SessionState {
    // Extract version and compressed data
    const parts = encoded.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encoded state format');
    }

    const [version, compressed] = parts;
    
    // Validate version
    if (version !== VERSION) {
      throw new Error(`Unsupported version: ${version}. Expected ${VERSION}`);
    }

    // Decompress
    const json = decompressFromEncodedURIComponent(compressed);
    if (!json) {
      throw new Error('Failed to decompress state');
    }

    // Parse JSON
    const state = JSON.parse(json);
    
    // Validate state structure
    this.validateSessionState(state);
    
    return state;
  }

  /**
   * Estimate the encoded size of a session state
   */
  estimateEncodedSize(state: SessionState): number {
    const json = JSON.stringify(state);
    const compressed = compressToEncodedURIComponent(json);
    return VERSION.length + 1 + compressed.length; // +1 for colon separator
  }

  /**
   * Check if a session state would exceed URL length limit
   */
  wouldExceedLimit(state: SessionState): boolean {
    return this.estimateEncodedSize(state) > MAX_URL_LENGTH;
  }

  /**
   * Truncate state to fit within URL length limit
   * Strategy: Remove scenarios one by one until it fits
   */
  private truncateState(state: SessionState): SessionState {
    const truncated: SessionState = {
      ...state,
      scenarios: [],
      metadata: {
        ...state.metadata,
        truncated: true,
      },
    };

    // Try to include as many scenarios as possible
    for (const scenario of state.scenarios) {
      const testState = {
        ...truncated,
        scenarios: [...truncated.scenarios, scenario],
      };

      if (this.estimateEncodedSize(testState) <= MAX_URL_LENGTH) {
        truncated.scenarios.push(scenario);
      } else {
        break;
      }
    }

    return truncated;
  }

  /**
   * Validate session state structure
   */
  private validateSessionState(state: any): void {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state: must be an object');
    }

    if (!state.version || typeof state.version !== 'string') {
      throw new Error('Invalid state: missing or invalid "version" field');
    }

    if (!state.policyCode || typeof state.policyCode !== 'string') {
      throw new Error('Invalid state: missing or invalid "policyCode" field');
    }

    if (!Array.isArray(state.scenarios)) {
      throw new Error('Invalid state: "scenarios" must be an array');
    }

    if (!state.metadata || typeof state.metadata !== 'object') {
      throw new Error('Invalid state: missing or invalid "metadata" field');
    }

    if (typeof state.metadata.timestamp !== 'number') {
      throw new Error('Invalid state: metadata.timestamp must be a number');
    }

    if (!state.metadata.sdkVersion || typeof state.metadata.sdkVersion !== 'string') {
      throw new Error('Invalid state: missing or invalid metadata.sdkVersion');
    }
  }
}

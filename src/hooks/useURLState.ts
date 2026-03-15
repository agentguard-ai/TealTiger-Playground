import { useEffect, useCallback } from 'react';
import { URLStateEncoder } from '../core/url/URLStateEncoder';
import type { SessionState } from '../types';

const encoder = new URLStateEncoder();

/**
 * Hook for managing URL state synchronization
 * 
 * Reads state from URL hash on mount and provides methods
 * to update the URL with current session state.
 */
export const useURLState = () => {
  /**
   * Load session state from URL hash
   */
  const loadFromURL = useCallback((): SessionState | null => {
    try {
      const hash = window.location.hash.slice(1); // Remove '#' prefix
      if (!hash) {
        return null;
      }

      const state = encoder.decode(hash);
      return state;
    } catch (error) {
      console.error('Failed to load state from URL:', error);
      return null;
    }
  }, []);

  /**
   * Save session state to URL hash
   */
  const saveToURL = useCallback((state: SessionState): { success: boolean; truncated: boolean; url: string } => {
    try {
      const { encoded, truncated } = encoder.encode(state);
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      
      // Update URL without triggering navigation
      window.history.replaceState(null, '', url);
      
      return { success: true, truncated, url };
    } catch (error) {
      console.error('Failed to save state to URL:', error);
      return { success: false, truncated: false, url: '' };
    }
  }, []);

  /**
   * Copy shareable URL to clipboard
   */
  const copyShareableURL = useCallback(async (state: SessionState): Promise<{ success: boolean; truncated: boolean; url: string }> => {
    try {
      const { encoded, truncated } = encoder.encode(state);
      const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
      
      // Copy to clipboard
      await navigator.clipboard.writeText(url);
      
      return { success: true, truncated, url };
    } catch (error) {
      console.error('Failed to copy URL to clipboard:', error);
      return { success: false, truncated: false, url: '' };
    }
  }, []);

  /**
   * Check if current state would exceed URL limit
   */
  const wouldExceedLimit = useCallback((state: SessionState): boolean => {
    return encoder.wouldExceedLimit(state);
  }, []);

  /**
   * Estimate encoded size of state
   */
  const estimateSize = useCallback((state: SessionState): number => {
    return encoder.estimateEncodedSize(state);
  }, []);

  return {
    loadFromURL,
    saveToURL,
    copyShareableURL,
    wouldExceedLimit,
    estimateSize,
  };
};

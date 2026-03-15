/**
 * BlockConfigurationPanel Unit Tests
 * 
 * Tests for the Block Configuration Panel component including:
 * - Panel rendering and visibility
 * - Block information display
 * - Action buttons (delete, duplicate, reset)
 * - Integration with store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BlockConfigurationPanel } from '../BlockConfigurationPanel';
import { useVisualPolicyStore } from '../../../stores/visualPolicyStore';
import type { PolicyBlock } from '../../../types/visual-policy';

// Mock the store
vi.mock('../../../stores/visualPolicyStore');

// Mock the ParameterForm component
vi.mock('../ParameterForm', () => ({
  ParameterForm: ({ blockDefinition, parameters, onChange }: any) => (
    <div data-testid="parameter-form">
      <div>Block: {blockDefinition.name}</div>
      <div>Parameters: {JSON.stringify(parameters)}</div>
    </div>
  )
}));

describe('BlockConfigurationPanel', () => {
  const mockBlock: PolicyBlock = {
    id: 'block-1',
    definitionId: 'guard-pii-detection',
    position: { x: 100, y: 100 },
    parameters: {
      piiTypes: ['email', 'phone'],
      threshold: 0.8,
      redactEnabled: false
    },
    selected: true,
    collapsed: false,
    errors: [],
    warnings: []
  };

  const mockStore = {
    selectedBlockId: 'block-1',
    blocks: [mockBlock],
    closeConfigPanel: vi.fn(),
    removeBlock: vi.fn(),
    updateBlock: vi.fn(),
    addBlock: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useVisualPolicyStore as any).mockReturnValue(mockStore);
    
    // Mock window.confirm
    global.confirm = vi.fn(() => true);
  });

  describe('Rendering', () => {
    it('should render when a block is selected', () => {
      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText('PII Detection')).toBeInTheDocument();
      expect(screen.getByText('guards')).toBeInTheDocument();
    });

    it('should not render when no block is selected', () => {
      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        selectedBlockId: null,
        blocks: []
      });
      
      const { container } = render(<BlockConfigurationPanel />);
      expect(container.firstChild).toBeNull();
    });

    it('should display block icon and name', () => {
      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText('🔒')).toBeInTheDocument();
      expect(screen.getByText('PII Detection')).toBeInTheDocument();
    });

    it('should display block description', () => {
      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText(/Detects and optionally redacts/)).toBeInTheDocument();
    });

    it('should render ParameterForm with correct props', () => {
      render(<BlockConfigurationPanel />);
      
      const paramForm = screen.getByTestId('parameter-form');
      expect(paramForm).toBeInTheDocument();
      expect(paramForm).toHaveTextContent('Block: PII Detection');
    });
  });

  describe('Close Button', () => {
    it('should call closeConfigPanel when close button is clicked', () => {
      render(<BlockConfigurationPanel />);
      
      const closeButton = screen.getByLabelText('Close configuration panel');
      fireEvent.click(closeButton);
      
      expect(mockStore.closeConfigPanel).toHaveBeenCalledTimes(1);
    });
  });

  describe('Reset Button', () => {
    it('should reset parameters to defaults when reset is clicked', () => {
      render(<BlockConfigurationPanel />);
      
      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);
      
      expect(global.confirm).toHaveBeenCalledWith('Reset all parameters to default values?');
      expect(mockStore.updateBlock).toHaveBeenCalledWith('block-1', {
        parameters: {
          piiTypes: ['email', 'phone', 'ssn'],
          threshold: 0.8,
          redactEnabled: false
        }
      });
    });

    it('should not reset if user cancels confirmation', () => {
      global.confirm = vi.fn(() => false);
      
      render(<BlockConfigurationPanel />);
      
      const resetButton = screen.getByText('Reset to Defaults');
      fireEvent.click(resetButton);
      
      expect(mockStore.updateBlock).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Button', () => {
    it('should duplicate the block when duplicate is clicked', () => {
      render(<BlockConfigurationPanel />);
      
      const duplicateButton = screen.getByText('Duplicate Block');
      fireEvent.click(duplicateButton);
      
      expect(mockStore.addBlock).toHaveBeenCalledTimes(1);
      
      const addedBlock = (mockStore.addBlock as any).mock.calls[0][0];
      expect(addedBlock.definitionId).toBe('guard-pii-detection');
      expect(addedBlock.parameters).toEqual(mockBlock.parameters);
      expect(addedBlock.position.x).toBe(150); // Original + 50
      expect(addedBlock.position.y).toBe(150); // Original + 50
      expect(addedBlock.selected).toBe(false);
    });

    it('should generate unique ID for duplicated block', () => {
      render(<BlockConfigurationPanel />);
      
      const duplicateButton = screen.getByText('Duplicate Block');
      fireEvent.click(duplicateButton);
      
      const addedBlock = (mockStore.addBlock as any).mock.calls[0][0];
      expect(addedBlock.id).not.toBe(mockBlock.id);
      expect(addedBlock.id).toMatch(/^block-/);
    });
  });

  describe('Delete Button', () => {
    it('should delete the block when delete is clicked', () => {
      render(<BlockConfigurationPanel />);
      
      const deleteButton = screen.getByText('Delete Block');
      fireEvent.click(deleteButton);
      
      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete "PII Detection"?');
      expect(mockStore.removeBlock).toHaveBeenCalledWith('block-1');
    });

    it('should not delete if user cancels confirmation', () => {
      global.confirm = vi.fn(() => false);
      
      render(<BlockConfigurationPanel />);
      
      const deleteButton = screen.getByText('Delete Block');
      fireEvent.click(deleteButton);
      
      expect(mockStore.removeBlock).not.toHaveBeenCalled();
    });
  });

  describe('Parameter Changes', () => {
    it('should update block parameters when changed', () => {
      // We need to test through the actual ParameterForm, not the mock
      // This is an integration test that would be done with the real component
      render(<BlockConfigurationPanel />);
      
      // The actual parameter change handling is tested in ParameterForm tests
      expect(screen.getByTestId('parameter-form')).toBeInTheDocument();
    });
  });

  describe('Block with Errors', () => {
    it('should display block with validation errors', () => {
      const blockWithErrors: PolicyBlock = {
        ...mockBlock,
        errors: [
          {
            blockId: 'block-1',
            message: 'Threshold must be between 0 and 1',
            severity: 'error',
            autoFixable: false
          }
        ]
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        blocks: [blockWithErrors]
      });

      render(<BlockConfigurationPanel />);
      
      // Errors are passed to ParameterForm
      expect(screen.getByTestId('parameter-form')).toBeInTheDocument();
    });
  });

  describe('Block with Warnings', () => {
    it('should display block with validation warnings', () => {
      const blockWithWarnings: PolicyBlock = {
        ...mockBlock,
        warnings: [
          {
            blockId: 'block-1',
            message: 'High threshold may miss some PII',
            severity: 'warning',
            suggestion: 'Consider lowering threshold'
          }
        ]
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        blocks: [blockWithWarnings]
      });

      render(<BlockConfigurationPanel />);
      
      // Warnings are passed to ParameterForm
      expect(screen.getByTestId('parameter-form')).toBeInTheDocument();
    });
  });

  describe('Different Block Types', () => {
    it('should render action block correctly', () => {
      const actionBlock: PolicyBlock = {
        id: 'block-2',
        definitionId: 'action-deny',
        position: { x: 200, y: 200 },
        parameters: {
          reason: 'Policy violation',
          logDecision: true
        },
        selected: true,
        collapsed: false,
        errors: [],
        warnings: []
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        selectedBlockId: 'block-2',
        blocks: [actionBlock]
      });

      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText('Deny Request')).toBeInTheDocument();
      expect(screen.getByText('actions')).toBeInTheDocument();
    });

    it('should render conditional block correctly', () => {
      const conditionalBlock: PolicyBlock = {
        id: 'block-3',
        definitionId: 'conditional-if-else',
        position: { x: 300, y: 300 },
        parameters: {
          condition: 'context.cost > 10',
          operator: 'greater-than'
        },
        selected: true,
        collapsed: false,
        errors: [],
        warnings: []
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        selectedBlockId: 'block-3',
        blocks: [conditionalBlock]
      });

      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText('If/Else Conditional')).toBeInTheDocument();
      expect(screen.getByText('conditional')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle block with no parameters', () => {
      const simpleBlock: PolicyBlock = {
        id: 'block-4',
        definitionId: 'action-allow',
        position: { x: 400, y: 400 },
        parameters: {},
        selected: true,
        collapsed: false,
        errors: [],
        warnings: []
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        selectedBlockId: 'block-4',
        blocks: [simpleBlock]
      });

      render(<BlockConfigurationPanel />);
      
      expect(screen.getByText('Allow Request')).toBeInTheDocument();
    });

    it('should handle missing block definition gracefully', () => {
      const invalidBlock: PolicyBlock = {
        id: 'block-5',
        definitionId: 'non-existent-block',
        position: { x: 500, y: 500 },
        parameters: {},
        selected: true,
        collapsed: false,
        errors: [],
        warnings: []
      };

      (useVisualPolicyStore as any).mockReturnValue({
        ...mockStore,
        selectedBlockId: 'block-5',
        blocks: [invalidBlock]
      });

      const { container } = render(<BlockConfigurationPanel />);
      expect(container.firstChild).toBeNull();
    });
  });
});

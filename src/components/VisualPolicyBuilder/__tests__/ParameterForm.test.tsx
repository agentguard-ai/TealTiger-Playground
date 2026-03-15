/**
 * ParameterForm Unit Tests
 * 
 * Tests for the dynamic parameter form system including:
 * - Rendering different parameter types
 * - Input validation
 * - Error and warning display
 * - Multi-select functionality
 * - Conditional block configuration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ParameterForm } from '../ParameterForm';
import type { BlockDefinition, BlockParameter } from '../../../types/visual-policy';
import { piiDetectionBlock, ifElseBlock } from '../../../data/blockLibrary';

describe('ParameterForm', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Empty Parameters', () => {
    it('should display message when block has no parameters', () => {
      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: []
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('This block has no configurable parameters.')).toBeInTheDocument();
    });
  });

  describe('String Parameters', () => {
    it('should render text input for string parameter', () => {
      const stringParam: BlockParameter = {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'Enter a message',
        required: true,
        placeholder: 'Type here...'
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [stringParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ message: 'Hello' }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const input = screen.getByPlaceholderText('Type here...') as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('text');
      expect(input.value).toBe('Hello');
    });

    it('should call onChange when string input changes', () => {
      const stringParam: BlockParameter = {
        name: 'message',
        type: 'string',
        label: 'Message',
        description: 'Enter a message',
        required: true
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [stringParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const input = screen.getByLabelText(/Message/);
      fireEvent.change(input, { target: { value: 'New message' } });

      expect(mockOnChange).toHaveBeenCalledWith('message', 'New message');
    });
  });

  describe('Number Parameters', () => {
    it('should render number input for number parameter', () => {
      const numberParam: BlockParameter = {
        name: 'threshold',
        type: 'number',
        label: 'Threshold',
        description: 'Set threshold',
        required: true,
        defaultValue: 0.8,
        validation: { min: 0, max: 1 }
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [numberParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ threshold: 0.8 }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const input = screen.getByLabelText(/Threshold/) as HTMLInputElement;
      expect(input).toBeInTheDocument();
      expect(input.type).toBe('number');
      expect(input.value).toBe('0.8');
      expect(input.min).toBe('0');
      expect(input.max).toBe('1');
    });

    it('should call onChange with number when number input changes', () => {
      const numberParam: BlockParameter = {
        name: 'threshold',
        type: 'number',
        label: 'Threshold',
        description: 'Set threshold',
        required: true
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [numberParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const input = screen.getByLabelText(/Threshold/);
      fireEvent.change(input, { target: { value: '0.9' } });

      expect(mockOnChange).toHaveBeenCalledWith('threshold', 0.9);
    });
  });

  describe('Boolean Parameters', () => {
    it('should render checkbox for boolean parameter', () => {
      const boolParam: BlockParameter = {
        name: 'enabled',
        type: 'boolean',
        label: 'Enabled',
        description: 'Enable feature',
        required: false,
        defaultValue: false
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [boolParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ enabled: true }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const checkbox = screen.getByRole('checkbox') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(true);
      expect(screen.getByText('Enabled')).toBeInTheDocument();
    });

    it('should call onChange when checkbox is toggled', () => {
      const boolParam: BlockParameter = {
        name: 'enabled',
        type: 'boolean',
        label: 'Enabled',
        description: 'Enable feature',
        required: false,
        defaultValue: false
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [boolParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ enabled: false }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith('enabled', true);
    });
  });

  describe('Enum Parameters', () => {
    it('should render select dropdown for enum parameter', () => {
      const enumParam: BlockParameter = {
        name: 'level',
        type: 'enum',
        label: 'Level',
        description: 'Select level',
        required: true,
        options: ['low', 'medium', 'high']
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [enumParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ level: 'medium' }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const select = screen.getByLabelText(/Level/) as HTMLSelectElement;
      expect(select).toBeInTheDocument();
      expect(select.value).toBe('medium');
      
      const options = within(select).getAllByRole('option');
      expect(options).toHaveLength(4); // Including "Select an option..."
    });

    it('should call onChange when select option changes', () => {
      const enumParam: BlockParameter = {
        name: 'level',
        type: 'enum',
        label: 'Level',
        description: 'Select level',
        required: true,
        options: ['low', 'medium', 'high']
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [enumParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const select = screen.getByLabelText(/Level/);
      fireEvent.change(select, { target: { value: 'high' } });

      expect(mockOnChange).toHaveBeenCalledWith('level', 'high');
    });
  });

  describe('Array Parameters (Multi-Select)', () => {
    it('should render multi-select for array parameter', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ piiTypes: ['email', 'phone'] }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const button = screen.getByText(/2 selected: email, phone/);
      expect(button).toBeInTheDocument();
    });

    it('should show dropdown when multi-select is clicked', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ piiTypes: [] }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const button = screen.getByText(/Select options.../);
      fireEvent.click(button);

      expect(screen.getByText('email')).toBeInTheDocument();
      expect(screen.getByText('phone')).toBeInTheDocument();
      expect(screen.getByText('ssn')).toBeInTheDocument();
    });

    it('should toggle options when clicked', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ piiTypes: [] }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const button = screen.getByText(/Select options.../);
      fireEvent.click(button);

      const emailCheckbox = screen.getByLabelText('email');
      fireEvent.click(emailCheckbox);

      expect(mockOnChange).toHaveBeenCalledWith('piiTypes', ['email']);
    });
  });

  describe('Required Parameters', () => {
    it('should show asterisk for required parameters', () => {
      const requiredParam: BlockParameter = {
        name: 'required',
        type: 'string',
        label: 'Required Field',
        description: 'This is required',
        required: true
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [requiredParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('should show error for empty required field', () => {
      const requiredParam: BlockParameter = {
        name: 'required',
        type: 'string',
        label: 'Required Field',
        description: 'This is required',
        required: true
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [requiredParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('This field is required')).toBeInTheDocument();
    });
  });

  describe('Validation Errors', () => {
    it('should display validation errors', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ threshold: 1.5 }}
          onChange={mockOnChange}
          errors={[
            {
              blockId: 'block-1',
              message: 'Threshold must be between 0 and 1',
              severity: 'error',
              autoFixable: false
            }
          ]}
          warnings={[]}
        />
      );

      expect(screen.getByText('Threshold must be between 0 and 1')).toBeInTheDocument();
    });

    it('should apply error styling to inputs with errors', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ threshold: 1.5 }}
          onChange={mockOnChange}
          errors={[
            {
              blockId: 'block-1',
              message: 'Threshold must be between 0 and 1',
              severity: 'error',
              autoFixable: false
            }
          ]}
          warnings={[]}
        />
      );

      const input = screen.getByLabelText(/Detection Threshold/);
      expect(input).toHaveClass('border-red-300');
    });
  });

  describe('Validation Warnings', () => {
    it('should display validation warnings', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{ threshold: 0.95 }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[
            {
              blockId: 'block-1',
              message: 'High threshold may miss some PII',
              severity: 'warning',
              suggestion: 'Consider lowering threshold'
            }
          ]}
        />
      );

      expect(screen.getByText('High threshold may miss some PII')).toBeInTheDocument();
    });
  });

  describe('Help Text', () => {
    it('should display help icon for parameters with help text', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      // Help icons should be present for parameters with helpText
      const helpIcons = screen.getAllByRole('img', { hidden: true });
      expect(helpIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Conditional Block Configuration', () => {
    it('should render ConditionalBlockConfig for conditional blocks', () => {
      render(
        <ParameterForm
          blockDefinition={ifElseBlock}
          parameters={{ condition: 'context.cost > 10' }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      expect(screen.getByText('Condition Builder')).toBeInTheDocument();
    });

    it('should not render standard condition input for conditional blocks', () => {
      render(
        <ParameterForm
          blockDefinition={ifElseBlock}
          parameters={{ condition: 'context.cost > 10' }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      // The condition parameter should be handled by ConditionalBlockConfig
      // and not rendered as a standard input
      const inputs = screen.queryAllByRole('textbox');
      const conditionInput = inputs.find(input => 
        input.getAttribute('placeholder') === 'e.g., context.cost > 10'
      );
      expect(conditionInput).toBeUndefined();
    });
  });

  describe('Default Values', () => {
    it('should use default value when parameter value is undefined', () => {
      render(
        <ParameterForm
          blockDefinition={piiDetectionBlock}
          parameters={{}}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const thresholdInput = screen.getByLabelText(/Detection Threshold/) as HTMLInputElement;
      expect(thresholdInput.value).toBe('0.8'); // Default value
    });
  });

  describe('Object Parameters', () => {
    it('should render textarea for object parameter', () => {
      const objectParam: BlockParameter = {
        name: 'config',
        type: 'object',
        label: 'Configuration',
        description: 'JSON configuration',
        required: false,
        placeholder: '{}'
      };

      const blockDef: BlockDefinition = {
        ...piiDetectionBlock,
        parameters: [objectParam]
      };

      render(
        <ParameterForm
          blockDefinition={blockDef}
          parameters={{ config: { key: 'value' } }}
          onChange={mockOnChange}
          errors={[]}
          warnings={[]}
        />
      );

      const textarea = screen.getByLabelText(/Configuration/) as HTMLTextAreaElement;
      expect(textarea).toBeInTheDocument();
      expect(textarea.value).toContain('"key"');
      expect(textarea.value).toContain('"value"');
    });
  });
});

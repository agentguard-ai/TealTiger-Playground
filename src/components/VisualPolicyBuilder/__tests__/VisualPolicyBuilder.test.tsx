import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisualPolicyBuilder } from '../index';

describe('VisualPolicyBuilder', () => {
  it('should render without crashing', () => {
    const { container } = render(<VisualPolicyBuilder />);
    expect(container).toBeTruthy();
  });

  it('should render React Flow canvas', () => {
    const { container } = render(<VisualPolicyBuilder />);
    // React Flow adds a specific class to its container
    const reactFlowElement = container.querySelector('.react-flow');
    expect(reactFlowElement).toBeTruthy();
  });

  it('should render with dark theme styling', () => {
    const { container } = render(<VisualPolicyBuilder />);
    const wrapper = container.querySelector('.bg-gray-900');
    expect(wrapper).toBeTruthy();
  });
});

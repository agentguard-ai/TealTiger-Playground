/**
 * BlockLibrary Component Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BlockLibrary } from '../BlockLibrary';
import { BLOCK_LIBRARY } from '../../../data/blockLibrary';

describe('BlockLibrary', () => {
  it('renders block library with header', () => {
    render(<BlockLibrary />);
    expect(screen.getByText('Block Library')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search blocks...')).toBeInTheDocument();
  });

  it('displays all block categories', () => {
    render(<BlockLibrary />);
    
    expect(screen.getByText('Guards')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
    expect(screen.getByText('Routing')).toBeInTheDocument();
    expect(screen.getByText('Cost Control')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
    expect(screen.getByText('Conditional')).toBeInTheDocument();
    expect(screen.getByText('Utility')).toBeInTheDocument();
  });

  it('shows correct block count', () => {
    render(<BlockLibrary />);
    
    // Should show total blocks available
    expect(screen.getByText(`${BLOCK_LIBRARY.length} blocks available`)).toBeInTheDocument();
  });

  it('expands and collapses categories', () => {
    render(<BlockLibrary />);
    
    const guardsButton = screen.getByRole('button', { name: /Guards/ });
    
    // Guards should be expanded by default
    expect(screen.getByText('PII Detection')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(guardsButton);
    expect(screen.queryByText('PII Detection')).not.toBeInTheDocument();
    
    // Click to expand again
    fireEvent.click(guardsButton);
    expect(screen.getByText('PII Detection')).toBeInTheDocument();
  });

  it('filters blocks by search query', () => {
    render(<BlockLibrary />);
    
    const searchInput = screen.getByPlaceholderText('Search blocks...');
    
    // Search for "PII"
    fireEvent.change(searchInput, { target: { value: 'PII' } });
    
    expect(screen.getByText('PII Detection')).toBeInTheDocument();
    expect(screen.queryByText('Prompt Injection Detection')).not.toBeInTheDocument();
  });

  it('clears search query', () => {
    render(<BlockLibrary />);
    
    const searchInput = screen.getByPlaceholderText('Search blocks...');
    
    // Enter search
    fireEvent.change(searchInput, { target: { value: 'PII' } });
    expect(searchInput).toHaveValue('PII');
    
    // Clear search
    const clearButton = screen.getByRole('button', { name: '' });
    fireEvent.click(clearButton);
    expect(searchInput).toHaveValue('');
  });

  it('filters blocks by provider', () => {
    render(<BlockLibrary />);
    
    const providerSelect = screen.getByRole('combobox', { name: '' });
    
    // Select OpenAI
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    
    // All blocks should support OpenAI
    expect(screen.getByText(/blocks available/)).toBeInTheDocument();
  });

  it('filters blocks by compliance framework', () => {
    render(<BlockLibrary />);
    
    const complianceSelects = screen.getAllByRole('combobox');
    const complianceSelect = complianceSelects[1]; // Second select is compliance
    
    // Select GDPR
    fireEvent.change(complianceSelect, { target: { value: 'GDPR' } });
    
    // Should show only GDPR-compliant blocks
    expect(screen.getByText('PII Detection')).toBeInTheDocument();
  });

  it('clears all filters', () => {
    render(<BlockLibrary />);
    
    const searchInput = screen.getByPlaceholderText('Search blocks...');
    const providerSelect = screen.getAllByRole('combobox')[0];
    
    // Apply filters
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.change(providerSelect, { target: { value: 'openai' } });
    
    // Clear filters
    const clearButton = screen.getByText('Clear filters');
    fireEvent.click(clearButton);
    
    expect(searchInput).toHaveValue('');
    expect(providerSelect).toHaveValue('');
  });

  it('shows no results message when no blocks match', () => {
    render(<BlockLibrary />);
    
    const searchInput = screen.getByPlaceholderText('Search blocks...');
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No blocks found matching your criteria')).toBeInTheDocument();
  });

  it('calls onBlockDragStart when dragging a block', () => {
    const onDragStart = vi.fn();
    render(<BlockLibrary onBlockDragStart={onDragStart} />);
    
    // Find a block card
    const blockCard = screen.getByText('PII Detection').closest('div[draggable="true"]');
    
    // Simulate drag start
    if (blockCard) {
      fireEvent.dragStart(blockCard);
      expect(onDragStart).toHaveBeenCalled();
    }
  });

  it('calls onBlockDragEnd when drag ends', () => {
    const onDragEnd = vi.fn();
    render(<BlockLibrary onBlockDragEnd={onDragEnd} />);
    
    // Find a block card
    const blockCard = screen.getByText('PII Detection').closest('div[draggable="true"]');
    
    // Simulate drag end
    if (blockCard) {
      fireEvent.dragEnd(blockCard);
      expect(onDragEnd).toHaveBeenCalled();
    }
  });

  it('displays category descriptions when expanded', () => {
    render(<BlockLibrary />);
    
    // Guards is expanded by default
    expect(screen.getByText('Security and content detection blocks')).toBeInTheDocument();
  });

  it('shows block count per category', () => {
    render(<BlockLibrary />);
    
    // Should show count for each category
    expect(screen.getByText(/\(7\)/)).toBeInTheDocument(); // Guards
    expect(screen.getByText(/\(6\)/)).toBeInTheDocument(); // Actions
  });

  it('displays drag instruction in footer', () => {
    render(<BlockLibrary />);
    
    expect(screen.getByText('Drag blocks to the canvas to build your policy')).toBeInTheDocument();
  });
});

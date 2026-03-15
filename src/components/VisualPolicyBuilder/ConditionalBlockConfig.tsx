/**
 * Conditional Block Configuration Component
 * 
 * Special configuration UI for If/Else and Switch/Case blocks.
 * Provides a condition builder with comparison operators and logical operators.
 * 
 * @module components/VisualPolicyBuilder/ConditionalBlockConfig
 */

import React, { useState } from 'react';
import { Plus, Trash2, AlertCircle } from 'lucide-react';

/**
 * Comparison operators for conditions
 */
const COMPARISON_OPERATORS = [
  { value: 'equals', label: 'Equals (==)', symbol: '==' },
  { value: 'not-equals', label: 'Not Equals (!=)', symbol: '!=' },
  { value: 'greater-than', label: 'Greater Than (>)', symbol: '>' },
  { value: 'less-than', label: 'Less Than (<)', symbol: '<' },
  { value: 'greater-or-equal', label: 'Greater or Equal (>=)', symbol: '>=' },
  { value: 'less-or-equal', label: 'Less or Equal (<=)', symbol: '<=' },
  { value: 'contains', label: 'Contains', symbol: 'contains' },
  { value: 'matches', label: 'Matches (regex)', symbol: 'matches' }
];

/**
 * Logical operators for combining conditions
 */
const LOGICAL_OPERATORS = [
  { value: 'AND', label: 'AND (all must be true)' },
  { value: 'OR', label: 'OR (any must be true)' }
];

/**
 * Single condition in the builder
 */
interface Condition {
  id: string;
  leftOperand: string;
  operator: string;
  rightOperand: string;
}

/**
 * Condition group with logical operator
 */
interface ConditionGroup {
  conditions: Condition[];
  logicalOperator: 'AND' | 'OR';
}

interface ConditionalBlockConfigProps {
  blockType: 'if-else' | 'switch-case';
  condition: string;
  onChange: (condition: string) => void;
}

/**
 * ConditionalBlockConfig Component
 * 
 * Provides a visual condition builder for conditional blocks.
 */
export const ConditionalBlockConfig: React.FC<ConditionalBlockConfigProps> = ({
  blockType,
  condition,
  onChange
}) => {
  if (blockType === 'switch-case') {
    return <SwitchCaseConfig condition={condition} onChange={onChange} />;
  }
  
  return <IfElseConfig condition={condition} onChange={onChange} />;
};

/**
 * If/Else Condition Builder
 */
const IfElseConfig: React.FC<{ condition: string; onChange: (condition: string) => void }> = ({
  condition,
  onChange
}) => {
  const [conditionGroup, setConditionGroup] = useState<ConditionGroup>(() => 
    parseConditionString(condition)
  );
  
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  /**
   * Add a new condition to the group
   */
  const addCondition = () => {
    const newCondition: Condition = {
      id: `cond-${Date.now()}`,
      leftOperand: '',
      operator: 'equals',
      rightOperand: ''
    };
    
    const newGroup = {
      ...conditionGroup,
      conditions: [...conditionGroup.conditions, newCondition]
    };
    
    setConditionGroup(newGroup);
    updateConditionString(newGroup);
  };
  
  /**
   * Remove a condition from the group
   */
  const removeCondition = (id: string) => {
    const newGroup = {
      ...conditionGroup,
      conditions: conditionGroup.conditions.filter(c => c.id !== id)
    };
    
    setConditionGroup(newGroup);
    updateConditionString(newGroup);
  };
  
  /**
   * Update a condition
   */
  const updateCondition = (id: string, updates: Partial<Condition>) => {
    const newGroup = {
      ...conditionGroup,
      conditions: conditionGroup.conditions.map(c =>
        c.id === id ? { ...c, ...updates } : c
      )
    };
    
    setConditionGroup(newGroup);
    updateConditionString(newGroup);
  };
  
  /**
   * Update logical operator
   */
  const updateLogicalOperator = (operator: 'AND' | 'OR') => {
    const newGroup = {
      ...conditionGroup,
      logicalOperator: operator
    };
    
    setConditionGroup(newGroup);
    updateConditionString(newGroup);
  };
  
  /**
   * Convert condition group to string and call onChange
   */
  const updateConditionString = (group: ConditionGroup) => {
    const conditionStr = buildConditionString(group);
    onChange(conditionStr);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Condition Builder</h4>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          {showAdvanced ? 'Hide' : 'Show'} Advanced
        </button>
      </div>
      
      {/* Conditions */}
      <div className="space-y-3">
        {conditionGroup.conditions.map((cond, index) => (
          <div key={cond.id} className="space-y-2">
            {index > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={conditionGroup.logicalOperator}
                  onChange={(e) => updateLogicalOperator(e.target.value as 'AND' | 'OR')}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 border border-blue-300 rounded"
                >
                  {LOGICAL_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.value}</option>
                  ))}
                </select>
              </div>
            )}
            
            <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex-1 grid grid-cols-3 gap-2">
                {/* Left Operand */}
                <input
                  type="text"
                  value={cond.leftOperand}
                  onChange={(e) => updateCondition(cond.id, { leftOperand: e.target.value })}
                  placeholder="context.cost"
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                
                {/* Operator */}
                <select
                  value={cond.operator}
                  onChange={(e) => updateCondition(cond.id, { operator: e.target.value })}
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {COMPARISON_OPERATORS.map(op => (
                    <option key={op.value} value={op.value}>{op.symbol}</option>
                  ))}
                </select>
                
                {/* Right Operand */}
                <input
                  type="text"
                  value={cond.rightOperand}
                  onChange={(e) => updateCondition(cond.id, { rightOperand: e.target.value })}
                  placeholder="10"
                  className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              {conditionGroup.conditions.length > 1 && (
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                  aria-label="Remove condition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Add Condition Button */}
      <button
        onClick={addCondition}
        className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add Condition
      </button>
      
      {/* Condition Summary */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs font-medium text-blue-700 mb-1">Condition Summary:</p>
        <code className="text-xs text-blue-900 break-all">
          {buildConditionString(conditionGroup) || 'No conditions defined'}
        </code>
      </div>
      
      {/* Advanced Mode */}
      {showAdvanced && (
        <div className="space-y-2">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Raw Condition (Advanced)</span>
            <textarea
              value={condition}
              onChange={(e) => onChange(e.target.value)}
              placeholder="context.cost > 10 && context.provider === 'openai'"
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </label>
          <div className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>Advanced mode allows direct JavaScript expressions. Use with caution.</span>
          </div>
        </div>
      )}
      
      {/* Help Text */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>Common variables:</p>
        <ul className="list-disc list-inside ml-2 space-y-0.5">
          <li><code className="bg-gray-100 px-1 rounded">context.cost</code> - Current request cost</li>
          <li><code className="bg-gray-100 px-1 rounded">context.provider</code> - LLM provider name</li>
          <li><code className="bg-gray-100 px-1 rounded">context.model</code> - Model name</li>
          <li><code className="bg-gray-100 px-1 rounded">context.userId</code> - User identifier</li>
        </ul>
      </div>
    </div>
  );
};

/**
 * Switch/Case Configuration
 */
const SwitchCaseConfig: React.FC<{ condition: string; onChange: (condition: string) => void }> = ({
  condition,
  onChange
}) => {
  const [variable, setVariable] = useState(() => {
    const match = condition.match(/switch\s*\((.*?)\)/);
    return match ? match[1].trim() : '';
  });
  
  const [cases, setCases] = useState<string[]>(() => {
    const match = condition.match(/cases:\s*\[(.*?)\]/);
    if (match) {
      return match[1].split(',').map(c => c.trim().replace(/['"]/g, ''));
    }
    return [];
  });
  
  const updateSwitch = (newVariable: string, newCases: string[]) => {
    setVariable(newVariable);
    setCases(newCases);
    
    const conditionStr = `switch(${newVariable}) { cases: [${newCases.map(c => `'${c}'`).join(', ')}] }`;
    onChange(conditionStr);
  };
  
  const addCase = () => {
    const newCases = [...cases, ''];
    updateSwitch(variable, newCases);
  };
  
  const removeCase = (index: number) => {
    const newCases = cases.filter((_, i) => i !== index);
    updateSwitch(variable, newCases);
  };
  
  const updateCase = (index: number, value: string) => {
    const newCases = [...cases];
    newCases[index] = value;
    updateSwitch(variable, newCases);
  };
  
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-700">Switch/Case Configuration</h4>
      
      {/* Variable */}
      <div>
        <label className="block">
          <span className="text-sm font-medium text-gray-700">Variable to Switch On</span>
          <input
            type="text"
            value={variable}
            onChange={(e) => updateSwitch(e.target.value, cases)}
            placeholder="context.provider"
            className="mt-1 w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </label>
        <p className="mt-1 text-xs text-gray-500">
          The variable whose value will determine which case to execute
        </p>
      </div>
      
      {/* Cases */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Case Values</label>
        {cases.map((caseValue, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={caseValue}
              onChange={(e) => updateCase(index, e.target.value)}
              placeholder={`Case ${index + 1}`}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => removeCase(index)}
              className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
              aria-label="Remove case"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        
        <button
          onClick={addCase}
          className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Case
        </button>
      </div>
      
      {/* Summary */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs font-medium text-blue-700 mb-1">Switch Summary:</p>
        <code className="text-xs text-blue-900 break-all">
          {variable && cases.length > 0
            ? `switch(${variable}) { ${cases.map(c => `case '${c}'`).join(', ')}, default }`
            : 'Configure variable and cases'}
        </code>
      </div>
    </div>
  );
};

/**
 * Parse condition string into condition group
 */
function parseConditionString(conditionStr: string): ConditionGroup {
  // Simple parser - in production, use a proper expression parser
  const defaultGroup: ConditionGroup = {
    conditions: [{
      id: `cond-${Date.now()}`,
      leftOperand: '',
      operator: 'equals',
      rightOperand: ''
    }],
    logicalOperator: 'AND'
  };
  
  if (!conditionStr || conditionStr.trim() === '') {
    return defaultGroup;
  }
  
  // Try to detect logical operator
  const hasAnd = conditionStr.includes('&&');
  const hasOr = conditionStr.includes('||');
  
  if (!hasAnd && !hasOr) {
    // Single condition
    const parsed = parseSingleCondition(conditionStr);
    if (parsed) {
      return {
        conditions: [parsed],
        logicalOperator: 'AND'
      };
    }
  }
  
  return defaultGroup;
}

/**
 * Parse a single condition expression
 */
function parseSingleCondition(expr: string): Condition | null {
  const operators = ['===', '!==', '==', '!=', '>=', '<=', '>', '<'];
  
  for (const op of operators) {
    if (expr.includes(op)) {
      const parts = expr.split(op).map(p => p.trim());
      if (parts.length === 2) {
        return {
          id: `cond-${Date.now()}`,
          leftOperand: parts[0],
          operator: mapOperatorToValue(op),
          rightOperand: parts[1].replace(/['"]/g, '')
        };
      }
    }
  }
  
  return null;
}

/**
 * Map operator symbol to value
 */
function mapOperatorToValue(op: string): string {
  const mapping: Record<string, string> = {
    '===': 'equals',
    '==': 'equals',
    '!==': 'not-equals',
    '!=': 'not-equals',
    '>': 'greater-than',
    '<': 'less-than',
    '>=': 'greater-or-equal',
    '<=': 'less-or-equal'
  };
  return mapping[op] || 'equals';
}

/**
 * Build condition string from condition group
 */
function buildConditionString(group: ConditionGroup): string {
  if (group.conditions.length === 0) {
    return '';
  }
  
  const conditionStrings = group.conditions
    .filter(c => c.leftOperand && c.rightOperand)
    .map(c => {
      const op = COMPARISON_OPERATORS.find(o => o.value === c.operator);
      const symbol = op?.symbol || '==';
      
      // Add quotes if right operand is not a number
      const rightOp = isNaN(Number(c.rightOperand)) 
        ? `'${c.rightOperand}'` 
        : c.rightOperand;
      
      if (symbol === 'contains') {
        return `${c.leftOperand}.includes(${rightOp})`;
      } else if (symbol === 'matches') {
        return `/${c.rightOperand}/.test(${c.leftOperand})`;
      } else {
        return `${c.leftOperand} ${symbol} ${rightOp}`;
      }
    });
  
  if (conditionStrings.length === 0) {
    return '';
  }
  
  const logicalOp = group.logicalOperator === 'AND' ? '&&' : '||';
  return conditionStrings.join(` ${logicalOp} `);
}

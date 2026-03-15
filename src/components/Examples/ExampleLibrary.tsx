import React, { useState } from 'react';
import { examples, type ExamplePolicy } from '../../examples';

interface ExampleLibraryProps {
  onSelectExample: (example: ExamplePolicy) => void;
  selectedExampleId?: string;
}

export const ExampleLibrary: React.FC<ExampleLibraryProps> = ({
  onSelectExample,
  selectedExampleId,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All', icon: '📚' },
    { id: 'security', name: 'Security', icon: '🔒' },
    { id: 'cost', name: 'Cost', icon: '💰' },
    { id: 'routing', name: 'Routing', icon: '🔀' },
    { id: 'compliance', name: 'Compliance', icon: '📋' },
  ];

  const difficulties = [
    { id: 'all', name: 'All Levels' },
    { id: 'beginner', name: 'Beginner' },
    { id: 'intermediate', name: 'Intermediate' },
    { id: 'advanced', name: 'Advanced' },
  ];

  const filteredExamples = examples.filter((example) => {
    const categoryMatch =
      selectedCategory === 'all' || example.category === selectedCategory;
    const difficultyMatch =
      selectedDifficulty === 'all' || example.difficulty === selectedDifficulty;
    return categoryMatch && difficultyMatch;
  });

  const difficultyColors = {
    beginner: 'bg-green-100 text-green-800',
    intermediate: 'bg-yellow-100 text-yellow-800',
    advanced: 'bg-red-100 text-red-800',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Example Policies</h2>
        <p className="text-sm text-gray-600">
          Select an example to load policy code and test scenarios
        </p>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-4">
        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Difficulty</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            {difficulties.map((difficulty) => (
              <option key={difficulty.id} value={difficulty.id}>
                {difficulty.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Examples List */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredExamples.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No examples match the selected filters</p>
          </div>
        ) : (
          filteredExamples.map((example) => (
            <ExampleCard
              key={example.id}
              example={example}
              isSelected={selectedExampleId === example.id}
              onSelect={() => onSelectExample(example)}
              difficultyColor={difficultyColors[example.difficulty]}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface ExampleCardProps {
  example: ExamplePolicy;
  isSelected: boolean;
  onSelect: () => void;
  difficultyColor: string;
}

const ExampleCard: React.FC<ExampleCardProps> = ({
  example,
  isSelected,
  onSelect,
  difficultyColor,
}) => {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? 'border-teal-500 bg-teal-50'
          : 'border-gray-200 bg-white hover:border-teal-300 hover:bg-gray-50'
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900">{example.name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${difficultyColor}`}>
          {example.difficulty}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-3">{example.description}</p>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {example.scenarios.length} scenarios
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          {example.category}
        </span>
      </div>
    </button>
  );
};

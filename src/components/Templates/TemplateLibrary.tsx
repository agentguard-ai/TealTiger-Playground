// Template Library Component
// Displays policy templates with category filtering and search

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { policyTemplateService } from '../../services/PolicyTemplateService';
import type { PolicyTemplate } from '../../types/policy-template';
import { TemplateCard } from './TemplateCard.tsx';
import { usePlaygroundStore } from '../../store/playgroundStore';

export const TemplateLibrary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<PolicyTemplate | null>(null);
  const navigate = useNavigate();
  const { setPolicyCode } = usePlaygroundStore();

  const handleUseTemplate = (template: PolicyTemplate) => {
    // Generate code with default parameter values
    try {
      const defaults: Record<string, unknown> = {};
      template.parameters.forEach(p => {
        defaults[p.name] = p.defaultValue;
      });
      const code = policyTemplateService.customizeTemplate(template.id, defaults);
      setPolicyCode(code);
      navigate('/');
    } catch {
      // Fallback: use raw template code
      setPolicyCode(template.code);
      navigate('/');
    }
  };

  const categories = useMemo(() => {
    return ['all', ...policyTemplateService.getCategories()];
  }, []);

  const templates = useMemo(() => {
    let filtered = policyTemplateService.listTemplates();

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = policyTemplateService.getTemplatesByCategory(selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = policyTemplateService.searchTemplates(searchQuery);
    }

    return filtered;
  }, [selectedCategory, searchQuery]);

  const templateCounts = useMemo(() => {
    return policyTemplateService.getTemplateCountByCategory();
  }, []);

  return (
    <div className="template-library">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Policy Template Library
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Choose from {templates.length} enterprise-ready policy templates
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg 
                     bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => {
            const count = category === 'all' 
              ? policyTemplateService.listTemplates().length 
              : templateCounts[category] || 0;
            
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
                <span className="ml-2 text-sm opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Template Grid */}
      {templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onSelect={() => handleUseTemplate(template)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No templates found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Try adjusting your search or filters
          </p>
        </div>
      )}
    </div>
  );
};

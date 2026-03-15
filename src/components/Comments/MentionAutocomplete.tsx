// MentionAutocomplete - Autocomplete for @mentions
// Requirements: 6.6

import React, { useState, useEffect } from 'react';

interface MentionAutocompleteProps {
  content: string;
  onSelect: (username: string) => void;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  content,
  onSelect,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Check if user is typing @mention
    const lastAtIndex = content.lastIndexOf('@');
    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    const textAfterAt = content.slice(lastAtIndex + 1);
    const hasSpace = textAfterAt.includes(' ');
    
    if (hasSpace) {
      setShowSuggestions(false);
      return;
    }

    // In a real implementation, fetch matching users from API
    // For now, show placeholder
    if (textAfterAt.length > 0) {
      setSuggestions([`${textAfterAt}...`]);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [content]);

  if (!showSuggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="absolute z-10 mt-1 w-48 bg-white border border-gray-300 rounded-md shadow-lg">
      {suggestions.map((username, index) => (
        <button
          key={index}
          type="button"
          onClick={() => {
            onSelect(username);
            setShowSuggestions(false);
          }}
          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100"
        >
          @{username}
        </button>
      ))}
    </div>
  );
};


import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Sparkles, Lightbulb, History } from 'lucide-react';

interface SmartSuggestionsProps {
  userInterests: string[];
  onSuggestionClick: (suggestion: string) => void;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({ 
  userInterests, 
  onSuggestionClick 
}) => {
  // Generate suggestions based on user interests
  const generateSuggestions = () => {
    const suggestionTemplates = [
      "What are the latest developments in {topic}?",
      "How does {topic} impact the future of work?",
      "Compare different approaches to {topic}",
      "What are the ethical considerations of {topic}?",
      "How can {topic} be applied to solve real-world problems?",
      "Summarize the current state of research in {topic}"
    ];
    
    const suggestions: string[] = [];
    
    // Use user interests to create personalized suggestions
    const availableInterests = userInterests.length > 0 
      ? userInterests 
      : ['technology', 'science', 'business'];
      
    // Generate 4-6 suggestions
    const numSuggestions = Math.min(Math.max(4, availableInterests.length), 6);
    
    for (let i = 0; i < numSuggestions; i++) {
      const template = suggestionTemplates[i % suggestionTemplates.length];
      const interest = availableInterests[i % availableInterests.length];
      suggestions.push(template.replace('{topic}', interest));
    }
    
    return suggestions;
  };
  
  const suggestions = generateSuggestions();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="mb-8"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-400" />
        <h3 className="text-sm font-medium text-gray-300">Personalized Suggestions</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {suggestions.map((suggestion, index) => (
          <motion.div 
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
          >
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-2.5 text-sm border-white/5 bg-white/5 hover:bg-white/10"
              onClick={() => onSuggestionClick(suggestion)}
            >
              <span className="truncate">{suggestion}</span>
            </Button>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SmartSuggestions;

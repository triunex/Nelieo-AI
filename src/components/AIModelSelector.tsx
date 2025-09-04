
import React from 'react';
import { Button } from './ui/button';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem
} from './ui/dropdown-menu';

interface AIModelSelectorProps {
  selectedModel: string;
  onChange: (value: 'Gemini 1.5 Flash') => void;
}

const AIModelSelector: React.FC<AIModelSelectorProps> = ({ selectedModel, onChange }) => {
  const getModelName = (value: string) => {
    switch (value) {
      case 'Gemini 1.5 Flash':
        return 'Gemini 1.5 Flash';
      default:
        return 'Select Model';
    }
  };
  
  const getModelIcon = (value: string) => {
    switch (value) {
      case 'Gemini 1.5 Flash':
        return '🚀'; // Rocket for Gemini
      default:
        return '🤖';
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="flex items-center gap-2 bg-white/5 border-white/10 hover:bg-white/10"
        >
          <span className="mr-1">{getModelIcon(selectedModel)}</span>
          <span>{getModelName(selectedModel)}</span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-gray-900 border border-white/10"
      >
        <DropdownMenuRadioGroup value={selectedModel} onValueChange={(value: any) => onChange(value)}>
          <DropdownMenuRadioItem 
            value="Gemini 1.5 Flash"
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>🔍</span>
              <div>
                <p className="text-sm font-medium">Gemini 1.5 Flash</p>
                <p className="text-xs text-gray-400">Fast, cost-effective</p>
              </div>
            </div>
            {selectedModel === 'Gemini 1.5 Flash' && <Check className="h-4 w-4" />}
          </DropdownMenuRadioItem>
          
          <DropdownMenuRadioItem 
            value="gpt-4.1"
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>💪</span>
              <div>
                <p className="text-sm font-medium">GPT-4.1</p>
                <p className="text-xs text-gray-400">Advanced reasoning</p>
              </div>
            </div>
            {selectedModel === 'gpt-4.1' && <Check className="h-4 w-4" />}
          </DropdownMenuRadioItem>
          
          <DropdownMenuRadioItem 
            value="gpt-4o"
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span>🧠</span>
              <div>
                <p className="text-sm font-medium">GPT-4o</p>
                <p className="text-xs text-gray-400">Most capable, multimodal</p>
              </div>
            </div>
            {selectedModel === 'gpt-4o' && <Check className="h-4 w-4" />}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AIModelSelector;

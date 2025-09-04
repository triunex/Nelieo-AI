
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface PasswordStrengthMeterProps {
  strength: number; // 0-100
  label?: string;
}

const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ 
  strength, 
  label 
}) => {
  const getColorClass = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getLabel = () => {
    if (label) return label;
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Moderate';
    if (strength < 90) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="w-full space-y-2">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">Password Strength</span>
        <span className={`font-medium ${strength < 30 ? 'text-red-500' : ''} ${strength >= 30 && strength < 60 ? 'text-yellow-500' : ''} ${strength >= 60 ? 'text-green-500' : ''}`}>
          {getLabel()}
        </span>
      </div>
      <Progress 
        value={strength} 
        indicatorClassName={getColorClass()}
        className="h-1.5 bg-white/10"
      />
    </div>
  );
};

export default PasswordStrengthMeter;

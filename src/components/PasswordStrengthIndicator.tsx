
import React, { useMemo } from 'react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

const PasswordStrengthIndicator = ({ password }: PasswordStrengthIndicatorProps) => {
  const strength = useMemo(() => {
    if (!password) return 0;
    
    let score = 0;
    
    // Length check
    if (password.length > 5) score += 1;
    if (password.length > 8) score += 1;
    
    // Character variety checks
    if (/[A-Z]/.test(password)) score += 1; // Has uppercase
    if (/[a-z]/.test(password)) score += 1; // Has lowercase
    if (/[0-9]/.test(password)) score += 1; // Has number
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special char
    
    // Normalize to 0-100
    return Math.min(Math.floor(score / 6 * 100), 100);
  }, [password]);
  
  const getColor = () => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const getLabel = () => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Moderate';
    if (strength < 90) return 'Strong';
    return 'Very Strong';
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex justify-between text-xs mb-1">
        <span>Password Strength</span>
        <span className={`
          ${strength < 30 ? 'text-red-500' : ''}
          ${strength >= 30 && strength < 60 ? 'text-yellow-500' : ''}
          ${strength >= 60 ? 'text-green-500' : ''}
        `}>
          {getLabel()}
        </span>
      </div>
      <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor()} transition-all duration-300`} 
          style={{ width: `${strength}%` }}
        />
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;

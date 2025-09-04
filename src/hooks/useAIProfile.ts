
import { useState, useEffect } from 'react';

type UserRole = 'student' | 'developer' | 'researcher' | 'writer' | 'marketer' | 'founder' | 'designer' | string;

interface UserPreferences {
  role: UserRole;
  writingStyle: string;
  learningStyle: string;
  experienceLevel: 'beginner' | 'intermediate' | 'expert';
}

export function useAIProfile() {
  const [userPreferences, setUserPreferences] = useState<UserPreferences | null>(null);
  const [userInterests, setUserInterests] = useState<string[]>([]);
  
  useEffect(() => {
    // Load user preferences from localStorage
    const savedPreferences = localStorage.getItem('cognix_user_preferences');
    if (savedPreferences) {
      try {
        setUserPreferences(JSON.parse(savedPreferences));
      } catch (err) {
        console.error('Failed to parse user preferences:', err);
      }
    }
    
    // Load user interests from localStorage
    const savedInterests = localStorage.getItem('cognix_user_interests');
    if (savedInterests) {
      try {
        setUserInterests(JSON.parse(savedInterests));
      } catch (err) {
        console.error('Failed to parse user interests:', err);
      }
    } else {
      // Set some default interests if none are found
      setUserInterests(['technology', 'science', 'artificial intelligence']);
    }
  }, []);
  
  const updatePreferences = (newPreferences: UserPreferences) => {
    setUserPreferences(newPreferences);
    localStorage.setItem('cognix_user_preferences', JSON.stringify(newPreferences));
  };
  
  const updateInterests = (newInterests: string[]) => {
    setUserInterests(newInterests);
    localStorage.setItem('cognix_user_interests', JSON.stringify(newInterests));
  };
  
  return {
    userPreferences,
    userInterests,
    updatePreferences,
    updateInterests
  };
}

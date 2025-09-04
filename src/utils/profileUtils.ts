
/**
 * Utility functions for handling profile data
 */

interface UserProfile {
  full_name?: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  location?: string;
  website?: string;
  company?: string;
  job_title?: string;
  skills?: string[];
  date_joined?: string;
  [key: string]: any;
}

/**
 * Safely get profile data with type checking
 */
export const safeProfileData = (data: any): UserProfile => {
  if (!data || typeof data !== 'object') {
    return {};
  }
  
  // Create a safe copy with type checking
  const safeData: UserProfile = {};
  
  // Handle string fields
  const stringFields: (keyof UserProfile)[] = [
    'full_name', 'username', 'email', 'avatar_url', 
    'bio', 'location', 'website', 'company', 'job_title'
  ];
  
  stringFields.forEach(field => {
    if (typeof data[field] === 'string') {
      safeData[field] = data[field];
    }
  });
  
  // Handle array fields
  if (Array.isArray(data.skills)) {
    safeData.skills = data.skills;
  }
  
  // Handle date fields
  if (typeof data.date_joined === 'string') {
    safeData.date_joined = data.date_joined;
  }
  
  return safeData;
};

/**
 * Calculate profile completion percentage
 */
export const calculateProfileCompletion = (profile: UserProfile): number => {
  const totalFields = 9; // Count of important profile fields
  let completedFields = 0;
  
  const fieldsToCheck: (keyof UserProfile)[] = [
    'full_name', 'username', 'email', 'avatar_url', 
    'bio', 'location', 'company', 'job_title', 'skills'
  ];
  
  fieldsToCheck.forEach(field => {
    if (field === 'skills') {
      if (Array.isArray(profile.skills) && profile.skills.length > 0) {
        completedFields++;
      }
    } else if (profile[field] && String(profile[field]).trim() !== '') {
      completedFields++;
    }
  });
  
  return Math.round((completedFields / totalFields) * 100);
};

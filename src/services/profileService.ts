
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

// Local storage key for profile data in demo mode
const PROFILE_STORAGE_KEY = 'cognix_user_profile';

// Helper function for demo mode
const getLocalProfile = () => {
  try {
    const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY);
    return savedProfile ? JSON.parse(savedProfile) : null;
  } catch (error) {
    console.error("Error reading profile from localStorage:", error);
    return null;
  }
};

// Helper function to save profile in demo mode
const saveLocalProfile = (profile) => {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (error) {
    console.error("Error saving profile to localStorage:", error);
    return false;
  }
};

export const fetchUserProfile = async (userId) => {
  // For demo mode or when Supabase is not configured
  if (!isSupabaseConfigured()) {
    return getLocalProfile();
  }
  
  try {
    // Fetch from Supabase
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) throw error;
    
    // If no profile exists yet in Supabase but we have a local one, use that
    if (!data) {
      const localProfile = getLocalProfile();
      if (localProfile) {
        // Try to create the profile in Supabase
        await supabase.from('profiles').insert({
          id: userId,
          ...localProfile
        });
        return localProfile;
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return getLocalProfile(); // Fallback to local storage
  }
};

export const saveUserProfile = async (userId, profileData) => {
  // Always save to local storage for demo mode
  saveLocalProfile(profileData);
  
  // If Supabase is not configured, we're done
  if (!isSupabaseConfigured()) {
    return { success: true };
  }
  
  try {
    // Save to Supabase
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...profileData,
        updated_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error("Error saving user profile:", error);
    return { success: false, error };
  }
};

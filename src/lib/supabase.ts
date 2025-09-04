
import { supabase as supabaseClient, isSupabaseConfigured as isConfigured } from '@/integrations/supabase/client';

// Export the configured client
export const supabase = supabaseClient;
export const isSupabaseConfigured = isConfigured;

// Log connection status
console.log('Supabase configuration status:', isSupabaseConfigured() ? 'Configured' : 'Not configured');

// Export a helper function to determine if user is authenticated
export const getCurrentUser = async () => {
  if (!isSupabaseConfigured()) {
    // Check local storage for demo mode
    const savedUser = localStorage.getItem('cognix_user_auth');
    return savedUser ? JSON.parse(savedUser) : null;
  }
  
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

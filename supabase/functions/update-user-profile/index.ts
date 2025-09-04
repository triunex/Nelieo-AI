
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.4.0";
import { corsHeaders } from "../_shared/cors.ts";

interface ProfileData {
  userId: string;
  fullName?: string;
  jobTitle?: string;
  bio?: string;
  hobbies?: string;
  workLife?: string;
  avatarUrl?: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const { userId, ...profileData } = await req.json() as ProfileData;

    // Validate user ID
    if (!userId) {
      return new Response(
        JSON.stringify({ error: "User ID is required" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Create a Supabase client with the Auth context of the logged in user
    const supabaseClient = createClient(
      // Supabase API URL - env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API SERVICE ROLE KEY - env var exported by default.
      // WARNING: The service role key has admin privileges and should only be used in secure server environments.
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Create or update the profile in the database
    const { data, error } = await supabaseClient
      .from("user_profiles")
      .upsert({
        user_id: userId,
        full_name: profileData.fullName,
        job_title: profileData.jobTitle,
        bio: profileData.bio,
        hobbies: profileData.hobbies,
        work_life: profileData.workLife,
        avatar_url: profileData.avatarUrl,
        updated_at: new Date().toISOString()
      })
      .select();

    if (error) {
      throw error;
    }

    // Return the updated profile
    return new Response(
      JSON.stringify({ success: true, profile: data[0] }),
      { 
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});

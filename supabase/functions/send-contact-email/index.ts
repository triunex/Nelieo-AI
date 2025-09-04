
import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface ContactFormData {
  name: string;
  email: string;
  message: string;
  recipientEmail: string;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email, message, recipientEmail } = await req.json() as ContactFormData;

    // Validate input
    if (!name || !email || !message || !recipientEmail) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { 
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // In a real implementation, you would use an email service like SendGrid, Mailgun, etc.
    // For demo purposes, we'll just log the data and return a success response
    console.log(`Contact form submission:
      To: ${recipientEmail}
      From: ${name} (${email})
      Message: ${message}
    `);

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
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


// Follow the guide at https://supabase.com/docs/guides/functions to deploy this Edge Function
// after adding your API keys in the Supabase dashboard

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface RequestBody {
  query: string;
  mode: 'search' | 'chat' | 'agentic';
  model: 'gpt-3.5' | 'gpt-4.1' | 'gpt-4o';
}

interface SearchSource {
  title: string;
  url: string;
  snippet?: string;
}

interface SearchResult {
  answer: string;
  sources: SearchSource[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const body = await req.json() as RequestBody;
    const { query, mode, model } = body;
    
    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }
    
    // Log the request for debugging
    console.log(`Processing request - Query: ${query}, Mode: ${mode}, Model: ${model}`);
    
    // These environment variables are automatically available in Edge Functions
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      return new Response(
        JSON.stringify({ 
          error: 'Supabase configuration is missing. Please check your environment variables.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get API keys from Supabase secrets
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const searchApiKey = Deno.env.get('SEARCH_API_KEY');
    const modelType = model || 'gpt-3.5';
    
    console.log('API Keys status:', {
      openaiApiKey: openaiApiKey ? 'Available' : 'Not available',
      searchApiKey: searchApiKey ? 'Available' : 'Not available'
    });
    
    if (!openaiApiKey || !searchApiKey) {
      console.error('API keys not configured');
      return new Response(
        JSON.stringify({ 
          error: 'API keys not configured. Please add OPENAI_API_KEY and SEARCH_API_KEY to Supabase secrets.' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500 
        }
      );
    }
    
    // Implement real search functionality
    const result = await generateAnswer(query, mode, openaiApiKey, modelType, searchApiKey);
    
    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An unexpected error occurred' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function generateAnswer(
  query: string, 
  mode: 'search' | 'chat' | 'agentic',
  openaiApiKey: string,
  modelType: string = 'gpt-3.5',
  searchApiKey: string
): Promise<SearchResult> {
  // First perform a web search using the search API
  const searchResults = await performWebSearch(query, searchApiKey);
  
  // Format the search results for context
  const searchContext = searchResults.map(result => 
    `Title: ${result.title}\nURL: ${result.url}\nContent: ${result.snippet || 'No snippet available'}`
  ).join('\n\n');
  
  // Map the internal model type to OpenAI model name
  let openAIModel = 'gpt-3.5-turbo';
  if (modelType === 'gpt-4.1') {
    openAIModel = 'gpt-4';
  } else if (modelType === 'gpt-4o') {
    openAIModel = 'gpt-4o';
  }
  
  // Use OpenAI to generate an answer based on search results
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify({
        model: openAIModel,
        messages: [
          {
            role: "system",
            content: mode === 'search' 
              ? "You are a helpful search assistant that provides concise, informative answers based on the search results provided. Include relevant information and cite your sources by including [Source X] references."
              : mode === 'chat' 
              ? "You are a conversational AI assistant that provides helpful, informative responses in a natural tone, based on the search results provided."
              : "You are an agentic research assistant that provides comprehensive analysis across multiple sources, synthesizing information with clear organization based on the search results provided."
          },
          {
            role: "user",
            content: `Question: ${query}\n\nSearch Results:\n${searchContext}`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    const answer = data.choices[0].message.content;
    
    return { 
      answer, 
      sources: searchResults 
    };
  } catch (error) {
    console.error('Error generating answer with OpenAI:', error);
    // Return a fallback response
    return {
      answer: "I'm sorry, but I encountered an error while processing your request. Please try again later.",
      sources: searchResults
    };
  }
}

async function performWebSearch(query: string, apiKey: string): Promise<SearchSource[]> {
  try {
    // In a production environment, you would replace this with a real implementation 
    // using Bing Search API, Google Search API, or another search provider
    
    // Example Bing Search API implementation (commented out)
    /*
    const endpoint = 'https://api.bing.microsoft.com/v7.0/search';
    const response = await fetch(`${endpoint}?q=${encodeURIComponent(query)}&count=5`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey
      }
    });
    
    const data = await response.json();
    
    // Process Bing search results
    if (data.webPages && data.webPages.value) {
      return data.webPages.value.map((page: any) => ({
        title: page.name,
        url: page.url,
        snippet: page.snippet
      }));
    }
    */
    
    // For now, return mock results
    return [
      {
        title: "Understanding " + query + " - Comprehensive Guide",
        url: "https://example.com/guide-to-" + encodeURIComponent(query),
        snippet: "A detailed explanation of " + query + " covering all aspects and recent developments in this field."
      },
      {
        title: query + " Research Papers and Analysis",
        url: "https://example.com/research-on-" + encodeURIComponent(query),
        snippet: "Collection of academic research and papers related to " + query + " published in leading journals."
      },
      {
        title: "How " + query + " Is Changing Industries",
        url: "https://example.com/impact-of-" + encodeURIComponent(query),
        snippet: "Analysis of how " + query + " is transforming various sectors and creating new opportunities for innovation."
      }
    ];
  } catch (error) {
    console.error('Search API error:', error);
    return [
      {
        title: "Error performing search",
        url: "https://example.com/error",
        snippet: "We encountered an error while searching for information about " + query
      }
    ];
  }
}

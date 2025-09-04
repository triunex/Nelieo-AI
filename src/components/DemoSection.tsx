import React, { useState } from "react";
import {
  MessageSquare,
  Search,
  MessageCircle,
  FileText,
  Quote,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import TypingAnimation from "./TypingAnimation";
import { performSearch, SearchSource } from "../services/searchService";
import { toast } from "@/hooks/use-toast";

type SearchMode = "search" | "chat" | "agentic";

const DemoSection = () => {
  const [mode, setMode] = useState<SearchMode>("search");
  const [isAnimating, setIsAnimating] = useState(false);
  const [showFullAnswer, setShowFullAnswer] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<SearchSource[]>([]);

  const sampleQuestion =
    "What are the latest developments in quantum computing?";

  const handleStart = async () => {
    setIsAnimating(false);
    setShowFullAnswer(false);
    setIsLoading(true);

    toast({
      title: "Processing demo query",
      description: "Searching for information about quantum computing...",
    });

    try {
      // Use our real search service
      const result = await performSearch(sampleQuestion, mode);

      setAnswer(result.answer);
      setSources(result.sources);

      setIsLoading(false);
      setIsAnimating(true);

      toast({
        title: "Demo results ready",
        description: `Found ${result.sources.length} sources about quantum computing`,
      });
    } catch (error) {
      setIsLoading(false);

      toast({
        title: "Demo search failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to complete demo search",
        variant: "destructive",
      });

      // Set fallback content for demo purposes
      setAnswer(
        "Unable to retrieve results at this time. Please try again later."
      );
      setSources([]);
      setIsAnimating(true);
    }
  };

  const handleAnimationComplete = () => {
    setIsAnimating(false);
    setShowFullAnswer(true);
  };

  return (
    <section id="demo" className="py-20 relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-4">
            See <span className="gradient-text">NelieoAI</span> in Action
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Watch how our AI assistant quickly searches, analyzes, and
            synthesizes information from across the web.
          </p>
        </div>

        <div className="glass-card p-5 mb-10">
          <div className="flex justify-between items-center mb-6">
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(value: SearchMode) => value && setMode(value)}
            >
              <ToggleGroupItem
                value="search"
                aria-label="Search mode"
                className="flex items-center gap-2"
              >
                <Search size={16} />
                <span>Search</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="chat"
                aria-label="Chat mode"
                className="flex items-center gap-2"
              >
                <MessageCircle size={16} />
                <span>Chat</span>
              </ToggleGroupItem>
              <ToggleGroupItem
                value="agentic"
                aria-label="Agentic mode"
                className="flex items-center gap-2"
              >
                <MessageSquare size={16} />
                <span>Agentic</span>
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              variant="outline"
              size="sm"
              onClick={handleStart}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Try Example"}
            </Button>
          </div>

          <div className="glass-card p-4 mb-4">
            <div className="font-medium text-blue-400">{sampleQuestion}</div>
          </div>

          <div className="glass-card p-6">
            <div className="prose prose-invert max-w-none">
              {isLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse flex space-x-2">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  </div>
                </div>
              )}

              {isAnimating ? (
                <TypingAnimation
                  text={answer}
                  speed={15}
                  onComplete={handleAnimationComplete}
                  className="whitespace-pre-wrap"
                  typingDelay={500}
                />
              ) : showFullAnswer ? (
                <div className="whitespace-pre-wrap">{answer}</div>
              ) : !isLoading ? (
                <div className="text-gray-400 italic">
                  Click "Try Example" to see the AI response...
                </div>
              ) : null}

              {showFullAnswer && sources.length > 0 && (
                <>
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="text-sm text-gray-400 font-semibold mb-2">
                      Sources:
                    </div>
                    <div className="space-y-2">
                      {sources.map((source, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-xs bg-white/10 rounded-full w-5 h-5 inline-flex items-center justify-center mr-2 mt-0.5">
                            {index + 1}
                          </span>
                          <div>
                            <a
                              href={source.url}
                              className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1.5"
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Link size={14} />
                              {source.title}
                            </a>
                            {source.snippet && (
                              <p className="text-xs text-gray-400 mt-1">
                                {source.snippet}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 mt-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <FileText size={16} />
                      <span>Sources</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <MessageCircle size={16} />
                      <span>Ask follow-up</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-1.5"
                    >
                      <Quote size={16} />
                      <span>Cite this</span>
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-300 mb-6">
            Experience the full power of our AI assistant with unlimited
            searches and advanced features.
          </p>
          <Button className="bg-gradient-to-r from-purple-600 to-blue-500 hover:from-purple-700 hover:to-blue-600">
            Get Started
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DemoSection;

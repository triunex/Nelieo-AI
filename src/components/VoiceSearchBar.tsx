import React, { useState, useRef } from "react";
import { Search, Mic } from "lucide-react";

// TypeScript compatibility fix
interface Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
}

declare var window: Window;

// 👇 This makes TypeScript understand what SpeechRecognition is
declare global {
  interface Window {
    webkitSpeechRecognition: any;
    SpeechRecognition: any;
  }

  // Define the SpeechRecognition type globally
  interface SpeechRecognition {
    lang: string;
    interimResults: boolean;
    maxAlternatives: number;
    onresult: ((event: any) => void) | null;
    onerror: ((event: any) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
  }
}

const VoiceSearchBar: React.FC<{
  onSearch: (query: string) => void;
}> = ({ onSearch }) => {
  const [query, setQuery] = useState("");
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Set up Web Speech API
  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const spokenText = event.results[0][0].transcript;
      setQuery(spokenText);
      setListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 w-full max-w-xl mx-auto p-2 bg-white rounded-2xl shadow-md"
    >
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ask me anything..."
        className="flex-1 p-2 outline-none text-base"
      />
      <button
        type="button"
        onClick={startListening}
        className={`p-2 rounded-full ${
          listening ? "bg-red-100" : "bg-gray-100"
        } transition`}
        title={listening ? "Listening..." : "Tap to speak"}
      >
        <Mic
          className={listening ? "animate-pulse text-red-500" : "text-gray-600"}
        />
      </button>
      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition"
      >
        <Search />
      </button>
    </form>
  );
};

export default VoiceSearchBar;

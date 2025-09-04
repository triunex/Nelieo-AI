import { useState, useEffect } from "react";
import { useRef } from "react"; // Added useRef import
import { motion } from "framer-motion"; // Import motion for animations
import {
  Camera,
  PhoneOff,
  Play,
  Pause,
  Cog,
  ChevronDown,
  ChevronUp,
  User,
  AlertTriangle,
  Eye,
  Zap,
  Stethoscope,
  Heart,
  MicOff, // Added MicOff icon
  X,
  Mic,
  Atom,
} from "lucide-react";
import { useNavigate } from "react-router-dom"; // Import useNavigate for navigation
import Aurora from "@/components/Aurora"; // Import Aurora component

const customVoices = [
  { name: "Microsoft JennyNeural", lang: "en-US", rate: 1, pitch: 1.2 },
  { name: "Microsoft DavisNeural", lang: "en-US", rate: 0.9, pitch: 1 },
  { name: "Alice", lang: "en-US", rate: 1, pitch: 1.2 },
  { name: "Bob", lang: "en-US", rate: 0.9, pitch: 1 },
  { name: "Charlie", lang: "en-GB", rate: 1, pitch: 1.1 },
  { name: "Diana", lang: "en-GB", rate: 1.1, pitch: 1.3 },
  { name: "Grace", lang: "en-IN", rate: 1, pitch: 1.1 },
  { name: "Rahul", lang: "hi-IN", rate: 1, pitch: 1.1 }, // Hindi voice
];

const personalities: { label: string; value: string; icon: any }[] = [
  { label: "Default", value: "default", icon: User },
  { label: "Aggressive Arguer", value: "aggressive", icon: AlertTriangle },
  { label: "Conspiracy Theorist", value: "conspiracy", icon: Eye },
  { label: "Sexy", value: "sexy", icon: Zap },
  { label: "Doctor", value: "doctor", icon: Stethoscope },
  { label: "Romantic", value: "romantic", icon: Heart },
];

const voiceMap = {
  default: "en-US-Neural2-J",
  aggressive: "en-US-Wavenet-D",
  conspiracy: "en-GB-News-K",
  sexy: "en-US-Studio-M",
  doctor: "en-IN-Standard-C",
  romantic: "en-US-Neural2-F",
};

const Chat = () => {
  const navigate = useNavigate(); // Initialize navigation hook
  const [isListening, setIsListening] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  // runs startup greeting exactly once
  const didStartupGreet = useRef(false);
  // remember last greeting to avoid immediate repeats within the session
  const lastGreeting = useRef<string | null>(null);
  const [micActive, setMicActive] = useState(false);
  const [selectedVoice, setSelectedVoice] =
    useState<SpeechSynthesisVoice | null>(null);
  const [isPaused, setIsPaused] = useState(false); // State to track pause/resume
  const [showCamera, setShowCamera] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceExpanded, setVoiceExpanded] = useState(false);
  const [personaExpanded, setPersonaExpanded] = useState(false);
  // removed showVoiceOptions state (settings panel removed)
  const [conversationHistory, setConversationHistory] = useState<string[]>([]); // State to store conversation history
  const [input, setInput] = useState(""); // State for user input
  const [messages, setMessages] = useState<{ role: string; content: string }[]>(
    []
  ); // State for chat messages
  const [agentPanelVisible, setAgentPanelVisible] = useState(false);
  const [agentPanelUrl, setAgentPanelUrl] = useState("");
  const [selectedPersona, setSelectedPersona] = useState("default"); // State for selected persona
  const [agenticOpen, setAgenticOpen] = useState(false);

  const startVoiceLoop = () => {
    if (isPaused) return; // Do not start listening if paused
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = false;

    // store ref so we can stop it from UI
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsListening(true);
      setMicActive(true);
    };
    recognition.onend = () => {
      setIsListening(false);
      setMicActive(false);
    };

    recognition.onresult = async (event) => {
      const userInput = event.results[0][0].transcript.trim();
      console.log("You said:", userInput);
      setIsListening(false);

      // Update conversation history with user input
      const updatedHistory = [...conversationHistory, `User: ${userInput}`];
      setConversationHistory(updatedHistory);

      try {
        // If Agentic Mode is open and the query looks actionable (contains verbs like "find", "search", "open", "play", "book", "ticket"),
        // route to the agentic backend which will run a headless browser and return a recorded video of the session.
        const actionable =
          /\b(find|search|open|play|book|ticket|price|flight|buy|order|checkout|watch)\b/i.test(
            userInput
          );

        if (agenticOpen && actionable) {
          // Call agentic endpoint
          const r = await fetch("/api/agentic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: userInput }),
          });
          const d = await r.json();
          if (d?.videoUrl) {
            // show agent panel with returned video
            setAgentPanelUrl(d.videoUrl);
            setAgentPanelVisible(true);
          }

          // Provide a quick spoken response summarizing results (if available)
          const summary = d?.hits?.length
            ? `I opened a browser and checked results. I will show the session on screen and summarize the top result: ${d.hits[0].title}`
            : `I've opened a browser and started exploring. Check the live session.`;
          setConversationHistory((prev) => [...prev, `AI: ${summary}`]);
          speakToUser(summary);
        } else {
          const prompt = `${updatedHistory.join("\n")}\nAI:`;
          const res = await fetch(
            "https://cognix-api.onrender.com/api/voice-query",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                query: prompt,
                history: updatedHistory,
                persona: selectedPersona,
              }),
            }
          );

          const data = await res.json();
          const reply = data.answer || "Sorry, I didn’t catch that.";
          console.log("CogniX says:", reply);

          // Update conversation history with AI response
          setConversationHistory((prev) => [...prev, `AI: ${reply}`]);
          speakToUser(reply);
        }
      } catch (err) {
        console.error("API call failed:", err);
        speakToUser("Hmm... I'm having trouble right now.");
      }
    };

    recognition.start();
  };

  const stopVoiceLoop = () => {
    try {
      if (recognitionRef.current) {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
    } catch (e) {
      console.warn("stopVoiceLoop error", e);
    }
    setIsListening(false);
    setMicActive(false);
  };

  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices();
      console.log("Available voices:", voices); // Log available voices for debugging

      const preferredVoiceName = voiceMap[selectedPersona];
      const preferredVoice = voices.find((v) => v.name === preferredVoiceName);

      setSelectedVoice(preferredVoice || voices[0]);
    };

    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = loadVoices;
    }

    // Add a slight delay to ensure voices are loaded
    setTimeout(() => {
      loadVoices();
    }, 500);
  }, [selectedPersona]); // Reload voices when persona changes

  const speakToUser = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedVoice?.lang || "en-US"; // Use selected voice's language or default to "en-US"

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (voice) =>
        voice.lang === utterance.lang &&
        /female|natural|google/.test(voice.name.toLowerCase())
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log("Using preferred voice:", preferredVoice.name); // Log the selected voice for debugging
    }

    utterance.rate = 1;
    utterance.pitch = 1.1;

    utterance.onstart = () => setAiSpeaking(true);
    utterance.onend = () => {
      setAiSpeaking(false);
      if (!isPaused) {
        setTimeout(() => startVoiceLoop(), 600); // Slight delay before restarting the voice loop
      }
    };

    window.speechSynthesis.cancel(); // Cancel any ongoing speech
    window.speechSynthesis.speak(utterance);
  };

  // --- Jarvis-Mode: greet on startup (prefer Microsoft "Ava") ---
  useEffect(() => {
    if (didStartupGreet.current) return;
    didStartupGreet.current = true;

    // Jarvis-style greeting pool (time-of-day aware)
    const greetingsByPeriod: Record<string, string[]> = {
      morning: [
        "Good morning, boss. Nelieo is online and running at optimal performance.",
        "Morning, boss — all systems nominal. Ready to assist.",
        "Good morning. I've synced the latest briefs and I'm ready when you are.",
      ],
      afternoon: [
        "Good afternoon, boss. Systems are calibrated and ready.",
        "Afternoon. I've compiled the latest updates — how can I help?",
        "At your service. All diagnostics green and standing by.",
      ],
      evening: [
        "Good evening, boss. Nelieo is online—systems calibrated and ready.",
        "Evening. I'm online and monitoring — what would you like to do first?",
        "All quiet on the network, boss. Ready to proceed when you are.",
      ],
      neutral: [
        "Nelieo reporting for duty — systems nominal.",
        "System check complete. I'm ready to assist.",
        "Standing by, boss. Tell me what you need.",
      ],
    };

    const hour = new Date().getHours();
    let period = "neutral";
    if (hour >= 5 && hour < 12) period = "morning";
    else if (hour >= 12 && hour < 18) period = "afternoon";
    else period = "evening";

    const pool = [...greetingsByPeriod[period], ...greetingsByPeriod.neutral];

    const pickGreeting = () => {
      if (!pool.length) return "Nelieo is online.";
      let g = pool[Math.floor(Math.random() * pool.length)];
      // avoid repeating the same greeting twice in a row within the session
      if (pool.length > 1 && lastGreeting.current) {
        let attempts = 0;
        while (g === lastGreeting.current && attempts < 6) {
          g = pool[Math.floor(Math.random() * pool.length)];
          attempts += 1;
        }
      }
      lastGreeting.current = g;
      return g;
    };

    const greeting = pickGreeting();

    // log to your running context so the model sees the opener
    setConversationHistory((prev) => [...prev, `AI: ${greeting}`]);

    const speakWithAva = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        const ava = voices.find((v) => /ava/i.test(v.name || v.voiceURI));
        if (ava) {
          const utterance = new SpeechSynthesisUtterance(greeting);
          utterance.lang = ava.lang || "en-US";
          utterance.voice = ava;
          utterance.rate = 1;
          utterance.pitch = 1.05;
          utterance.onstart = () => setAiSpeaking(true);
          utterance.onend = () => {
            setAiSpeaking(false);
            // resume listening loop unless paused
            if (!isPaused) setTimeout(() => startVoiceLoop(), 600);
          };
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          return true;
        }
      } catch (e) {
        console.warn("speakWithAva failed", e);
      }
      return false;
    };

    // Try immediate speak; if voices haven't loaded, wait for voiceschanged
    if (!speakWithAva()) {
      const handler = () => {
        if (speakWithAva()) {
          window.speechSynthesis.onvoiceschanged = null;
        }
      };
      window.speechSynthesis.onvoiceschanged = handler;

      // fallback: after short delay, use the regular speakToUser if Ava not found
      setTimeout(() => {
        if (window.speechSynthesis.onvoiceschanged === handler) {
          window.speechSynthesis.onvoiceschanged = null;
          speakToUser(greeting);
        }
      }, 1400);
    }
  }, []);

  useEffect(() => {
    startVoiceLoop(); // start on page load
  }, [isPaused]); // Restart voice loop when isPaused changes

  const sendMessage = async () => {
    if (!input.trim()) return;

    if (input.includes("http") || input.includes("www.")) {
      try {
        const res = await fetch(
          "https://cognix-api.onrender.com/api/browser-agent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url: input.match(/https?:\/\/[^\s]+/)[0] }),
          }
        );

        const data = await res.json();
        setMessages([
          ...messages,
          { role: "user", content: input },
          {
            role: "ai",
            content: data.summary || "Failed to summarize the webpage.",
          },
        ]);
        return;
      } catch (err) {
        console.error("❌ Browser agent error:", err);
        setMessages([
          ...messages,
          { role: "user", content: input },
          {
            role: "ai",
            content: "Something went wrong while processing the URL.",
          },
        ]);
        return;
      }
    }

    // ...existing code for handling regular messages...
  };

  return (
    <div className="relative h-screen text-foreground overflow-hidden bg-background">
      {/* Aurora Effect */}
      <Aurora
        listening={isListening}
        speaking={aiSpeaking}
        blend={0.5}
        amplitude={1.0}
      />

      {/* Top-center indicator (personality OR agentic mode) */}
      <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        {agenticOpen ? (
          <motion.div
            initial={{ y: -8, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: -8, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.22 }}
            className="pointer-events-auto flex items-center gap-3 bg-sky-400 text-white px-5 py-2 rounded-full shadow-lg whitespace-nowrap"
          >
            <Atom size={20} className="flex-shrink-0" />
            <span className="text-sm font-medium">Agentic Mode</span>
          </motion.div>
        ) : (
          selectedPersona &&
          selectedPersona !== "default" && (
            <motion.div
              initial={{ y: -8, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-auto flex items-center gap-3 bg-card/80 text-foreground px-4 py-2 rounded-full shadow-sm backdrop-blur-sm border border-neutral-700/30"
            >
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted/20 text-base">
                {(() => {
                  const Icon = personalities.find(
                    (p) => p.value === selectedPersona
                  )?.icon;
                  return Icon ? <Icon className="w-5 h-5" /> : null;
                })()}
              </div>
              <div className="flex flex-col items-start leading-tight pointer-events-auto">
                <div className="text-sm font-semibold">
                  {
                    personalities.find((p) => p.value === selectedPersona)
                      ?.label
                  }
                </div>
                <div className="text-xs opacity-80">Active persona</div>
              </div>
            </motion.div>
          )
        )}
      </div>

      {/* Main Content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Removed unnecessary blank space */}
      </div>

      {/* Controls Section + Theme toggle */}
      {/* Settings button + panel */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <motion.button
          onClick={() => setSettingsOpen((v) => !v)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          aria-expanded={settingsOpen}
          aria-label="Open settings"
          className="p-2.5 rounded-xl bg-transparent text-foreground shadow-none hover:shadow-md transition"
          title="Settings"
        >
          <Cog className="w-5 h-5" />
        </motion.button>

        {settingsOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="mt-2 origin-top-right right-0 w-[340px] rounded-2xl bg-gradient-to-b from-card/90 to-card/80 backdrop-blur-2xl shadow-2xl p-4 text-foreground"
            style={{ position: "absolute", top: "48px", right: "0" }}
            role="dialog"
            aria-label="Settings panel"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-semibold">Settings</div>
                <div className="text-xs text-muted-foreground">
                  Customize your assistant
                </div>
              </div>
              <button
                onClick={() => setSettingsOpen(false)}
                className="p-2 rounded-md hover:bg-muted/80 transition"
                title="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-x"
                >
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Voices section (collapsible) */}
            <div className="rounded-xl p-1 bg-[rgba(255,255,255,0.02)]">
              <button
                onClick={() => setVoiceExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/80 transition"
                aria-expanded={voiceExpanded}
              >
                <div className="flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="lucide lucide-volume-2"
                  >
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                  <span className="text-sm font-medium">Voices</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedVoice?.name || "Default"}
                  </span>
                  {voiceExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {voiceExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1"
                >
                  {customVoices.map((v, i) => (
                    <button
                      key={v.name + i}
                      onClick={() => {
                        // set selected voice metadata; actual SpeechSynthesisVoice may still be resolved via loadVoices
                        setSelectedVoice(
                          (prev) =>
                            ({
                              ...(prev as any),
                              name: v.name,
                              lang: v.lang,
                            } as SpeechSynthesisVoice)
                        );
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedVoice?.name === v.name
                          ? "relative bg-[rgba(139,92,246,0.12)] border border-purple-500/30 ring-1 ring-purple-400/10 backdrop-blur-sm shadow-[0_0_20px_rgba(139,92,246,0.10)] text-purple-200"
                          : "hover:bg-muted/80 bg-transparent"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{v.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {v.lang}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {v.rate}x
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Personality selector (collapsible) */}
            <div className="mt-3 rounded-xl p-1 bg-[rgba(255,255,255,0.02)]">
              <button
                onClick={() => setPersonaExpanded((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/80 transition"
                aria-expanded={personaExpanded}
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Personality</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {selectedPersona}
                  </span>
                  {personaExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </div>
              </button>

              {personaExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.18 }}
                  className="mt-2 grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-1"
                >
                  {personalities.map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setSelectedPersona(p.value)}
                      className={`relative w-full text-left px-3 py-2 rounded-lg transition ${
                        selectedPersona === p.value
                          ? "bg-[rgba(139,92,246,0.12)] border border-purple-500/30 ring-1 ring-purple-400/10 backdrop-blur-sm shadow-[0_0_20px_rgba(139,92,246,0.12)] text-purple-200"
                          : "hover:bg-muted/80 bg-transparent"
                      }`}
                    >
                      {/* selected badge removed */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">{p.label}</div>
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              const Icon = p.icon;
                              return Icon ? <Icon className="w-4 h-4" /> : null;
                            })()}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </div>

            {/* Footer small actions */}
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <button
                onClick={() => {
                  setSelectedVoice(null);
                  setSelectedPersona("default");
                }}
                className="px-3 py-1 rounded-md hover:bg-muted/80 transition"
              >
                Reset
              </button>
              <div className="px-2">v1.0</div>
            </div>
          </motion.div>
        )}
      </div>

      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-6 pointer-events-auto">
        <motion.button
          onClick={() => {
            // X button acts as cancel when listening, otherwise ends session
            if (isListening) {
              stopVoiceLoop();
            } else {
              window.speechSynthesis.cancel(); // Stop any ongoing speech
              setIsPaused(true); // Pause the assistant
              setConversationHistory([]); // Clear conversation history
              navigate("/search"); // Navigate back to the search page
            }
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center shadow-md hover:scale-105 transition relative"
          title="Cancel / End Session"
        >
          <X
            size={24}
            className={`text-foreground ${isListening ? "opacity-60" : ""}`}
          />
          <span className="absolute inset-0 rounded-full pointer-events-none transition-shadow opacity-0 hover:opacity-100 hover:shadow-[0_0_20px_rgba(239,68,68,0.28)]"></span>
        </motion.button>

        <motion.button
          onClick={() => {
            if (isListening) stopVoiceLoop();
            else startVoiceLoop();
          }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.96 }}
          className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition ${
            isListening ? "bg-destructive/10" : "bg-foreground/10"
          }`}
          title={isListening ? "Stop" : "Speak"}
        >
          {isListening ? (
            <MicOff size={24} className="text-destructive" />
          ) : (
            <Mic size={24} className="text-foreground" />
          )}
        </motion.button>

        {/* Agentic Mode Button */}
        <div className="relative">
          <motion.button
            onClick={() =>
              setAgenticOpen((prev) => {
                const opening = !prev;
                if (opening) setSelectedPersona("default");
                return opening;
              })
            }
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center shadow-sm hover:bg-sky-400/10 transition text-foreground"
            title="Agentic Mode"
          >
            <Atom size={24} className="transition-colors hover:text-sky-400" />
          </motion.button>
        </div>
      </div>

      {/* Agentic Browser Panel (shows recorded session) */}
      {agentPanelVisible && agentPanelUrl && (
        <div className="fixed right-6 bottom-28 z-60 w-[480px] bg-card/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-neutral-800/40">
          <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-b from-card/80 to-card/70">
            <div className="text-sm font-semibold">Agent Browser Session</div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setAgentPanelVisible(false);
                  setAgentPanelUrl("");
                }}
                className="p-1 rounded-md hover:bg-muted/80"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="w-full h-[270px] bg-black flex items-center justify-center">
            <video
              src={agentPanelUrl}
              controls
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-3 text-xs text-muted-foreground">
            This is a recorded browser session performed by the agent.
          </div>
        </div>
      )}

      {/* Voice Options */}
      {/* voice options panel removed */}

      {/* Personality Selector - REMOVED */}
      {/* 
      <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full px-4">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {personalities.map((persona) => (
            <motion.div
              key={persona.value}
              onClick={() => setSelectedPersona(persona.value)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`flex flex-col items-center justify-center p-4 rounded-lg cursor-pointer transition ${
                selectedPersona === persona.value
                  ? "bg-purple-600 text-white shadow-lg"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <span className="text-2xl">{persona.emoji}</span>
              <span className="mt-2 text-sm font-medium">{persona.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
      */}
    </div>
  );
};

export default Chat;

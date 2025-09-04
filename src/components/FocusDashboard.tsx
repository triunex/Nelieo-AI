// components/FocusDashboard.tsx
import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { motion } from "framer-motion";
import {
  Minus,
  Maximize2,
  PieChart,
  Edit3,
  Target,
  Timer,
  Music,
  Calendar,
  Wind,
} from "lucide-react";
import { Pie } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

type Props = {
  positions: {
    timer: { x: number; y: number };
    music: { x: number; y: number };
    date: { x: number; y: number };
  };
  onDrag: (
    widget: "timer" | "music" | "date",
    data: { x: number; y: number }
  ) => void;
  onDone?: () => void;
  isLive?: boolean;
};

const FocusDashboard: React.FC<Props> = ({
  positions,
  onDrag,
  onDone,
  isLive,
}) => {
  // Make sure all Draggable components use nodeRef and ref

  const timerRef = useRef(null);
  const musicRef = useRef(null);
  const dateRef = useRef(null);
  const goalRef = useRef(null);
  const productivityRef = useRef(null);

  // Timer logic
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const [isRunning, setIsRunning] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editMinutes, setEditMinutes] = useState(25);

  useEffect(() => {
    let timer: any;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      const nowTs = Date.now();
      const duration = editMinutes;
      setSessionsCount((s) => s + 1);
      setStreak((s) => s + 1);
      setSessionHistory((h) =>
        [{ endedAt: nowTs, duration }, ...h].slice(0, 20)
      );
      setIsRunning(false);
      alert("🎉 Time's up! Take a break.");
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, "0")}:${sec
      .toString()
      .padStart(2, "0")}`;
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTimeLeft(editMinutes * 60);
    setEditMode(false);
    setIsRunning(false);
  };

  // Date & Time logic
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Minimize/maximize state for widgets
  const [minimized, setMinimized] = useState({
    timer: false,
    music: false,
    date: false,
    goals: false,
    productivity: false,
  });

  // Music widget with Spotify search
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<"track" | "artist" | "playlist">("track");
  const [showResults, setShowResults] = useState(false);

  const searchSpotify = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setShowResults(true);
    setSelectedTrack(null);
    try {
      const res = await fetch(
        `https://cognix-api.onrender.com/api/spotify-search?query=${encodeURIComponent(
          query
        )}`
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  const handleSelect = (track: any) => {
    setSelectedTrack(track);
    setShowResults(false);
  };

  const [goals, setGoals] = useState<{ text: string; done: boolean }[]>([]);
  const [goalInput, setGoalInput] = useState("");

  // Productivity tracking
  const [focusedMinutes, setFocusedMinutes] = useState(0);
  // Assume focusStart is when timer started running
  const [focusStart, setFocusStart] = useState<number | null>(null);

  // Advanced productivity metrics
  const [sessionsCount, setSessionsCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [sessionHistory, setSessionHistory] = useState<
    Array<{ endedAt: number; duration: number }>
  >([]);

  // Track focusStart when timer starts
  useEffect(() => {
    if (isRunning && !focusStart) setFocusStart(Date.now());
    if (!isRunning) setFocusStart(null);
  }, [isRunning]);

  // Tick focusedMinutes every minute when running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setFocusedMinutes((v) => v + 1);
    }, 60000);
    return () => clearInterval(interval);
  }, [isRunning]);

  // Reset focusedMinutes when timer is reset
  useEffect(() => {
    if (!isRunning && timeLeft === editMinutes * 60) setFocusedMinutes(0);
  }, [isRunning, timeLeft, editMinutes]);

  const totalTime = focusStart
    ? Math.floor((Date.now() - focusStart) / 60000)
    : 0;

  const chartData = {
    labels: ["Focused", "Idle"],
    datasets: [
      {
        data: [focusedMinutes, Math.max(0, totalTime - focusedMinutes)],
        backgroundColor: ["#10B981", "#EF4444"],
      },
    ],
  };

  // To avoid Chart.js canvas reuse errors, give Pie chart a unique key based on data
  const pieChartKey = `${focusedMinutes}-${totalTime}`;

  // Derived productivity metrics
  const efficiencyPercent = totalTime
    ? Math.round((focusedMinutes / Math.max(1, totalTime)) * 100)
    : 0;

  // State to manage widget visibility
  const [widgetVisibility, setWidgetVisibility] = useState({
    productivity: true,
    goals: true,
    timer: true,
    music: true,
    date: true,
  });

  // State to toggle focus mode selection
  const [isSelectingWidgets, setIsSelectingWidgets] = useState(false);

  const handleWidgetToggle = (widget: keyof typeof widgetVisibility) => {
    setWidgetVisibility((prev) => ({
      ...prev,
      [widget]: !prev[widget],
    }));
  };

  // Remove modal logic, render widgets directly on the page (outside modal)

  return (
    <div className="pointer-events-none">
      {/* Focus Mode Selection Screen */}
      {isSelectingWidgets && (
        <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-50 pointer-events-auto">
          <h2 className="text-white text-2xl mb-4">Select Widgets</h2>
          <div className="grid grid-cols-2 gap-4">
            {Object.keys(widgetVisibility).map((widget) => (
              <button
                key={widget}
                onClick={() =>
                  handleWidgetToggle(widget as keyof typeof widgetVisibility)
                }
                className={`px-4 py-2 rounded-lg text-white ${
                  widgetVisibility[widget as keyof typeof widgetVisibility]
                    ? "bg-green-600"
                    : "bg-gray-600"
                }`}
              >
                {widget.charAt(0).toUpperCase() + widget.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsSelectingWidgets(false)}
            className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Done
          </button>
        </div>
      )}

      {/* Productivity Widget */}
      {widgetVisibility.productivity && (
        <Draggable nodeRef={productivityRef}>
          <div
            ref={productivityRef}
            className={`w-80 bg-card/95 border border-transparent p-5 rounded-2xl shadow-2xl cursor-move backdrop-blur-sm pointer-events-auto transition-all duration-300 ${
              minimized.productivity
                ? "w-16 h-16 flex items-center justify-center"
                : ""
            }`}
            style={{
              zIndex: 10,
              position: "fixed",
              top: minimized.productivity ? 120 : 100,
              left: minimized.productivity ? 60 : 40,
            }}
          >
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() =>
                setMinimized((prev) => ({
                  ...prev,
                  productivity: !prev.productivity,
                }))
              }
              title={minimized.productivity ? "Maximize" : "Minimize"}
            >
              {minimized.productivity ? (
                <Maximize2 size={18} />
              ) : (
                <Minus size={18} />
              )}
            </button>
            {!minimized.productivity ? (
              <>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-md bg-gradient-to-br from-teal-500 to-emerald-400 text-white">
                    <PieChart className="w-5 h-5" />
                  </div>
                  <h2 className="text-foreground text-lg font-extrabold">
                    Productivity
                  </h2>
                </div>
                <div className="mb-3 rounded-lg overflow-hidden">
                  <Pie key={pieChartKey} data={chartData} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="p-2 rounded-lg bg-muted text-center">
                    <div className="text-sm text-muted-foreground">
                      Sessions
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {sessionsCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted text-center">
                    <div className="text-sm text-muted-foreground">Streak</div>
                    <div className="text-lg font-bold text-foreground">
                      {streak}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-muted text-center">
                    <div className="text-sm text-muted-foreground">
                      Efficiency
                    </div>
                    <div className="text-lg font-bold text-foreground">
                      {efficiencyPercent}%
                    </div>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="text-sm text-muted-foreground mb-2">
                    Recent sessions
                  </div>
                  <ul className="space-y-1 max-h-28 overflow-y-auto text-sm">
                    {sessionHistory.length === 0 && (
                      <li className="text-muted-foreground">No sessions yet</li>
                    )}
                    {sessionHistory.map((s, i) => (
                      <li
                        key={i}
                        className="flex justify-between text-foreground"
                      >
                        <span>{new Date(s.endedAt).toLocaleString()}</span>
                        <span className="text-muted-foreground">
                          {s.duration} min
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <motion.div
                key="prod-min"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center cursor-pointer"
                onClick={() =>
                  setMinimized((p) => ({ ...p, productivity: false }))
                }
              >
                <PieChart className="text-white w-5 h-5" />
              </motion.div>
            )}
          </div>
        </Draggable>
      )}

      {/* Goal Setter Widget */}
      {widgetVisibility.goals && (
        <Draggable nodeRef={goalRef}>
          <div
            ref={goalRef}
            className={`w-80 bg-card/95 border border-transparent p-5 rounded-2xl shadow-2xl cursor-move backdrop-blur-sm pointer-events-auto transition-all duration-300 ${
              minimized.goals
                ? "w-16 h-16 flex items-center justify-center"
                : ""
            }`}
            style={{
              zIndex: 9,
              position: "fixed",
              top: minimized.goals ? 120 : 100,
              left: minimized.goals ? 360 : 350,
            }}
          >
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() =>
                setMinimized((prev) => ({ ...prev, goals: !prev.goals }))
              }
              title={minimized.goals ? "Maximize" : "Minimize"}
            >
              {minimized.goals ? <Maximize2 size={18} /> : <Minus size={18} />}
            </button>
            {!minimized.goals ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-gradient-to-br from-yellow-500 to-amber-400 text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <h2 className="text-foreground text-lg font-extrabold">
                    Goal Setter
                  </h2>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (goalInput.trim()) {
                      setGoals([...goals, { text: goalInput, done: false }]);
                      setGoalInput("");
                    }
                  }}
                  className="flex gap-2 mb-3"
                >
                  <input
                    type="text"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="Your focus goal"
                    className="flex-1 px-3 py-2 rounded-lg bg-muted border border-border text-foreground text-sm"
                  />
                  <button
                    type="submit"
                    className="bg-amber-500 text-white px-3 py-2 rounded-lg text-sm hover:bg-amber-600 shadow-sm transition"
                  >
                    Add
                  </button>
                </form>
                <ul className="space-y-2 max-h-48 overflow-y-auto">
                  {goals.map((goal, idx) => (
                    <li
                      key={idx}
                      onClick={() =>
                        setGoals((prev) =>
                          prev.map((g, i) =>
                            i === idx ? { ...g, done: !g.done } : g
                          )
                        )
                      }
                      className={`cursor-pointer px-3 py-2 rounded-lg text-sm transition ${
                        goal.done
                          ? "bg-amber-700/50 text-amber-300 line-through"
                          : "bg-muted text-foreground hover:bg-amber-800/10"
                      }`}
                    >
                      ✅ {goal.text}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <motion.div
                key="goals-min"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-500 to-amber-400 flex items-center justify-center cursor-pointer"
                onClick={() => setMinimized((p) => ({ ...p, goals: false }))}
              >
                <Target className="text-white w-5 h-5" />
              </motion.div>
            )}
          </div>
        </Draggable>
      )}

      {/* Timer Widget */}
      {widgetVisibility.timer && (
        <Draggable nodeRef={timerRef}>
          <div
            ref={timerRef}
            className={`w-64 bg-card/95 border border-transparent p-5 rounded-2xl shadow-2xl mb-4 cursor-move backdrop-blur-sm pointer-events-auto transition-all duration-300 ${
              minimized.timer
                ? "w-16 h-16 flex items-center justify-center"
                : ""
            }`}
            style={{
              zIndex: 8,
              position: "fixed",
              top: minimized.timer ? 460 : 420,
              left: minimized.timer ? 60 : 40,
            }}
          >
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() =>
                setMinimized((prev) => ({ ...prev, timer: !prev.timer }))
              }
              title={minimized.timer ? "Maximize" : "Minimize"}
            >
              {minimized.timer ? <Maximize2 size={18} /> : <Minus size={18} />}
            </button>
            {!minimized.timer ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-gradient-to-br from-blue-500 to-sky-400 text-white">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div className="flex-1 flex items-center">
                    <h2 className="text-foreground text-lg font-extrabold">
                      Focus Timer
                    </h2>
                    <button
                      onClick={() => setEditMode((v) => !v)}
                      title={editMode ? "Cancel edit" : "Edit duration"}
                      className="ml-3 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {editMode ? (
                  <form
                    onSubmit={handleEditSubmit}
                    className="flex flex-col items-center mb-3"
                  >
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={editMinutes}
                      onChange={(e) => setEditMinutes(Number(e.target.value))}
                      className="w-20 text-center text-2xl rounded-lg bg-muted text-foreground border border-border mb-2"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm shadow-sm"
                    >
                      Set
                    </button>
                  </form>
                ) : (
                  <p className="text-4xl text-center font-mono text-foreground mb-3">
                    {formatTime(timeLeft)}
                  </p>
                )}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className="px-4 py-1 rounded-full bg-sky-600 hover:bg-sky-700 text-white text-sm shadow transition"
                    disabled={editMode}
                  >
                    {isRunning ? "Pause" : "Start"}
                  </button>
                  <button
                    onClick={() => {
                      setIsRunning(false);
                      setTimeLeft(editMinutes * 60);
                    }}
                    className="px-4 py-1 rounded-full bg-muted text-foreground text-sm"
                    disabled={editMode}
                  >
                    Reset
                  </button>
                </div>
              </>
            ) : (
              <motion.div
                key="timer-min"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-sky-400 flex items-center justify-center cursor-pointer"
                onClick={() => setMinimized((p) => ({ ...p, timer: false }))}
              >
                <Timer className="text-white w-5 h-5" />
              </motion.div>
            )}
          </div>
        </Draggable>
      )}

      {/* Music Widget */}
      {widgetVisibility.music && (
        <Draggable nodeRef={musicRef}>
          <div
            ref={musicRef}
            className={`w-96 max-w-full bg-gradient-to-br from-purple-800/10 to-purple-900/6 border border-transparent p-5 rounded-2xl shadow-2xl mb-4 cursor-move backdrop-blur-sm pointer-events-auto transition-all duration-300 ${
              minimized.music
                ? "w-16 h-16 flex items-center justify-center"
                : ""
            }`}
            style={{
              zIndex: 7,
              position: "fixed",
              top: minimized.music ? 460 : 420,
              left: minimized.music ? 300 : 260,
            }}
          >
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() =>
                setMinimized((prev) => ({ ...prev, music: !prev.music }))
              }
              title={minimized.music ? "Maximize" : "Minimize"}
            >
              {minimized.music ? <Maximize2 size={18} /> : <Minus size={18} />}
            </button>
            {!minimized.music ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-gradient-to-br from-purple-600 to-violet-500 text-white">
                    <Music className="w-5 h-5" />
                  </div>
                  <h2 className="text-foreground text-xl font-extrabold">
                    Music For Focus
                  </h2>
                </div>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for any song, artist, or playlist"
                    className="flex-1 px-3 py-2 bg-muted text-foreground rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                    onKeyDown={(e) => e.key === "Enter" && searchSpotify()}
                  />
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="bg-muted text-foreground border border-border rounded-lg px-2 py-1 text-sm"
                  >
                    <option value="track">Track</option>
                    <option value="artist">Artist</option>
                    <option value="playlist">Playlist</option>
                  </select>
                  <button
                    onClick={searchSpotify}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm py-2 px-4 rounded-lg shadow transition"
                    disabled={loading}
                  >
                    {loading ? "Searching..." : "🔍 Search"}
                  </button>
                </div>
                {/* Results */}
                {showResults && (
                  <div className="max-h-56 overflow-y-auto custom-scrollbar mb-2">
                    {loading && (
                      <div className="text-purple-300 text-center py-4">
                        Searching...
                      </div>
                    )}
                    {!loading && results.length === 0 && (
                      <div className="text-muted-foreground text-center py-4">
                        No results found.
                      </div>
                    )}
                    {!loading && results.length > 0 && (
                      <ul>
                        {results.map((track) => (
                          <li
                            key={track.id}
                            onClick={() => handleSelect(track)}
                            className={`flex items-center gap-3 p-2 rounded-lg mb-2 cursor-pointer hover:bg-purple-900/6 transition ${
                              selectedTrack?.id === track.id
                                ? "bg-purple-800/30"
                                : ""
                            }`}
                          >
                            {track.image && (
                              <img
                                src={track.image}
                                alt={track.name}
                                className="w-10 h-10 rounded shadow-sm"
                              />
                            )}
                            <div className="flex-1">
                              <p className="text-foreground text-sm font-semibold">
                                {track.name}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {track.artist}
                              </p>
                            </div>
                            <span className="text-purple-400 text-xs font-bold">
                              Play
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {/* Player */}
                {selectedTrack && (
                  <div className="mt-3">
                    <div className="flex items-center gap-3 mb-2">
                      {selectedTrack.image && (
                        <img
                          src={selectedTrack.image}
                          alt={selectedTrack.name}
                          className="w-12 h-12 rounded shadow-sm"
                        />
                      )}
                      <div>
                        <div className="text-foreground font-semibold">
                          {selectedTrack.name}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {selectedTrack.artist}
                        </div>
                      </div>
                      <a
                        href={selectedTrack.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto px-3 py-1 bg-purple-700 text-white text-xs rounded-lg hover:bg-purple-800 transition"
                      >
                        Open in Spotify
                      </a>
                    </div>
                    <iframe
                      src={`https://open.spotify.com/embed/track/${selectedTrack.id}`}
                      width="100%"
                      height="80"
                      frameBorder="0"
                      allow="autoplay; clipboard-write; encrypted-media"
                      className="rounded"
                      title="Spotify Player"
                    ></iframe>
                    <button
                      className="mt-2 w-full py-1 bg-muted text-foreground rounded-lg text-xs hover:bg-muted/90 transition"
                      onClick={() => {
                        setSelectedTrack(null);
                        setShowResults(true);
                      }}
                    >
                      ← Back to results
                    </button>
                  </div>
                )}
              </>
            ) : (
              minimized.music && (
                <motion.div
                  key="music-min"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-violet-500 flex items-center justify-center cursor-pointer"
                  onClick={() => setMinimized((p) => ({ ...p, music: false }))}
                >
                  <Music className="text-white w-5 h-5" />
                </motion.div>
              )
            )}
          </div>
        </Draggable>
      )}

      {/* Date & Time Widget */}
      {widgetVisibility.date && (
        <Draggable nodeRef={dateRef}>
          <div
            ref={dateRef}
            className={`w-64 bg-card/95 border border-transparent p-5 rounded-2xl shadow-2xl cursor-move backdrop-blur-sm pointer-events-auto transition-all duration-300 ${
              minimized.date ? "w-16 h-16 flex items-center justify-center" : ""
            }`}
            style={{
              zIndex: 6,
              position: "fixed",
              top: minimized.date ? 460 : 420,
              left: minimized.date ? 620 : 600,
            }}
          >
            <button
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
              onClick={() =>
                setMinimized((prev) => ({ ...prev, date: !prev.date }))
              }
              title={minimized.date ? "Maximize" : "Minimize"}
            >
              {minimized.date ? <Maximize2 size={18} /> : <Minus size={18} />}
            </button>
            {!minimized.date ? (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-md bg-gradient-to-br from-emerald-500 to-lime-400 text-white">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h2 className="text-foreground text-lg font-extrabold">
                    Time & Date
                  </h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  {now.toLocaleString()}
                </p>
              </>
            ) : (
              <motion.div
                key="date-min"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-lime-400 flex items-center justify-center cursor-pointer"
                onClick={() => setMinimized((p) => ({ ...p, date: false }))}
              >
                <Calendar className="text-white w-5 h-5" />
              </motion.div>
            )}
          </div>
        </Draggable>
      )}

      {/* Select Widget Button */}
      {!isSelectingWidgets && (
        <div className="fixed bottom-20 right-20 z-50 pointer-events-auto">
          <button
            onClick={() => setIsSelectingWidgets(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-purple-700 transition-all transform hover:scale-105"
          >
            Select Widget
          </button>
        </div>
      )}

      {/* Done Button (only in modal mode) */}
      {!isLive && onDone && (
        <div
          className="flex justify-end mt-2 pointer-events-auto"
          style={{ position: "fixed", bottom: 24, right: 48, zIndex: 20 }}
        >
          <button
            onClick={onDone}
            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-lime-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:from-green-600 hover:to-lime-700 transition-all transform hover:scale-105"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
};

export default FocusDashboard;

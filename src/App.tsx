import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StrictMode, useEffect } from "react";
import { NotificationProvider } from "@/contexts/NotificationProvider";
import { ArsenalProvider } from "./context/ArsenalContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AuthProvider } from "@/hooks/useAuth";
import { ErrorBoundary } from "@/components/ErrorBoundary"; // Import ErrorBoundary
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Search from "./pages/Search";
import Profile from "./pages/Profile";
import Workspace from "./pages/Workspace";
import Chat from "@/pages/Chat"; // Import Chat page
import Chatpage from "@/pages/Chatpage"; // Import Chatpage component
import NewsPage from "@/pages/NewsPage";
import ReadNews from "@/pages/ReadNews";
import "./globals.css";
import ComingSoon from "@/pages/ComingSoon"; // Import ComingSoon page
import AIOS from "@/pages/AIOS";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Create a client with better caching configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (updated from cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => {
  useEffect(() => {
    // Keep Render alive
    const keepAlive = setInterval(() => {
      fetch("https://cognix-api.onrender.com/api/ping");
    }, 4 * 60 * 1000); // Every 4 minutes

    // Warm up Gemini and Firestore on first load
    fetch("https://cognix-api.onrender.com/api/ping");
    fetch("https://cognix-api.onrender.com/api/warm-gemini");

    // Dummy Firestore read
    const warmFirestore = async () => {
      try {
        const ref = collection(db, "searchHistory");
        await getDocs(ref); // Light fetch
      } catch (e) {
        console.log("Firestore warmup failed");
      }
    };
    warmFirestore();

    return () => clearInterval(keepAlive);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ArsenalProvider>
        <ThemeProvider>
          <NotificationProvider>
            <TooltipProvider>
              <ErrorBoundary>
                <BrowserRouter>
                  <AuthProvider>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/search" element={<Search />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/workspace" element={<Workspace />} />
                      <Route path="/chat" element={<Chat />} />{" "}
                      {/* Add chat route */}
                      <Route path="/chatpage" element={<Chatpage />} />
                      <Route path="/news" element={<NewsPage />} />{" "}
                      {/* Add news route */}
                      <Route path="/news/article" element={<ReadNews />} />
                      {/* Settings page removed - appearance now in Profile */}
                      <Route path="/comingsoon" element={<ComingSoon />} />{" "}
                      {/* Add Comin<RougSoon route */}
                      <Route path="/ai-os" element={<AIOS />} />
                      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </AuthProvider>
                </BrowserRouter>
              </ErrorBoundary>
            </TooltipProvider>
          </NotificationProvider>
        </ThemeProvider>
      </ArsenalProvider>
    </QueryClientProvider>
  );
};

export default App;

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase"; // make sure this is correct
import { useNavigate, useLocation } from "react-router-dom";

const AuthContext = createContext<{
  user: any;
  authLoading: boolean;
}>({
  user: null,
  authLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);

      // If logged in and on /auth, redirect to /search
      if (firebaseUser && location.pathname === "/auth") {
        navigate("/search");
      }

      // If NOT logged in and accessing protected route, redirect to /auth
      const protectedRoutes = [
        "/search",
        "/news",
        "/workspace",
        "/chat",
        "/chatpage",
      ];
      if (!firebaseUser && protectedRoutes.includes(location.pathname)) {
        navigate("/auth");
      }
    });

    return () => unsubscribe();
  }, [location.pathname]);

  return (
    <AuthContext.Provider value={{ user, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

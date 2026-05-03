"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from "firebase/auth";
import { auth, googleProvider, facebookProvider } from "@/lib/firebase";

interface AuthContextType {
  isAuthenticated: boolean;
  isFirstLaunch: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  /** @deprecated dùng signInWithGoogle hoặc signInWithFacebook */
  login: () => void;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Watch Firebase auth state
  useEffect(() => {
    queueMicrotask(() => {
      const hasOnboarded = localStorage.getItem("has_onboarded");
      if (hasOnboarded) setIsFirstLaunch(false);
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsAuthenticated(!!firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    setUser(result.user);
    setIsAuthenticated(true);
    router.push("/");
  };

  const signInWithFacebook = async () => {
    const result = await signInWithPopup(auth, facebookProvider);
    setUser(result.user);
    setIsAuthenticated(true);
    router.push("/");
  };

  // Legacy shim — kept for backward compatibility
  const login = () => {
    signInWithGoogle().catch(console.error);
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
    setIsAuthenticated(false);
    router.push("/login");
  };

  const completeOnboarding = () => {
    localStorage.setItem("has_onboarded", "true");
    setIsFirstLaunch(false);
    router.push("/login");
  };

  // Redirection Logic
  useEffect(() => {
    if (isLoading) return;

    const publicPaths = ["/welcome", "/login", "/register"];
    const isPublicPath = publicPaths.includes(pathname);

    if (isFirstLaunch && pathname !== "/welcome") {
      router.push("/welcome");
    } else if (!isFirstLaunch && !isAuthenticated && !isPublicPath) {
      router.push("/login");
    } else if (isAuthenticated && isPublicPath) {
      router.push("/");
    }
  }, [isAuthenticated, isFirstLaunch, isLoading, pathname, router]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isFirstLaunch,
        user,
        signInWithGoogle,
        signInWithFacebook,
        login,
        logout,
        completeOnboarding,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

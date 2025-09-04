import React from "react";
import { StatusChecker } from "../StatusChecker";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen">
      {children}
      <StatusChecker />
    </div>
  );
}

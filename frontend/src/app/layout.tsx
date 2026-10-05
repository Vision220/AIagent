"use client";

import React, { useState } from "react";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { SearchModal } from "@/components/search-modal";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <html lang="en" className="dark">
      <head>
        <title>Antigravity AI | Research & Personal Assistant Platform</title>
        <meta
          name="description"
          content="Scalable AI-powered academic research and personal assistant platform driven by Gemini 1.5 and multi-agent synthesis."
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] antialiased selection:bg-cyan-500/30">
        <ThemeProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar Navigation */}
            <Sidebar />

            {/* Main Application Container */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {/* Header Bar */}
              <Header onOpenSearch={() => setIsSearchOpen(true)} />

              {/* Page Content Viewport */}
              <main className="flex-1 overflow-y-auto p-6 md:p-8">
                {children}
              </main>
            </div>
          </div>

          {/* Global Search Modal */}
          <SearchModal
            isOpen={isSearchOpen}
            onClose={() => setIsSearchOpen(false)}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}

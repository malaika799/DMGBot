"use client";

import { Brain, LayoutDashboard } from "lucide-react";

/**
 * Shared top navbar for all inner pages (Promises, Documents, Search, Timeline).
 * Matches the Dashboard header's look (white/blur bar with brand on the left),
 * but with a purple gradient "Dashboard" capsule button on the right —
 * the same style used in the Chat page's top bar.
 */
export default function PageNavbar({ title }) {
  return (
    <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 sm:px-8 lg:px-16 py-4 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto flex justify-between items-center gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-none shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 truncate">{title}</h1>
        </div>
        <a
          href="/dashboard"
          className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-3 sm:px-4 py-2 rounded-full shadow-md shadow-indigo-200 dark:shadow-none shrink-0"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </a>
      </div>
    </div>
  );
}

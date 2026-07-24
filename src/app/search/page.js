"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import {
  Search as SearchIcon,
  MessageSquare,
  CheckSquare,
  FileText,
  Sparkles,
  Loader2,
  X,
  Clock,
  Trash2,
  Lightbulb,
  Grid2X2,
  SlidersHorizontal,
  ArrowRight,
} from "lucide-react";

// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";
const RECENT_KEY = "dmg_recent_searches";
const MAX_RECENT = 5;

const TABS = [
  { key: "All", label: "All" },
  { key: "Promise", label: "Promises" },
  { key: "Document", label: "Documents" },
  { key: "Memory", label: "Memories" },
  { key: "Conversation", label: "Chats" },
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [tab, setTab] = useState("All");
  const [recent, setRecent] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"));
    } catch {}
  }, [router]);

  const saveRecent = (term) => {
    if (!term.trim()) return;
    setRecent((prev) => {
      const next = [
        { term, ts: Date.now() },
        ...prev.filter((r) => r.term.toLowerCase() !== term.toLowerCase()),
      ].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clearRecent = () => {
    setRecent([]);
    localStorage.removeItem(RECENT_KEY);
  };

  const runSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setResults(null);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get("/search/global", { params: { q: term } });
      setResults(res.data);
      saveRecent(term);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 400);
  };

  const handleRecentClick = (term) => {
    setQuery(term);
    runSearch(term);
  };

  const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : null;

  const formatRelative = (ts) => {
    const diffMs = Date.now() - ts;
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  };

  const norm = {
    promise: (p) => ({
      id: p.id ?? p.Id,
      personName: p.personName ?? p.PersonName,
      promiseText: p.promiseText ?? p.PromiseText,
      dueDate: p.dueDate ?? p.DueDate,
      status: p.status ?? p.Status,
    }),
    document: (d) => ({
      id: d.id ?? d.Id,
      fileName: d.fileName ?? d.FileName,
      category: d.category ?? d.Category,
      filePath: d.filePath ?? d.FilePath,
      uploadDate: d.uploadDate ?? d.UploadDate,
    }),
    memory: (m) => ({
      id: m.id ?? m.Id,
      extractedText: m.extractedText ?? m.ExtractedText,
      category: m.category ?? m.Category,
      priority: m.priority ?? m.Priority,
      createdDate: m.createdDate ?? m.CreatedDate,
    }),
    conversation: (c) => ({
      id: c.id ?? c.Id,
      message: c.message ?? c.Message,
      role: c.role ?? c.Role,
      timestamp: c.timestamp ?? c.Timestamp,
    }),
  };

  const promises = useMemo(() => (results?.promises || []).map(norm.promise), [results]);
  const documents = useMemo(() => (results?.documents || []).map(norm.document), [results]);
  const memories = useMemo(() => (results?.memories || []).map(norm.memory), [results]);
  const conversations = useMemo(() => (results?.conversations || []).map(norm.conversation), [results]);

  const totalResults = promises.length + documents.length + memories.length + conversations.length;

  const showPromises = tab === "All" || tab === "Promise";
  const showDocuments = tab === "All" || tab === "Document";
  const showMemories = tab === "All" || tab === "Memory";
  const showConversations = tab === "All" || tab === "Conversation";

  const visibleCount =
    (showPromises ? promises.length : 0) +
    (showDocuments ? documents.length : 0) +
    (showMemories ? memories.length : 0) +
    (showConversations ? conversations.length : 0);

  const SectionHeader = ({ icon: Icon, label, count, color }) => (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-4 h-4 text-slate-800 dark:text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">{label}</h3>
        <span className="text-xs text-slate-500 dark:text-indigo-200/50 bg-white dark:bg-white/5 px-2 py-0.5 rounded-full">{count}</span>
      </div>
      {count > 3 && <span className="text-xs text-slate-500 dark:text-indigo-300 font-semibold">View all →</span>}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#120c2e] dark:via-[#1a1240] dark:to-[#150c33] flex flex-col lg:flex-row">
      <Sidebar active="/search" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1500px] w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Search Everything <Sparkles className="w-6 h-6 text-indigo-400" />
            </h1>
            <p className="text-slate-500 dark:text-indigo-200/60 text-sm mt-1">Search across your promises, documents, chats and reminders.</p>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-4 py-2 rounded-full shadow-md shadow-indigo-900/40"
          >
            <Grid2X2 className="w-4 h-4" />
            Dashboard
          </a>
        </div>

        {/* Search bar */}
        <div className="relative mb-4">
          <SearchIcon className="w-4 h-4 text-slate-500 dark:text-indigo-200/40 absolute left-5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search anything..."
            autoFocus
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl pl-12 pr-11 py-4 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {query && (
            <button
              onClick={() => {
                setQuery("");
                setResults(null);
                setSearched(false);
              }}
              className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-indigo-200/30 hover:text-slate-800 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        {searched && totalResults > 0 && (
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === t.key ? "bg-indigo-600 text-white" : "bg-white dark:bg-white/5 text-slate-600 dark:text-indigo-200/70 hover:bg-white dark:hover:bg-white/10"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-8 items-start">
          {/* Results column */}
          <div className="flex-1 min-w-0">
            {loading && (
              <div className="flex justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            )}

            {!loading && !searched && (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-500 dark:text-indigo-200/50 text-sm">
                  Try searching a name, like &quot;Ahmed&quot; or &quot;passport&quot;
                </p>
              </div>
            )}

            {!loading && searched && totalResults === 0 && (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <p className="text-slate-500 dark:text-indigo-200/50 text-sm">No results found for &quot;{query}&quot;</p>
              </div>
            )}

            {!loading && searched && totalResults > 0 && visibleCount === 0 && (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <p className="text-slate-500 dark:text-indigo-200/50 text-sm">No results in this category.</p>
              </div>
            )}

            {!loading && totalResults > 0 && (
              <>
                <p className="text-xs text-slate-500 dark:text-indigo-200/40 mb-4">
                  Found {totalResults} result{totalResults === 1 ? "" : "s"} for &quot;{query}&quot;
                </p>
                <div className="space-y-8">
                  {showPromises && promises.length > 0 && (
                    <div>
                      <SectionHeader icon={CheckSquare} label="Promises" count={promises.length} color="bg-gradient-to-br from-amber-500 to-orange-600" />
                      <div className="space-y-2">
                        {promises.map((p) => (
                          <a
                            key={p.id}
                            href="/promises"
                            className="block bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{p.promiseText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold text-slate-500 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                                {p.personName}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-indigo-200/40">
                                {formatDate(p.dueDate) || "No due date"} · {p.status}
                              </span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {showDocuments && documents.length > 0 && (
                    <div>
                      <SectionHeader icon={FileText} label="Documents" count={documents.length} color="bg-gradient-to-br from-indigo-500 to-purple-600" />
                      <div className="space-y-2">
                        {documents.map((d) => (
                          <a
                            key={d.id}
                            href={`${FILE_BASE}${d.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300"
                          >
                            <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{d.fileName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold text-slate-500 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                                {d.category}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-indigo-200/40">{formatDate(d.uploadDate)}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {showMemories && memories.length > 0 && (
                    <div>
                      <SectionHeader icon={Sparkles} label="Memories" count={memories.length} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
                      <div className="space-y-2">
                        {memories.map((m) => (
                          <div key={m.id} className="bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/[0.07] transition-colors duration-300">
                            <p className="text-sm font-medium text-slate-800 dark:text-white">{m.extractedText}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/15 px-2 py-0.5 rounded-full">
                                {m.category}
                              </span>
                              <span className="text-xs text-slate-500 dark:text-indigo-200/40">{formatDate(m.createdDate)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {showConversations && conversations.length > 0 && (
                    <div>
                      <SectionHeader icon={MessageSquare} label="Conversations" count={conversations.length} color="bg-gradient-to-br from-slate-500 to-slate-700" />
                      <div className="space-y-2">
                        {conversations.map((c) => (
                          <a
                            key={c.id}
                            href="/chat"
                            className="block bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300"
                          >
                            <p className="text-sm text-slate-600 dark:text-indigo-100">{c.message}</p>
                            <span className="text-xs text-slate-500 dark:text-indigo-200/40">
                              {c.role === "user" ? "You" : "Assistant"} · {formatDate(c.timestamp)}
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right rail */}
          {!searched && (
            <div className="w-80 shrink-0 hidden lg:flex flex-col gap-5">
              {/* Recent searches */}
              <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500 dark:text-indigo-300" /> Recent Searches
                  </h3>
                </div>
                {recent.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-indigo-200/40">Your recent searches will show up here.</p>
                ) : (
                  <>
                    <div className="space-y-1">
                      {recent.map((r, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleRecentClick(r.term)}
                          className="w-full flex items-center justify-between gap-2 px-2 py-2 rounded-lg hover:bg-white dark:hover:bg-white/5 transition-colors text-left"
                        >
                          <span className="flex items-center gap-2 min-w-0 text-sm text-slate-600 dark:text-indigo-100">
                            <SearchIcon className="w-3.5 h-3.5 text-slate-500 dark:text-indigo-300 shrink-0" />
                            <span className="truncate">{r.term}</span>
                          </span>
                          <span className="text-xs text-slate-400 dark:text-indigo-200/30 shrink-0">{formatRelative(r.ts)}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={clearRecent}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-indigo-200/60 bg-white dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 mt-3 py-2 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Clear History
                    </button>
                  </>
                )}
              </div>

              {/* Search tips */}
              <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 p-5">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-3 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-amber-300" /> Search Tips
                </h3>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-indigo-200/70">
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    Search by name, keyword or date
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    Use tabs to narrow down results
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    Try &quot;payment&quot;, &quot;appointment&quot;, &quot;bill&quot;
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                    Search across all your data
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
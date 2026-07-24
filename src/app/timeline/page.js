"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import {
  FileText,
  Sparkles,
  Loader2,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  HeartPulse,
  Briefcase,
  BookOpen,
  Search,
  SlidersHorizontal,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Star,
  Grid2X2,
} from "lucide-react";

const TABS = [
  { key: "All", label: "All Events" },
  { key: "Promise", label: "Promises" },
  { key: "Document", label: "Documents" },
  { key: "Memory", label: "Memories" },
];

export default function TimelinePage() {
  const router = useRouter();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [search, setSearch] = useState("");
  const [today] = useState(new Date());
  const [visibleMonths, setVisibleMonths] = useState(2);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadTimeline();
  }, [router]);

  const loadTimeline = async () => {
    try {
      const res = await api.get("/timeline");
      setGroups(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeGroup = (g) => ({
    month: g.month ?? g.Month,
    events: (g.events ?? g.Events ?? []).map((e) => ({
      date: e.date ?? e.Date,
      title: e.title ?? e.Title,
      type: e.type ?? e.Type,
      status: e.status ?? e.Status,
    })),
  });

  const promiseConfig = {
    Pending: { icon: Clock, color: "bg-gradient-to-br from-amber-500 to-orange-600", dot: "bg-amber-400", badge: "text-amber-300 bg-amber-500/15" },
    Completed: { icon: CheckCircle2, color: "bg-gradient-to-br from-emerald-500 to-green-600", dot: "bg-emerald-400", badge: "text-emerald-300 bg-emerald-500/15" },
  };

  const memoryConfig = {
    Finance: { icon: DollarSign, color: "bg-gradient-to-br from-teal-500 to-cyan-600", dot: "bg-teal-400", badge: "text-teal-300 bg-teal-500/15" },
    Personal: { icon: User, color: "bg-gradient-to-br from-violet-500 to-purple-600", dot: "bg-violet-400", badge: "text-slate-500 dark:text-violet-300 bg-violet-500/15" },
    Health: { icon: HeartPulse, color: "bg-gradient-to-br from-rose-500 to-pink-600", dot: "bg-rose-400", badge: "text-rose-300 bg-rose-500/15" },
    Work: { icon: Briefcase, color: "bg-gradient-to-br from-blue-500 to-indigo-600", dot: "bg-blue-400", badge: "text-blue-300 bg-blue-500/15" },
    Study: { icon: BookOpen, color: "bg-gradient-to-br from-indigo-500 to-violet-600", dot: "bg-indigo-400", badge: "text-slate-500 dark:text-indigo-300 bg-indigo-500/15" },
    Other: { icon: Sparkles, color: "bg-gradient-to-br from-slate-500 to-slate-600", dot: "bg-slate-400", badge: "text-slate-600 dark:text-slate-300 bg-slate-500/15" },
  };

  const documentConfig = { icon: FileText, color: "bg-gradient-to-br from-blue-500 to-cyan-600", dot: "bg-blue-400", badge: "text-blue-300 bg-blue-500/15" };

  const getEventConfig = (type, status) => {
    if (type === "Promise") return promiseConfig[status] || promiseConfig.Pending;
    if (type === "Document") return documentConfig;
    if (type === "Memory") return memoryConfig[status] || memoryConfig.Other;
    return memoryConfig.Other;
  };

  const isOverdue = (e) => e.type === "Promise" && e.status === "Pending" && new Date(e.date) < today;

  const formatDay = (d) =>
    new Date(d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const normalizedGroups = useMemo(() => groups.map(normalizeGroup), [groups]);
  const allEvents = useMemo(
    () => normalizedGroups.flatMap((g) => g.events.map((e) => ({ ...e, month: g.month }))),
    [normalizedGroups]
  );

  const filteredGroups = useMemo(() => {
    return normalizedGroups
      .map((g) => ({
        ...g,
        events: g.events.filter((e) => {
          if (tab !== "All" && e.type !== tab) return false;
          if (search.trim() && !e.title?.toLowerCase().includes(search.toLowerCase())) return false;
          return true;
        }),
      }))
      .filter((g) => g.events.length > 0);
  }, [normalizedGroups, tab, search]);

  const totalEvents = allEvents.length;
  const completedCount = allEvents.filter((e) => e.type === "Promise" && e.status === "Completed").length;
  const overdueCount = allEvents.filter(isOverdue).length;
  const pendingCount = allEvents.filter((e) => e.type === "Promise" && e.status === "Pending" && !isOverdue(e)).length;

  const todaysEvents = allEvents.filter((e) => isSameDay(new Date(e.date), today));

  // Mini calendar for current month, marking days with events
  const calendar = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const markedDays = new Set(
      allEvents
        .map((e) => new Date(e.date))
        .filter((d) => d.getFullYear() === year && d.getMonth() === month)
        .map((d) => d.getDate())
    );

    const cells = [];
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, current: false });
    for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true, marked: markedDays.has(d) });
    while (cells.length % 7 !== 0) cells.push({ day: cells.length, current: false });

    return {
      label: today.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      cells,
      todayDate: today.getDate(),
    };
  }, [today, allEvents]);

  const handleExport = () => {
    const rows = [["Date", "Title", "Type", "Status"]];
    allEvents.forEach((e) => rows.push([formatDay(e.date), e.title, e.type, e.status || ""]));
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "timeline.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleGroups = filteredGroups.slice(0, visibleMonths);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#120c2e] dark:via-[#1a1240] dark:to-[#150c33] flex flex-col lg:flex-row">
      <Sidebar active="/timeline" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1500px] w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Your Timeline <CalendarIcon className="w-6 h-6 text-indigo-400" />
            </h1>
            <p className="text-slate-500 dark:text-indigo-200/60 text-sm mt-1">See your activity timeline and important events in order.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <Search className="w-4 h-4 text-slate-500 dark:text-indigo-200/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search timeline..."
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-56"
              />
            </div>
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 px-3.5 py-2.5 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <a
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-4 py-2 rounded-full shadow-md shadow-indigo-900/40"
            >
              <Grid2X2 className="w-4 h-4" />
              Dashboard
            </a>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                tab === t.key ? "bg-indigo-600 text-white" : "bg-white dark:bg-white/5 text-slate-600 dark:text-indigo-200/70 hover:bg-white dark:hover:bg-white/10"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-8 items-start">
          {/* Timeline column */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="flex justify-center py-20">
                <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
              </div>
            ) : totalEvents === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
                  <CalendarIcon className="w-8 h-8 text-indigo-400" />
                </div>
                <p className="text-slate-500 dark:text-indigo-200/50 text-sm">
                  Your life events will show up here as you use Memory Guardian.
                </p>
              </div>
            ) : visibleGroups.length === 0 ? (
              <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                <p className="text-slate-500 dark:text-indigo-200/50 text-sm">No events match your filters.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {visibleGroups.map((group, gIdx) => (
                  <div key={gIdx}>
                    <h2 className="text-sm font-bold text-slate-500 dark:text-indigo-200/50 uppercase tracking-wide mb-4">
                      {group.month}
                    </h2>
                    <div className="relative pl-6 border-l-2 border-slate-200 dark:border-white/10 space-y-4">
                      {group.events.map((e, eIdx) => {
                        const conf = getEventConfig(e.type, e.status);
                        const Icon = conf.icon;
                        const overdue = isOverdue(e);
                        return (
                          <div key={eIdx} className="relative">
                            <span className={`absolute -left-[29px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ring-4 ring-[#150c33] ${conf.dot}`} />
                            <div className="group bg-white dark:bg-white/[0.04] rounded-xl p-4 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300 flex items-start gap-3">
                              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${conf.color} group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="w-4 h-4 text-slate-800 dark:text-white" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-slate-800 dark:text-white">{e.title}</p>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className="text-xs text-slate-500 dark:text-indigo-200/40">{formatDay(e.date)}</span>
                                  {e.status && (
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${overdue ? "text-red-500 dark:text-red-300 bg-red-100 dark:bg-red-500/15" : conf.badge}`}>
                                      {overdue ? "Overdue" : e.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {visibleMonths < filteredGroups.length && (
                  <div className="text-center">
                    <button
                      onClick={() => setVisibleMonths((v) => v + 2)}
                      className="text-sm font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 px-5 py-2.5 rounded-xl transition-colors"
                    >
                      Load More
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right rail */}
          <div className="w-80 shrink-0 hidden lg:flex flex-col gap-5">
            {/* Calendar */}
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 dark:text-white text-sm flex items-center gap-1.5">
                  <CalendarIcon className="w-4 h-4 text-slate-500 dark:text-indigo-300" /> Calendar
                </h3>
                <span className="text-xs text-slate-500 dark:text-indigo-200/50">{calendar.label}</span>
              </div>
              <div className="grid grid-cols-7 gap-y-1 text-center text-xs">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                  <span key={d} className="text-slate-400 dark:text-indigo-200/30 font-medium">{d}</span>
                ))}
                {calendar.cells.map((c, idx) => (
                  <div key={idx} className="flex items-center justify-center py-1">
                    <span
                      className={`w-7 h-7 flex items-center justify-center rounded-full relative ${
                        !c.current
                          ? "text-slate-400 dark:text-indigo-200/20"
                          : c.day === calendar.todayDate
                          ? "bg-indigo-600 text-white font-bold"
                          : "text-slate-600 dark:text-indigo-100"
                      }`}
                    >
                      {c.day}
                      {c.marked && c.day !== calendar.todayDate && (
                        <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400" />
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Today's events */}
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-3">Today&apos;s Events</h3>
              {todaysEvents.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-indigo-200/40">No events scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todaysEvents.map((e, idx) => {
                    const conf = getEventConfig(e.type, e.status);
                    return (
                      <div key={idx} className="flex items-center gap-2.5 text-sm">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${conf.dot}`} />
                        <span className="text-slate-500 dark:text-indigo-200/40 text-xs shrink-0 w-16">
                          {new Date(e.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <span className="text-slate-800 dark:text-white truncate">{e.title}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 p-5">
              <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-3">Summary</h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-indigo-200/60 flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 text-indigo-400" /> Total Events</span>
                  <span className="font-semibold text-slate-800 dark:text-white">{totalEvents}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-indigo-200/60 flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Completed</span>
                  <span className="font-semibold text-emerald-400">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-indigo-200/60 flex items-center gap-2"><Clock3 className="w-3.5 h-3.5 text-amber-400" /> Pending</span>
                  <span className="font-semibold text-amber-400">{pendingCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 dark:text-indigo-200/60 flex items-center gap-2"><Star className="w-3.5 h-3.5 text-red-400" /> Overdue</span>
                  <span className="font-semibold text-red-400">{overdueCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
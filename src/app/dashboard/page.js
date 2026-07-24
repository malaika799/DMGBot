"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import {
  ChevronRight,
  ChevronLeft,
  ListChecks,
  FileText,
  Star,
  MessageCircle,
  PlusCircle,
  Upload,
  Sparkles,
  Zap,
  Phone,
  Gift,
  Users2,
  Clock3,
  TrendingUp,
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [promises, setPromises] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [today] = useState(new Date());
  const [reminderPage, setReminderPage] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");

    if (!token || !userData) {
      router.push("/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (err) {
      console.error("Corrupt user data in storage:", err);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
      return;
    }

    loadAll();
  }, [router]);

  const loadAll = async () => {
    const [remindersRes, promisesRes, documentsRes, sessionsRes, timelineRes] =
      await Promise.allSettled([
        api.get("/reminder/list"),
        api.get("/promise/list"),
        api.get("/document/list"),
        api.get("/chatsession/list"),
        api.get("/timeline"),
      ]);

    if (remindersRes.status === "fulfilled") setReminders(remindersRes.value.data);
    if (promisesRes.status === "fulfilled") setPromises(promisesRes.value.data || []);
    if (documentsRes.status === "fulfilled") setDocuments(documentsRes.value.data || []);
    if (sessionsRes.status === "fulfilled") setSessions(sessionsRes.value.data || []);
    if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value.data || []);
  };

  const displayName = (user?.Name || user?.name || "there");

  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return "Good Morning";
    if (h < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const pendingPromises = promises.filter((p) => p.status === "Pending" || p.Status === "Pending");
  const remindersList = reminders?.reminders || [];

  // A "reminder" IS a promise that has a due date — /reminder/list is just a
  // filtered view of the same Promises table, not a separate item. Adding
  // remindersList.length here was counting each due promise twice.
  const totalTasks = pendingPromises.length;

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short" });

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  const isToday = (d) => {
    const date = new Date(d);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  const isWithinLastDays = (d, days) => {
    const date = new Date(d);
    if (isNaN(date)) return false;
    const diff = (today - date) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= days;
  };

  const isWithinNextDays = (d, days) => {
    const date = new Date(d);
    if (isNaN(date)) return false;
    const diff = (date - today) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= days;
  };

  // % of each collection touched in the last 7 days - used as a lightweight "recent activity" indicator
  const weeklyPct = (items, dateFn) => {
    if (!items.length) return 0;
    const recent = items.filter((it) => isWithinLastDays(dateFn(it), 7)).length;
    return Math.round((recent / items.length) * 100);
  };

  // Icon + color + action-label set, matched to the reference design.
  // Card has a light tinted background, icon badge is a light-tinted square,
  // and the action is a solid, full-width colored button.
  const reminderIcon = (text = "") => {
    const t = text.toLowerCase();
    if (t.includes("bill") || t.includes("electric") || t.includes("pay"))
      return {
        Icon: Zap,
        cardBg: "bg-rose-50 dark:bg-rose-950/20",
        iconBg: "bg-rose-100 dark:bg-rose-900/40",
        color: "text-rose-500 dark:text-rose-400",
        actionLabel: "Pay Now",
        btnBg: "bg-rose-500 hover:bg-rose-600",
      };
    if (t.includes("dentist") || t.includes("doctor") || t.includes("appointment"))
      return {
        Icon: Users2,
        cardBg: "bg-amber-50 dark:bg-amber-950/20",
        iconBg: "bg-amber-100 dark:bg-amber-900/40",
        color: "text-amber-500 dark:text-amber-400",
        actionLabel: "Details",
        btnBg: "bg-amber-500 hover:bg-amber-600",
      };
    if (t.includes("call") || t.includes("lawyer"))
      return {
        Icon: Phone,
        cardBg: "bg-blue-50 dark:bg-blue-950/20",
        iconBg: "bg-blue-100 dark:bg-blue-900/40",
        color: "text-blue-500 dark:text-blue-400",
        actionLabel: "Call Now",
        btnBg: "bg-blue-500 hover:bg-blue-600",
      };
    if (t.includes("payment") || t.includes("give") || t.includes("receive"))
      return {
        Icon: Gift,
        cardBg: "bg-orange-50 dark:bg-orange-950/20",
        iconBg: "bg-orange-100 dark:bg-orange-900/40",
        color: "text-orange-500 dark:text-orange-400",
        actionLabel: "Send Now",
        btnBg: "bg-orange-500 hover:bg-orange-600",
      };
    if (t.includes("meeting") || t.includes("discussion"))
      return {
        Icon: Users2,
        cardBg: "bg-violet-50 dark:bg-violet-950/20",
        iconBg: "bg-violet-100 dark:bg-violet-900/40",
        color: "text-violet-500 dark:text-violet-400",
        actionLabel: "Join Meeting",
        btnBg: "bg-violet-500 hover:bg-violet-600",
      };
    return {
      Icon: Clock3,
      cardBg: "bg-violet-50 dark:bg-violet-950/20",
      iconBg: "bg-violet-100 dark:bg-violet-900/40",
      color: "text-violet-500 dark:text-violet-400",
      actionLabel: "View",
      btnBg: "bg-violet-500 hover:bg-violet-600",
    };
  };

  const todaysItems = remindersList.filter((r) => isToday(r.dueDate || r.DueDate));

  const upcomingWeekCount = pendingPromises.filter((p) => isWithinNextDays(p.dueDate || p.DueDate, 7)).length;

  const recentActivity = timeline
    .flatMap((g) => g.events || g.Events || [])
    .sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date))
    .slice(0, 4);

  const activityIcon = (type) => {
    if (type === "Promise") return { Icon: Star, bg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-500 dark:text-emerald-400" };
    if (type === "Document") return { Icon: FileText, bg: "bg-blue-100 dark:bg-blue-900/40", color: "text-blue-500 dark:text-blue-400" };
    return { Icon: MessageCircle, bg: "bg-violet-100 dark:bg-violet-900/40", color: "text-violet-500 dark:text-violet-400" };
  };

  // --- simple month calendar for `today` ---
  const calendar = useMemo(() => {
    const year = today.getFullYear();
    const month = today.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const markedDays = new Set(
      [...remindersList.map((r) => r.dueDate || r.DueDate), ...pendingPromises.map((p) => p.dueDate || p.DueDate)]
        .filter(Boolean)
        .filter((d) => {
          const date = new Date(d);
          return date.getFullYear() === year && date.getMonth() === month;
        })
        .map((d) => new Date(d).getDate())
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
  }, [today, remindersList, pendingPromises]);

  // Reminders are paginated 4-at-a-time; use the header arrows to page through the rest.
  const REMINDERS_PER_PAGE = 4;
  const totalReminderPages = Math.max(1, Math.ceil(remindersList.length / REMINDERS_PER_PAGE));
  const visibleReminders = remindersList.slice(
    reminderPage * REMINDERS_PER_PAGE,
    reminderPage * REMINDERS_PER_PAGE + REMINDERS_PER_PAGE
  );

  // Keep the current page in range if the underlying list changes size
  useEffect(() => {
    if (reminderPage > 0 && reminderPage >= totalReminderPages) {
      setReminderPage(0);
    }
  }, [totalReminderPages, reminderPage]);

  // --- Summary cards: tinted gradient style with weekly change, matching reference design ---
  const summaryCards = [
    {
      label: "Total Tasks",
      value: totalTasks,
      icon: ListChecks,
      cardBg: "from-indigo-50 to-violet-100 dark:from-indigo-950/40 dark:to-violet-950/40",
      border: "border-indigo-100 dark:border-indigo-900/50",
      iconBg: "bg-indigo-200/70 dark:bg-indigo-900/50",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      pctColor: "text-indigo-600 dark:text-indigo-400",
      pct: weeklyPct(pendingPromises, (i) => i.dueDate || i.DueDate),
    },
    {
      label: "Documents",
      value: documents.length,
      icon: FileText,
      cardBg: "from-blue-50 to-sky-100 dark:from-blue-950/40 dark:to-sky-950/40",
      border: "border-blue-100 dark:border-blue-900/50",
      iconBg: "bg-blue-200/70 dark:bg-blue-900/50",
      iconColor: "text-blue-600 dark:text-blue-400",
      pctColor: "text-blue-600 dark:text-blue-400",
      pct: weeklyPct(documents, (d) => d.createdAt || d.CreatedAt || d.uploadedAt || d.UploadedAt),
    },
    {
      label: "Promises",
      value: promises.length,
      icon: Star,
      cardBg: "from-orange-50 to-amber-100 dark:from-orange-950/40 dark:to-amber-950/40",
      border: "border-orange-100 dark:border-orange-900/50",
      iconBg: "bg-orange-200/70 dark:bg-orange-900/50",
      iconColor: "text-orange-500 dark:text-orange-400",
      pctColor: "text-orange-600 dark:text-orange-400",
      pct: weeklyPct(promises, (p) => p.createdAt || p.CreatedAt || p.dueDate || p.DueDate),
    },
    {
      label: "AI Conversations",
      value: sessions.length,
      icon: MessageCircle,
      cardBg: "from-emerald-50 to-green-100 dark:from-emerald-950/40 dark:to-green-950/40",
      border: "border-emerald-100 dark:border-emerald-900/50",
      iconBg: "bg-emerald-200/70 dark:bg-emerald-900/50",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      pctColor: "text-emerald-600 dark:text-emerald-400",
      pct: weeklyPct(sessions, (s) => s.createdAt || s.CreatedAt || s.startedAt || s.StartedAt),
    },
  ];

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row">
      <Sidebar active="/dashboard" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1600px] w-full min-w-0">
        <TopNavbar>
          <p className="text-slate-500 flex items-center gap-2 dark:text-slate-400">👋 {greeting},</p>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2 dark:text-slate-100">
            {displayName} <Sparkles className="w-6 h-6 text-indigo-400" />
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-md dark:text-slate-400">
            Your AI Memory Assistant keeps track of your reminders, promises and important documents.
          </p>
        </TopNavbar>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
          {summaryCards.map((c) => {
            const Icon = c.icon;
            return (
              <div
                key={c.label}
                className={`rounded-2xl p-4 shadow-sm border bg-gradient-to-br ${c.cardBg} ${c.border} flex items-start gap-3`}
              >
                <div className={`w-10 h-10 rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${c.iconColor}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-600 dark:text-slate-300">{c.label}</p>
                  <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{c.value}</p>
                  <p className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${c.pctColor}`}>
                    <TrendingUp className="w-3 h-3" /> {c.pct}% from last week
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Upcoming Reminders + Quick Actions — sized to their own content, not force-stretched,
            so there's no leftover empty space when one card is naturally shorter than the other. */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-start">
          <div className="xl:col-span-3 min-w-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800 dark:text-slate-100">Upcoming Reminders</h2>
                <div className="flex items-center gap-3">
                  {remindersList.length > REMINDERS_PER_PAGE && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setReminderPage((p) => Math.max(0, p - 1))}
                        disabled={reminderPage === 0}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
                        aria-label="Previous reminders"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReminderPage((p) => Math.min(totalReminderPages - 1, p + 1))}
                        disabled={reminderPage >= totalReminderPages - 1}
                        className="w-6 h-6 rounded-md flex items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-400 dark:hover:bg-slate-700"
                        aria-label="Next reminders"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <a href="/promises" className="text-xs font-semibold text-indigo-600">View All</a>
                </div>
              </div>
              {visibleReminders.length === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center dark:text-slate-500">Nothing upcoming — you're all caught up 🎉</p>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {visibleReminders.map((r, idx) => {
                    const text = r.promiseText || r.PromiseText;
                    const dueDate = r.dueDate || r.DueDate;
                    const overdue = (r.urgencyLevel || r.UrgencyLevel) === "Overdue";
                    const { Icon, cardBg, iconBg, color, actionLabel, btnBg } = reminderIcon(text);
                    return (
                      <a
                        key={idx}
                        href="/promises"
                        className={`rounded-xl p-4 hover:shadow-md transition-all ${cardBg}`}
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4.5 h-4.5 ${color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate dark:text-slate-100">{text}</p>
                            <p className="text-xs text-slate-400 truncate dark:text-slate-500">{r.personName || r.PersonName}</p>
                          </div>
                        </div>
                        <p className={`text-xs font-bold mb-3 ${overdue ? "text-red-600 dark:text-red-400" : "text-slate-700 dark:text-slate-300"}`}>
                          {formatDate(dueDate)} · {formatTime(dueDate)}
                        </p>
                        <span className={`block text-center text-xs font-semibold text-white py-2 rounded-lg transition-colors ${btnBg}`}>
                          {actionLabel}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="xl:col-span-1 min-w-0">
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
              <h2 className="font-semibold text-slate-800 mb-4 dark:text-slate-100">Quick Actions</h2>
              <div className="space-y-1.5">
                <a href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <PlusCircle className="w-4.5 h-4.5 text-indigo-500" /> New Reminder
                </a>
                <a href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <MessageCircle className="w-4.5 h-4.5 text-indigo-500" /> New Chat
                </a>
                <a href="/documents" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <Upload className="w-4.5 h-4.5 text-indigo-500" /> Upload Document
                </a>
                <a href="/chat" className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium text-slate-700 dark:text-slate-200 dark:hover:bg-slate-700/60">
                  <Star className="w-4.5 h-4.5 text-indigo-500" /> Add Promise
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards row — AI Chat / Promises / Documents / AI Suggestions, all equal height */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-6 items-stretch">
          <div className="xl:col-span-1 min-w-0">
              <a
                href="/chat"
                className="relative overflow-hidden rounded-2xl p-5 h-full block bg-gradient-to-br from-indigo-100 via-purple-100 to-violet-200 dark:from-indigo-950/50 dark:via-purple-950/40 dark:to-violet-950/40 hover:shadow-lg transition-all"
              >
                <Image
                  src="/images/ai-robot.png"
                  alt="AI Robot"
                  width={130}
                  height={130}
                  className="absolute right-2 bottom-0 w-40 h-35 object-contain pointer-events-none"
                />

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    AI Chat Assistant
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Chat with your AI assistant about anything.
                  </p>

                  {/* Buttons */}
                  <div className="mt-2 flex flex-col gap-2">
                    {/* Conversations */}
                    <div className="inline-flex w-fit items-center rounded-xl bg-indigo-50/70 backdrop-blur-sm px-2 py-1 shadow-sm">
                      <span className="text-xl font-bold text-indigo-600">
                        {sessions.length}
                      </span>

                      <span className="ml-3 text-sm font-medium text-slate-500">
                        Conversations
                      </span>
                    </div>

                    {/* Continue Chat */}
                    <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-indigo-600 shadow-sm transition-all duration-200 hover:bg-indigo-600 hover:text-white">
                      Continue Chat
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </a>
          </div>

          <div className="xl:col-span-1 min-w-0">
              <a
                href="/promises"
                className="relative overflow-hidden rounded-2xl p-5 h-full block bg-gradient-to-br from-orange-100 via-amber-100 to-yellow-200 dark:from-orange-950/50 dark:via-amber-950/40 dark:to-yellow-950/40 hover:shadow-lg transition-all"
              >
                <Image
                  src="/images/starp.png"
                  alt="Star"
                  width={120}
                  height={120}
                  className="absolute right-2 bottom-0 w-48 h-30 object-contain pointer-events-none"
                />

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    Promises
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Track all your promises and commitments.
                  </p>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="inline-flex w-fit items-center rounded-xl bg-orange-50/70 backdrop-blur-sm px-2 py-1 shadow-sm">
                      <span className="text-xl font-bold text-orange-600">
                        {pendingPromises.length}
                      </span>

                      <span className="ml-3 text-sm font-medium text-slate-500">
                        Active Promises
                      </span>
                    </div>

                    <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-orange-600 shadow-sm transition-all duration-200 hover:bg-orange-600 hover:text-white">
                      View All
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </a>
          </div>

          <div className="xl:col-span-1 min-w-0">
              <a
                href="/documents"
                className="relative overflow-hidden rounded-2xl p-5 h-full block bg-gradient-to-br from-blue-100 via-cyan-100 to-sky-200 dark:from-blue-950/50 dark:via-cyan-950/40 dark:to-sky-950/40 hover:shadow-lg transition-all"
              >
                <Image
                  src="/images/file-b.png"
                  alt="Documents"
                  width={990}
                  height={2000}
                  className="absolute right-2 bottom-0 w-38 h-32 object-contain pointer-events-none"
                />

                <div className="relative z-10">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                    Documents
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-400">
                    Store and access your important files.
                  </p>

                  <div className="mt-2 flex flex-col gap-2">
                    <div className="inline-flex w-fit items-center rounded-xl bg-blue-50/70 backdrop-blur-sm px-2 py-1 shadow-sm">
                      <span className="text-xl font-bold text-blue-600">
                        {documents.length}
                      </span>

                      <span className="ml-3 text-sm font-medium text-slate-500">
                        Files Stored
                      </span>
                    </div>

                    <span className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-blue-600 shadow-sm transition-all duration-200 hover:bg-blue-600 hover:text-white">
                      Open Library
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              </a>
          </div>

          {/* AI Suggestions — robot sized relative to the card's own height and allowed
              to overflow slightly above the card for a bigger, more prominent look. */}
          <div className="xl:col-span-1 min-w-0">
            <div className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-purple-50 to-indigo-100 p-5 shadow-sm h-full flex flex-col justify-between">
              <Sparkles className="absolute top-4 right-4 h-5 w-5 text-violet-400 z-10" />

              <Image
                src="/images/ai-robot.png"
                alt="AI Robot"
                width={260}
                height={520}
                priority
                className="pointer-events-none absolute bottom-0 right-0 h-[135%] w-auto max-w-[70%] object-contain object-bottom"
              />

              <div className="relative z-10 w-[58%]">
                <h3 className="text-lg font-bold text-violet-700">
                  AI Suggestions
                </h3>

                <p className="mt-2 text-sm text-slate-600 leading-6">
                  You have {upcomingWeekCount} tasks due this week.
                </p>

                <a
                  href="/promises"
                  className="mt-4 inline-flex items-center rounded-lg bg-violet-100 px-4 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-600 hover:text-white"
                >
                  View Tasks
                  <ChevronRight className="ml-1 h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity / Today's Schedule / Calendar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Recent Activity</h2>
              <a href="/timeline" className="text-xs font-semibold text-indigo-600">View All</a>
            </div>
            <div className="space-y-4">
              {recentActivity.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">No activity yet.</p>}
              {recentActivity.map((e, idx) => {
                const { Icon, bg, color } = activityIcon(e.type || e.Type);
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-slate-700 truncate dark:text-slate-200">{e.title || e.Title}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">{formatDate(e.date || e.Date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <h2 className="font-semibold text-slate-800 mb-4 dark:text-slate-100">Today's Schedule</h2>
            <div className="space-y-4">
              {todaysItems.length === 0 && <p className="text-sm text-slate-400 dark:text-slate-500">Nothing scheduled for today.</p>}
              {todaysItems.map((r, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="flex flex-col items-center pt-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                    {idx < todaysItems.length - 1 && <span className="w-px flex-1 bg-slate-200 mt-1 dark:bg-slate-700" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 dark:text-slate-500">{formatTime(r.dueDate || r.DueDate)}</p>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{r.promiseText || r.PromiseText}</p>
                  </div>
                </div>
              ))}
            </div>
            <a href="/promises" className="mt-4 flex items-center justify-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 rounded-lg py-2 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors">
              View Full Schedule <ChevronRight className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">Calendar</h2>
              <span className="text-xs text-slate-500 dark:text-slate-400">{calendar.label}</span>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-slate-400 mb-1 dark:text-slate-500">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <span key={d}>{d}</span>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {calendar.cells.map((c, idx) => (
                <div
                  key={idx}
                  className={`aspect-square flex items-center justify-center text-xs rounded-lg relative ${
                    !c.current ? "text-slate-300 dark:text-slate-600" : c.day === calendar.todayDate ? "bg-indigo-600 text-white font-bold" : "text-slate-700 dark:text-slate-200"
                  }`}
                >
                  {c.day}
                  {c.marked && c.day !== calendar.todayDate && (
                    <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-indigo-400" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
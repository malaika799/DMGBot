"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Bell,
  Calendar as CalendarIcon,
  ChevronDown,
  Settings,
  LogOut,
  Trash2,
  FileText,
  MessageCircle,
  Star,
  Loader2,
  ExternalLink,
} from "lucide-react";

// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";

const TABS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "reminders", label: "Reminders" },
  { key: "updates", label: "Updates" },
];

function timeAgo(date) {
  const d = new Date(date);
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function notifIcon(category) {
  if (category === "reminders") return { Icon: Bell, bg: "bg-indigo-100 dark:bg-indigo-900/40", color: "text-indigo-500 dark:text-indigo-400" };
  if (category === "document") return { Icon: FileText, bg: "bg-emerald-100 dark:bg-emerald-900/40", color: "text-emerald-500 dark:text-emerald-400" };
  return { Icon: MessageCircle, bg: "bg-amber-100 dark:bg-amber-900/40", color: "text-amber-500 dark:text-amber-400" };
}

/**
 * Shared dynamic top navbar used on Dashboard, Settings and Help & Support.
 *
 * Left side: pass custom heading content via `children`, or use the
 * `title` / `subtitle` shorthand props for simple pages.
 *
 * Right side (always the same, fully self-contained — fetches its own data):
 * - Today's date
 * - Bell icon -> notifications popover (built from reminders + timeline)
 * - Avatar + chevron -> account dropdown (Settings / Logout / Delete Account)
 */
export default function TopNavbar({ title, subtitle, children }) {
  const router = useRouter();
  const [today] = useState(new Date());

  // profile
  const [profile, setProfile] = useState({ name: "Account", pictureUrl: null });

  // notifications
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [notifOpen, setNotifOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [readIds, setReadIds] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const stored = JSON.parse(localStorage.getItem("readNotificationIds") || "[]");
      return new Set(stored);
    } catch {
      return new Set();
    }
  });

  const persistReadIds = (next) => {
    setReadIds(next);
    try {
      localStorage.setItem("readNotificationIds", JSON.stringify(Array.from(next)));
    } catch (err) {
      console.error(err);
    }
  };

  // account menu
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const notifRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/settings/profile");
        const data = res.data;
        const pic = data.profilePictureUrl || data.ProfilePictureUrl;
        setProfile({
          name: data.name || data.Name || "Account",
          pictureUrl: pic ? `${FILE_BASE}${pic}` : null,
        });
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const [remindersRes, timelineRes] = await Promise.allSettled([
        api.get("/reminder/list"),
        api.get("/timeline"),
      ]);

      const items = [];

      if (remindersRes.status === "fulfilled") {
        const reminders = remindersRes.value.data?.reminders || [];
        reminders.forEach((r) => {
          const overdue = (r.urgencyLevel || r.UrgencyLevel) === "Overdue";
          items.push({
            id: `reminder-${r.id ?? r.Id}`,
            category: "reminders",
            title: "Promise Reminder",
            message: `${r.promiseText || r.PromiseText} — ${
              overdue ? "overdue" : "due soon"
            }`,
            date: r.dueDate || r.DueDate,
          });
        });
      }

      if (timelineRes.status === "fulfilled") {
        const groups = timelineRes.value.data || [];
        groups.forEach((g) => {
          (g.events || g.Events || []).forEach((e, idx) => {
            const type = e.type || e.Type;
            if (type === "Promise") return; // already covered by reminders above
            items.push({
              id: `timeline-${g.month || g.Month}-${idx}-${e.title || e.Title}`,
              category: type === "Document" ? "document" : "updates",
              title: type === "Document" ? "Document Uploaded" : "New Memory Saved",
              message: e.title || e.Title,
              date: e.date || e.Date,
            });
          });
        });
      }

      items.sort((a, b) => new Date(b.date) - new Date(a.date));
      setNotifications(items.slice(0, 12));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    persistReadIds(new Set(notifications.map((n) => n.id)));
  };

  const visibleNotifications = notifications.filter((n) => {
    if (activeTab === "unread") return !readIds.has(n.id);
    if (activeTab === "reminders") return n.category === "reminders";
    if (activeTab === "updates") return n.category !== "reminders";
    return true;
  });

  const handleLogout = () => {
    setMenuOpen(false);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      await api.delete("/settings/account");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete account.");
      setDeleting(false);
    }
  };

  const initials = (profile.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          {children ?? (
            <>
              {title && <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>}
              {subtitle && <p className="text-sm text-slate-500 mt-1 dark:text-slate-400">{subtitle}</p>}
            </>
          )}
        </div>

        <div className="flex items-center gap-3 sm:gap-5 shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
            <CalendarIcon className="w-4 h-4" />
            {today.toLocaleDateString("en-US", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              weekday: "long",
            })}
          </div>

          {/* Notifications */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((v) => !v);
                setMenuOpen(false);
              }}
              className="relative"
              title="Notifications"
            >
              <Bell className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-9 z-30 w-96 max-w-[90vw] bg-white rounded-2xl shadow-2xl border border-slate-100 py-4 dark:bg-slate-800 dark:border-slate-700">
                <div className="flex items-center justify-between px-5 mb-3">
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Notifications</h3>
                  <button
                    onClick={markAllRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    Mark all as read
                  </button>
                </div>

                <div className="flex items-center gap-1 px-5 mb-2 border-b border-slate-100 dark:border-slate-700">
                  {TABS.map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setActiveTab(t.key)}
                      className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                        activeTab === t.key
                          ? "border-indigo-600 text-indigo-600"
                          : "border-transparent text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                      }`}
                    >
                      {t.label}
                      {t.key === "unread" && unreadCount > 0 && ` ${unreadCount}`}
                    </button>
                  ))}
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {loadingNotifs ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                    </div>
                  ) : visibleNotifications.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-8 dark:text-slate-500">
                      Nothing here yet.
                    </p>
                  ) : (
                    visibleNotifications.map((n) => {
                      const { Icon, bg, color } = notifIcon(n.category);
                      const isUnread = !readIds.has(n.id);
                      return (
                        <button
                          key={n.id}
                          onClick={() =>
                            persistReadIds(new Set(readIds).add(n.id))
                          }
                          className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-colors dark:hover:bg-slate-700/60"
                        >
                          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{n.title}</p>
                            <p className="text-xs text-slate-500 truncate dark:text-slate-400">{n.message}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 shrink-0">
                            <span className="text-[11px] text-slate-400 dark:text-slate-500">{timeAgo(n.date)}</span>
                            {isUnread && <span className="w-2 h-2 rounded-full bg-indigo-500" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="px-5 pt-3 mt-1 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setNotifOpen(false);
                      router.push("/timeline");
                    }}
                    className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg py-2.5 transition-colors dark:bg-indigo-950/40"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Account menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => {
                setMenuOpen((v) => !v);
                setNotifOpen(false);
              }}
              className="flex items-center gap-1.5"
              title="Account menu"
            >
              {profile.pictureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.pictureUrl}
                  alt={profile.name}
                  className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-600"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {initials}
                </div>
              )}
              <ChevronDown
                className={`w-4 h-4 text-slate-400 dark:text-slate-500 transition-transform ${menuOpen ? "rotate-180" : ""}`}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-11 z-30 w-48 bg-white rounded-xl shadow-2xl border border-slate-100 py-1.5 dark:bg-slate-800 dark:border-slate-700">
                <a
                  href="/settings"
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </a>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/60"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
                <div className="h-px bg-slate-100 my-1.5 dark:bg-slate-700" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setDeleteError("");
                    setDeleteModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => !deleting && setDeleteModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-100 dark:bg-slate-800 dark:border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center mb-4 dark:bg-red-950/40">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1 dark:text-slate-100">Delete your account?</h3>
            <p className="text-sm text-slate-500 mb-6 dark:text-slate-400">
              This will permanently delete your account and all associated data. This action
              cannot be undone.
            </p>
            {deleteError && <p className="text-xs text-red-500 mb-4">{deleteError}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors disabled:opacity-50 dark:bg-slate-700 dark:text-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
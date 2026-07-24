"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Brain,
  Plus,
  MessageCircle,
  Trash2,
  Pencil,
  Pin,
  PinOff,
  Check,
  X,
  Loader2,
  LogOut,
  MoreHorizontal,
  MoreVertical,
  Settings,
} from "lucide-react";

// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";

/**
 * Self-contained ChatGPT-style sidebar.
 * Fetches and manages its own chat session list (create is handled by the
 * parent when a message is sent, since that's tied to the send flow).
 *
 * Props:
 * - sidebarOpen: boolean - controls width/visibility
 * - activeSessionId: number|null - currently open session
 * - onSelectSession(id): called when a session is clicked
 * - onNewChat(): called when "+ New Chat" is clicked
 * - onSessionDeleted(id): called after a session is deleted (so the parent
 *   can reset the chat view if the deleted session was active)
 * - refreshSignal: any value; whenever it changes, the sidebar reloads the
 *   session list (parent bumps this after sending a message)
 * - user: { Name/name } | null
 * - onLogout(): called when the logout button is clicked
 */
export default function ChatSidebar({
  sidebarOpen,
  activeSessionId,
  onSelectSession,
  onNewChat,
  onSessionDeleted,
  onActiveTitleChange,
  refreshSignal,
  user,
  onLogout,
}) {
  const router = useRouter();

  const [sessions, setSessions] = useState([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Profile / account menu state
  const [pictureUrl, setPictureUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const renameInputRef = useRef(null);
  const menuRef = useRef(null); // session item "..." menu
  const accountMenuRef = useRef(null); // account/profile menu

  const normalizeSession = (s) => ({
    id: s.id ?? s.Id,
    title: s.title ?? s.Title,
    lastMessageDate: s.lastMessageDate ?? s.LastMessageDate,
    isPinned: s.isPinned ?? s.IsPinned ?? false,
  });

  const loadSessions = useCallback(async () => {
    try {
      const res = await api.get("/chatsession/list");
      setSessions(res.data.map(normalizeSession));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, refreshSignal]);

  // Load profile picture (falls back to initial avatar if it fails / no user prop)
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/settings/profile");
        const data = res.data;
        const pic = data.profilePictureUrl || data.ProfilePictureUrl;
        setPictureUrl(pic ? `${FILE_BASE}${pic}` : null);
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const active = sessions.find((s) => s.id === activeSessionId);
    onActiveTitleChange?.(active ? active.title : null);
  }, [sessions, activeSessionId, onActiveTitleChange]);

  useEffect(() => {
    if (renamingId !== null) renameInputRef.current?.focus();
  }, [renamingId]);

  // Close session "..." menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close account menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const startRename = (session) => {
    setRenamingId(session.id);
    setRenameValue(session.title);
    setOpenMenuId(null);
  };

  const confirmRename = async (id) => {
    const newTitle = renameValue.trim() || "New Chat";
    setSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle } : s))
    );
    setRenamingId(null);
    try {
      await api.put(`/chatsession/rename/${id}`, JSON.stringify(newTitle), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      loadSessions();
    }
  };

  const togglePin = async (session) => {
    setOpenMenuId(null);
    setSessions((prev) =>
      prev.map((s) => (s.id === session.id ? { ...s, isPinned: !s.isPinned } : s))
    );
    try {
      await api.put(`/chatsession/pin/${session.id}`);
      loadSessions();
    } catch (err) {
      console.error(err);
      loadSessions();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setSessions((prev) => prev.filter((s) => s.id !== id));
    onSessionDeleted?.(id);
    try {
      await api.delete(`/chatsession/delete/${id}`);
    } catch (err) {
      console.error(err);
      loadSessions();
    }
  };

  const handleLogout = () => {
    setMenuOpen(false);
    if (onLogout) {
      onLogout();
      return;
    }
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

  const formatSidebarDate = (d) => {
    const date = new Date(d);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) {
      return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const displayName = user?.Name || user?.name || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  const pinnedSessions = sessions.filter((s) => s.isPinned);
  const recentSessions = sessions.filter((s) => !s.isPinned);

  const SessionItem = ({ s }) => (
    <div
      className={`group relative flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer text-sm transition-colors ${
        activeSessionId === s.id ? "bg-white/10" : "hover:bg-white/5"
      }`}
      onClick={() => renamingId !== s.id && onSelectSession(s.id)}
    >
      <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0">
        <MessageCircle className="w-3 h-3 text-indigo-300" />
      </div>
      {renamingId === s.id ? (
        <div
          className="flex items-center gap-1 flex-1 min-w-0"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            ref={renameInputRef}
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmRename(s.id);
              if (e.key === "Escape") setRenamingId(null);
            }}
            className="flex-1 min-w-0 bg-[#3a2f5c] text-slate-100 text-sm rounded-md px-2 py-1 outline-none"
          />
          <button onClick={() => confirmRename(s.id)}>
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          </button>
          <button onClick={() => setRenamingId(null)}>
            <X className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      ) : (
        <>
          <span className="flex-1 min-w-0 truncate text-slate-200">{s.title}</span>
          <span className="text-xs text-slate-500 group-hover:hidden shrink-0">
            {formatSidebarDate(s.lastMessageDate)}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenMenuId(openMenuId === s.id ? null : s.id);
            }}
            className="hidden group-hover:flex text-slate-400 hover:text-slate-100 shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {openMenuId === s.id && (
            <div
              ref={menuRef}
              className="absolute right-0 top-9 z-20 w-40 bg-[#2a1f47] border border-white/10 rounded-xl shadow-xl py-1"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => togglePin(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                {s.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                {s.isPinned ? "Unpin" : "Pin"}
              </button>
              <button
                onClick={() => startRename(s)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                <Pencil className="w-3.5 h-3.5" />
                Rename
              </button>
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  setDeleteTarget(s);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <>
      <div
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } transition-all duration-200 bg-[#0f0b28] text-slate-100 border-r border-white/10 flex flex-col overflow-hidden shrink-0`}
      >
        <div className="p-3 flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-sm truncate">Memory Guardian</span>
        </div>

        <div className="px-3 pb-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 border border-white/10 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/5 transition-colors"
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Plus className="w-3 h-3 text-white" />
            </div>
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-2 space-y-0.5">
          {loadingSessions ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6 px-4">
              No chats yet. Start typing to begin.
            </p>
          ) : (
            <>
              {pinnedSessions.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs font-semibold text-slate-500 px-3 py-1.5 uppercase tracking-wide">
                    Pinned
                  </p>
                  {pinnedSessions.map((s) => (
                    <SessionItem key={s.id} s={s} />
                  ))}
                </div>
              )}
              {recentSessions.length > 0 && (
                <div>
                  {pinnedSessions.length > 0 && (
                    <p className="text-xs font-semibold text-slate-500 px-3 py-1.5 uppercase tracking-wide">
                      Recent
                    </p>
                  )}
                  {recentSessions.map((s) => (
                    <SessionItem key={s.id} s={s} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* User profile footer */}
        <div className="relative mt-4 pt-3 border-t border-white/10" ref={accountMenuRef}>
          <div className="flex items-center gap-2.5 px-2 py-1">
            {pictureUrl ? (
              <img
                src={pictureUrl}
                alt={displayName}
                className="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-semibold text-white shrink-0">
                {initial}
              </div>
            )}
            <span className="text-sm font-medium text-white truncate flex-1 min-w-0">
              {displayName}
            </span>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              title="Account menu"
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-indigo-200/70 hover:text-white transition-colors shrink-0"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>

          {menuOpen && (
            <div className="absolute bottom-full right-0 mb-2 w-44 bg-[#1a1438] border border-white/10 rounded-xl shadow-xl py-1 z-20">
              <a
                href="/settings"
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                <Settings className="w-3.5 h-3.5" />
                Settings
              </a>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-200 hover:bg-white/5"
              >
                <LogOut className="w-3.5 h-3.5" />
                Logout
              </button>
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteError("");
                  setDeleteModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {deleteModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => !deleting && setDeleteModalOpen(false)}
        >
          <div
            className="bg-[#2a1f47] rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Delete your account?</h3>
            <p className="text-sm text-slate-400 mb-6">
              This will permanently delete your account and all associated data. This action
              cannot be undone.
            </p>
            {deleteError && (
              <p className="text-xs text-red-400 mb-4">{deleteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-50"
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

      {/* Delete chat session confirmation modal */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div
            className="bg-[#2a1f47] rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-100 mb-1">Delete this chat?</h3>
            <p className="text-sm text-slate-400 mb-6">
              &quot;{deleteTarget.title}&quot; will be permanently deleted. This action cannot be
              undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-200 bg-white/5 hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import api from "@/lib/axios";
import {
  Brain,
  LayoutDashboard,
  MessageCircle,
  Sparkles,
  FileText,
  History,
  Search,
  Settings,
  HelpCircle,
  LogOut,
  MoreVertical,
  Trash2,
  Loader2,
  Menu,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "AI Chat", icon: MessageCircle },
  { href: "/promises", label: "Promises", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/timeline", label: "Timeline", icon: History },
  { href: "/search", label: "Search", icon: Search },
];

// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";

/**
 * Shared dark sidebar used across the app's main pages.
 * `active` lets a page force-highlight a section (defaults to matching the current path).
 */
export default function Sidebar({ active }) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [pictureUrl, setPictureUrl] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  const menuRef = useRef(null);

  const isActive = (href) => (active ? active === href : pathname?.startsWith(href));

  // Close the mobile drawer whenever the user navigates to a new page.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get("/settings/profile");
        const data = res.data;
        setUser(data);
        const pic = data.profilePictureUrl || data.ProfilePictureUrl;
        setPictureUrl(pic ? `${FILE_BASE}${pic}` : null);
      } catch (err) {
        console.error(err);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
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

  const displayName = user?.name || user?.Name || "Account";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      {/* Mobile top bar — only visible below the lg breakpoint (phones/tablets) */}
      <div className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-[#0f0b28]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-sm leading-tight">Memory Guardian</span>
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Backdrop, shown behind the drawer on mobile/tablet */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={`w-64 shrink-0 bg-[#0f0b28] flex flex-col px-4 py-6 overflow-y-auto
          fixed inset-y-0 left-0 z-50 h-screen transition-transform duration-300 ease-in-out
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto`}
      >
        {/* Brand (desktop only — mobile shows it in the top bar above) */}
        <div className="hidden lg:flex items-center gap-3 px-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white leading-tight">Memory Guardian</span>
        </div>

        {/* Close button (mobile only) */}
        <div className="flex lg:hidden items-center justify-between px-2 mb-6">
          <span className="font-bold text-white leading-tight">Menu</span>
          <button
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-900/40"
                    : "text-indigo-200/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon className="w-4.5 h-4.5" />
                {item.label}
              </a>
            );
          })}

          <div className="h-px bg-white/10 my-4" />

          <a
            href="/settings"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <Settings className="w-4.5 h-4.5" />
            Settings
          </a>
          <a
            href="/help"
            className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-indigo-200/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <HelpCircle className="w-4.5 h-4.5" />
            Help &amp; Support
          </a>
        </nav>

        {/* User profile footer */}
        <div className="relative mt-4 pt-3 border-t border-white/10" ref={menuRef}>
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
      </aside>

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
    </>
  );
}
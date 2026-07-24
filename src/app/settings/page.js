"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import {
  User,
  Mail,
  Lock,
  Camera,
  Trash2,
  Bell,
  Smartphone,
  Mail as MailIcon,
  Loader2,
  Check,
  Save,
  Sun,
  Moon,
  Monitor,
  Download,
  Database,
  ShieldCheck,
  Laptop,
  Globe,
  AlertTriangle,
} from "lucide-react";

import { applyTheme, setTheme as persistTheme, getStoredTheme } from "@/lib/theme";
import { subscribeToPush, unsubscribeFromPush } from "@/lib/push";

// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";

function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 shrink-0 rounded-full p-0.5 flex items-center transition-colors duration-200 ${
        checked
          ? "bg-gradient-to-r from-indigo-600 to-purple-600 justify-end"
          : "bg-slate-300 dark:bg-slate-600 justify-start"
      }`}
    >
      <span className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200" />
    </button>
  );
}

function SavedBadge({ show }) {
  if (!show) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
      <Check className="w-3.5 h-3.5" /> Saved
    </span>
  );
}

function Card({ icon: Icon, title, action, children }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-700 break-inside-avoid mb-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
          {Icon && <Icon className="w-4.5 h-4.5 text-indigo-500 dark:text-indigo-400" />} {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// Best-effort, client-side only detection of the current browser/OS so the
// "Login Sessions" card can show real info about *this* device. We don't
// have a backend session store yet, so we never fabricate other devices.
function detectDevice() {
  if (typeof navigator === "undefined") return { browser: "Unknown browser", os: "Unknown OS" };
  const ua = navigator.userAgent;
  let browser = "Browser";
  if (ua.includes("Edg/")) browser = "Edge";
  else if (ua.includes("Chrome/") && !ua.includes("OPR/")) browser = "Chrome";
  else if (ua.includes("Firefox/")) browser = "Firefox";
  else if (ua.includes("Safari/") && !ua.includes("Chrome")) browser = "Safari";

  let os = "your device";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Linux")) os = "Linux";

  return { browser, os };
}

// Reusable input classes so text stays readable in both themes and
// placeholder text isn't a faint, unreadable gray in dark mode.
const inputClass =
  "w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/60 " +
  "text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-400 " +
  "rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent";

export default function SettingsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [device, setDevice] = useState({ browser: "Browser", os: "your device" });

  // profile form
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileError, setProfileError] = useState("");

  // password form
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSaved, setPwdSaved] = useState(false);
  const [pwdError, setPwdError] = useState("");

  // notifications
  const [notif, setNotif] = useState({ NotifyEmail: true, NotifyPush: true });
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);
  const [pushStatus, setPushStatus] = useState(""); // "", "loading", "error:<reason>"

  // picture
  const [pictureUrl, setPictureUrl] = useState(null);
  const [pictureUploading, setPictureUploading] = useState(false);
  const [pictureError, setPictureError] = useState("");

  // appearance (persisted locally + applied app-wide via the `dark` class on <html>)
  const [theme, setTheme] = useState("system");

  // data & privacy
  const [exporting, setExporting] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [deleteStep, setDeleteStep] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadProfile();
    setDevice(detectDevice());

    const savedTheme = getStoredTheme();
    setTheme(savedTheme);
  }, [router]);

  // Instantly preview the chosen theme on this page; ThemeManager (mounted
  // in the root layout) keeps it in sync everywhere else, including when
  // the OS-level "system" preference changes.
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const loadProfile = async () => {
    try {
      const res = await api.get("/settings/profile");
      const data = res.data;
      setUser(data);
      setProfile({
        name: data.name || data.Name || "",
        email: data.email || data.Email || "",
      });
      setNotif({
        NotifyEmail: data.notifyEmail ?? data.NotifyEmail ?? true,
        NotifyPush: data.notifyPush ?? data.NotifyPush ?? true,
      });
      const pic = data.profilePictureUrl || data.ProfilePictureUrl;
      setPictureUrl(pic ? `${FILE_BASE}${pic}` : null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  const initials = (profile.name || "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileError("");
    setProfileSaving(true);
    setProfileSaved(false);
    try {
      await api.put("/settings/profile", {
        name: profile.name,
        email: profile.email,
      });
      const stored = JSON.parse(localStorage.getItem("user") || "{}");
      localStorage.setItem(
        "user",
        JSON.stringify({ ...stored, Name: profile.name, Email: profile.email })
      );
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    } catch (err) {
      setProfileError(err.response?.data?.message || "Could not update profile.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    setPwdError("");
    if (pwd.next.length < 6) {
      setPwdError("New password must be at least 6 characters.");
      return;
    }
    if (pwd.next !== pwd.confirm) {
      setPwdError("New password and confirmation do not match.");
      return;
    }
    setPwdSaving(true);
    setPwdSaved(false);
    try {
      await api.put("/settings/password", {
        currentPassword: pwd.current,
        newPassword: pwd.next,
      });
      setPwd({ current: "", next: "", confirm: "" });
      setPwdSaved(true);
      setTimeout(() => setPwdSaved(false), 2500);
    } catch (err) {
      setPwdError(err.response?.data?.message || "Could not change password.");
    } finally {
      setPwdSaving(false);
    }
  };

  const handleNotifChange = (key, value) => {
    setNotif((prev) => ({ ...prev, [key]: value }));
  };

  const saveNotifications = async (next) => {
    setNotifSaving(true);
    setNotifSaved(false);
    try {
      await api.put("/settings/notifications", next);
      setNotifSaved(true);
      setTimeout(() => setNotifSaved(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setNotifSaving(false);
    }
  };

  const handleToggle = async (key) => {
    const turningOn = !notif[key];
    const next = { ...notif, [key]: turningOn };

    if (key === "NotifyPush") {
      setPushStatus("loading");
      if (turningOn) {
        const result = await subscribeToPush();
        if (!result.ok) {
          setPushStatus(`error:${result.reason}`);
          return; // don't flip the toggle or save if the browser refused
        }
        setPushStatus("");
      } else {
        await unsubscribeFromPush();
        setPushStatus("");
      }
    }

    setNotif(next);
    saveNotifications(next);
  };

  const handlePictureSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPictureError("");
    setPictureUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/settings/picture", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data.profilePictureUrl || res.data.ProfilePictureUrl;
      setPictureUrl(url ? `${FILE_BASE}${url}` : null);
    } catch (err) {
      setPictureError(err.response?.data?.message || "Could not upload image.");
    } finally {
      setPictureUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePicture = async () => {
    setPictureUploading(true);
    try {
      await api.delete("/settings/picture");
      setPictureUrl(null);
    } catch (err) {
      console.error(err);
    } finally {
      setPictureUploading(false);
    }
  };

  const handleThemeChange = (value) => {
    setTheme(value);
    persistTheme(value);
  };

  const downloadJson = (payload, filename) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportData = () => {
    setExporting(true);
    try {
      downloadJson(
        {
          exportedAt: new Date().toISOString(),
          profile,
          notificationPreferences: notif,
        },
        `memory-guardian-data-${Date.now()}.json`
      );
    } finally {
      setExporting(false);
    }
  };

  const handleBackupData = () => {
    setBackingUp(true);
    try {
      downloadJson(
        {
          backupCreatedAt: new Date().toISOString(),
          profile,
          notificationPreferences: notif,
        },
        `memory-guardian-backup-${Date.now()}.json`
      );
    } finally {
      setBackingUp(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    setDeleteError("");
    try {
      await api.delete("/settings/account");
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.push("/login");
    } catch (err) {
      setDeleteError(err.response?.data?.message || "Could not delete account.");
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row">
        <Sidebar active="/settings" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row">
      <Sidebar active="/settings" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1600px] w-full min-w-0">
        <TopNavbar
          title="Settings"
          subtitle="Manage your profile, security and notification preferences."
        />

        <div className="columns-1 lg:columns-3 gap-6">
          {/* Profile */}
          <Card icon={User} title="Profile">
            <div className="flex items-center gap-5 mb-6">
              <div className="relative">
                {pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pictureUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover border-4 border-indigo-50 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-indigo-50 dark:border-slate-700">
                    {initials}
                  </div>
                )}
                {pictureUploading && (
                  <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors"
                  title="Change photo"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  className="hidden"
                  onChange={handlePictureSelect}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Profile photo</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">JPG, PNG or WEBP. Max 5MB.</p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    Upload new
                  </button>
                  {pictureUrl && (
                    <button
                      onClick={handleRemovePicture}
                      className="text-xs font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                {pictureError && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{pictureError}</p>}
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Full Name</label>
                <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-[38px]" />
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Email Address</label>
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-[38px]" />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              {profileError && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 p-3 rounded-xl text-sm">
                  {profileError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
                <SavedBadge show={profileSaved} />
              </div>
            </form>
          </Card>

          {/* Security */}
          <Card icon={Lock} title="Security">
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 mb-4">
              Change your password to keep your account secure.
            </p>
            <form onSubmit={handlePasswordSave} className="space-y-4">
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Current Password</label>
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-[38px]" />
                <input
                  type="password"
                  placeholder="Enter current password"
                  value={pwd.current}
                  onChange={(e) => setPwd({ ...pwd, current: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">New Password</label>
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-[38px]" />
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={pwd.next}
                  onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div className="relative">
                <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Confirm New Password</label>
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-[38px]" />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={pwd.confirm}
                  onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>

              {pwdError && (
                <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900 p-3 rounded-xl text-sm">
                  {pwdError}
                </div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="submit"
                  disabled={pwdSaving}
                  className="inline-flex items-center gap-2 bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {pwdSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                  Update Password
                </button>
                <SavedBadge show={pwdSaved} />
              </div>
            </form>
          </Card>

          {/* Notification preferences */}
          <Card
            icon={Bell}
            title="Notification Preferences"
            action={
              notifSaving ? (
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
              ) : (
                <SavedBadge show={notifSaved} />
              )
            }
          >
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 mb-2">
              Choose how you want to be notified.
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <MailIcon className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Email Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Reminders, promises &amp; document alerts.
                    </p>
                  </div>
                </div>
                <Toggle checked={notif.NotifyEmail} onChange={() => handleToggle("NotifyEmail")} />
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                    <Smartphone className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Push Notifications</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">In-app and browser push alerts.</p>
                  </div>
                </div>
                <Toggle checked={notif.NotifyPush} onChange={() => handleToggle("NotifyPush")} />
              </div>
              {pushStatus === "loading" && (
                <p className="text-xs text-slate-500 dark:text-slate-400 pb-3">Setting up push notifications…</p>
              )}
              {pushStatus === "error:permission-denied" && (
                <p className="text-xs text-red-600 dark:text-red-400 pb-3">
                  Notifications are blocked for this site in your browser. Allow notifications for this site and try again.
                </p>
              )}
              {pushStatus === "error:not-supported" && (
                <p className="text-xs text-red-600 dark:text-red-400 pb-3">
                  This browser doesn&apos;t support push notifications.
                </p>
              )}
              {(pushStatus === "error:no-vapid-key" || pushStatus === "error:backend-error") && (
                <p className="text-xs text-red-600 dark:text-red-400 pb-3">
                  Push notifications aren&apos;t fully set up on the server yet. Please try again later.
                </p>
              )}
            </div>
          </Card>

          {/* Appearance */}
          <Card icon={Monitor} title="Appearance">
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 mb-4">
              Customize the look and feel of the application.
            </p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "light", label: "Light Mode", caption: "Clean and bright", icon: Sun },
                { key: "dark", label: "Dark Mode", caption: "Easy on the eyes", icon: Moon },
                { key: "system", label: "System", caption: "Use device settings", icon: Monitor },
              ].map((opt) => {
                const Icon = opt.icon;
                const selected = theme === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => handleThemeChange(opt.key)}
                    className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-colors ${
                      selected
                        ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40 ring-2 ring-indigo-100 dark:ring-indigo-900"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${
                        selected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"
                      }`}
                    />
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-100">{opt.label}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      {opt.caption}
                    </span>
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 mt-1 ${
                        selected
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-slate-300 dark:border-slate-500"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-4">
              Your choice applies across the whole app and is saved to this browser.
            </p>
          </Card>

          {/* Data & Privacy */}
          <Card icon={ShieldCheck} title="Data & Privacy">
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 mb-2">
              Manage your data and privacy settings.
            </p>
            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
                    <Download className="w-4.5 h-4.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Export Data</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Download a copy of your profile data.</p>
                  </div>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exporting}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  {exporting ? "Exporting…" : "Export"}
                </button>
              </div>

              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                    <Database className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Backup Data</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Save a local backup of your settings.</p>
                  </div>
                </div>
                <button
                  onClick={handleBackupData}
                  disabled={backingUp}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 border border-indigo-100 dark:border-indigo-900 rounded-lg px-3 py-1.5 disabled:opacity-50"
                >
                  {backingUp ? "Saving…" : "Backup"}
                </button>
              </div>

              <div className="py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950/50 flex items-center justify-center shrink-0">
                      <Trash2 className="w-4.5 h-4.5 text-red-500 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Delete Account</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Permanently delete your account.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteStep(true)}
                    className="text-xs font-semibold text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 border border-red-100 dark:border-red-900 rounded-lg px-3 py-1.5"
                  >
                    Delete
                  </button>
                </div>
                {deleteStep && (
                  <div className="mt-3 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-xl p-3 text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-1">This can&apos;t be undone.</p>
                      <p className="mb-2">
                        This will permanently delete your account, promises, documents and chat history.
                      </p>
                      {deleteError && <p className="mb-2 font-semibold">{deleteError}</p>}
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleDeleteAccount}
                          disabled={deletingAccount}
                          className="font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded-lg disabled:opacity-60"
                        >
                          {deletingAccount ? "Deleting..." : "Yes, delete my account"}
                        </button>
                        <button
                          onClick={() => setDeleteStep(false)}
                          disabled={deletingAccount}
                          className="font-semibold text-red-700 dark:text-red-400 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Login Sessions */}
          <Card icon={Laptop} title="Login Sessions">
            <p className="text-xs text-slate-500 dark:text-slate-400 -mt-3 mb-4">Manage your active sessions.</p>

            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Current Session</p>
                </div>
                <span className="text-[11px] font-semibold text-white bg-emerald-500 px-2 py-0.5 rounded-full">
                  Active now
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {device.browser} on {device.os} · This device
              </p>
            </div>

            <div className="flex items-start gap-2 text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/40 border border-slate-100 dark:border-slate-700 rounded-xl p-3">
              <Globe className="w-4 h-4 shrink-0 mt-0.5" />
              <p>Session history from other devices will show up here once you sign in elsewhere.</p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
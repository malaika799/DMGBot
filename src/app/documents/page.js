"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import {
  Upload,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Trash2,
  Loader2,
  Download,
  Eye,
  X,
  Search,
  SlidersHorizontal,
  Star,
  Grid2X2,
  List,
  Folder,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
} from "lucide-react";

const CATEGORIES = ["Passport", "ID Card", "Insurance", "Medical", "Legal", "Other"];
const PAGE_SIZE = 8;
// Uploaded files live behind the backend's /files static route, which the
// browser can't reach directly (HTTPS page, HTTP-only backend), so route
// through the same /api/proxy that every other API call already uses.
const FILE_BASE = "/api/proxy";

const FILE_STYLES = {
  pdf: { Icon: FileText, bg: "bg-gradient-to-br from-rose-500 to-red-600" },
  docx: { Icon: FileText, bg: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  doc: { Icon: FileText, bg: "bg-gradient-to-br from-blue-500 to-indigo-600" },
  xlsx: { Icon: FileSpreadsheet, bg: "bg-gradient-to-br from-emerald-500 to-teal-600" },
  jpg: { Icon: ImageIcon, bg: "bg-gradient-to-br from-amber-500 to-orange-600" },
  jpeg: { Icon: ImageIcon, bg: "bg-gradient-to-br from-amber-500 to-orange-600" },
  png: { Icon: ImageIcon, bg: "bg-gradient-to-br from-amber-500 to-orange-600" },
};

const fileStyle = (type) => FILE_STYLES[(type || "").toLowerCase()] || { Icon: FileText, bg: "bg-gradient-to-br from-indigo-500 to-purple-600" };

export default function DocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Other");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [renameTarget, setRenameTarget] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [renaming, setRenaming] = useState(false);

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("Latest");
  const [view, setView] = useState("grid");
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState(() => new Set());
  const [menuOpenId, setMenuOpenId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadDocuments();
    try {
      const saved = JSON.parse(localStorage.getItem("dmg_doc_favorites") || "[]");
      setFavorites(new Set(saved));
    } catch {}
  }, [router]);

  const normalize = (d) => ({
    id: d.id ?? d.Id,
    fileName: d.fileName ?? d.FileName,
    title: d.title ?? d.Title ?? "",
    fileType: d.fileType ?? d.FileType,
    filePath: d.filePath ?? d.FilePath,
    category: d.category ?? d.Category,
    fileSizeBytes: d.fileSizeBytes ?? d.FileSizeBytes,
    uploadDate: d.uploadDate ?? d.UploadDate,
  });

  const loadDocuments = async () => {
    try {
      const res = await api.get("/document/list");
      setDocuments(res.data.map(normalize));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("dmg_doc_favorites", JSON.stringify([...next]));
      return next;
    });
  };

  const handleFileSelect = (file) => {
    if (!file) return;
    setError("");
    setPendingFile(file);
    setTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleUpload = async () => {
    if (!pendingFile) return;
    setUploading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", pendingFile);
    formData.append("category", category);
    formData.append("title", title.trim() || pendingFile.name);

    try {
      const res = await api.post("/document/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const saved = normalize(res.data);
      // Fallback in case the backend doesn't echo the title back yet.
      if (!saved.title) saved.title = title.trim() || pendingFile.name;
      setDocuments((prev) => [saved, ...prev]);
      setPendingFile(null);
      setTitle("");
      setCategory("Other");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const openRename = (d) => {
    setRenameTarget(d);
    setRenameValue(d.title || d.fileName);
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const newTitle = renameValue.trim();
    if (!newTitle) return;
    setRenaming(true);
    try {
      await api.put(`/document/update/${renameTarget.id}`, { title: newTitle });
      setDocuments((prev) =>
        prev.map((d) => (d.id === renameTarget.id ? { ...d, title: newTitle } : d))
      );
      setRenameTarget(null);
    } catch (err) {
      setError(err.response?.data?.message || "Could not rename the document.");
    } finally {
      setRenaming(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    try {
      await api.delete(`/document/delete/${id}`);
    } catch (err) {
      console.error(err);
      loadDocuments();
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return "0 KB";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(0)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const filtered = useMemo(() => {
    let list = [...documents];
    if (categoryFilter !== "All") list = list.filter((d) => d.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) => d.fileName?.toLowerCase().includes(q) || d.title?.toLowerCase().includes(q)
      );
    }
    if (sortBy === "Latest") list.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
    if (sortBy === "Oldest") list.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
    if (sortBy === "Name") list.sort((a, b) => (a.fileName || "").localeCompare(b.fileName || ""));
    if (sortBy === "Size") list.sort((a, b) => (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0));
    return list;
  }, [documents, categoryFilter, search, sortBy]);

  useEffect(() => setPage(1), [search, categoryFilter, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  const onDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#120c2e] dark:via-[#1a1240] dark:to-[#150c33] flex flex-col lg:flex-row">
      <Sidebar active="/documents" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1500px] w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Documents <Folder className="w-6 h-6 text-indigo-400" />
            </h1>
            <p className="text-slate-500 dark:text-indigo-200/60 text-sm mt-1">Store and access your important files whenever you need them.</p>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-4 py-2 rounded-full shadow-md shadow-indigo-900/40"
          >
            <Grid2X2 className="w-4 h-4" />
            Dashboard
          </a>
        </div>

        {/* Upload dropzone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={onDrop}
          className={`bg-white dark:bg-white/[0.04] rounded-2xl border p-6 mb-6 transition-colors ${
            dragActive ? "border-indigo-400 bg-indigo-500/10" : "border-slate-200 dark:border-white/10"
          }`}
        >
          {!pendingFile ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-200 dark:border-white/15 rounded-xl py-10 flex flex-col items-center gap-2 hover:border-indigo-400 hover:bg-white dark:hover:bg-white/5 transition-colors"
            >
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-900/40">
                <Upload className="w-7 h-7 text-slate-800 dark:text-white" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">
                Drag &amp; drop files here or click to upload
              </p>
              <p className="text-xs text-slate-500 dark:text-indigo-200/50">PDF, JPG, PNG, DOCX — up to 10MB</p>
            </button>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 text-slate-500 dark:text-indigo-300 shrink-0" />
                  <span className="text-sm text-slate-800 dark:text-white truncate">{pendingFile.name}</span>
                </div>
                <button
                  onClick={() => {
                    setPendingFile(null);
                    setTitle("");
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="text-slate-500 dark:text-indigo-200/50 hover:text-red-400 shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 dark:text-indigo-200/60 mb-1 block">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give this document a clear title"
                  className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      category === c
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white"
                        : "bg-white dark:bg-white/5 text-slate-600 dark:text-indigo-200/70 hover:bg-white dark:hover:bg-white/10"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <button
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-gradient-to-br from-indigo-600 to-purple-600 text-white py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 shadow-md shadow-indigo-900/40"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Upload className="w-4 h-4" /> Upload File</>}
              </button>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.docx"
            onChange={(e) => handleFileSelect(e.target.files[0])}
            className="hidden"
          />

          {error && <p className="text-red-400 text-xs mt-3 text-center">{error}</p>}
        </div>

        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-500 dark:text-indigo-200/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-indigo-200/30 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setFilterOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 px-3.5 py-2.5 rounded-xl transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" /> Filter
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-3 z-20 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-indigo-200/50 mb-1.5">Category</p>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none"
                    >
                      <option className="bg-white dark:bg-[#1a1240]">All</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} className="bg-white dark:bg-[#1a1240]">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-indigo-200/50 mb-1.5">Sort by</p>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm text-slate-800 dark:text-white focus:outline-none"
                    >
                      {["Latest", "Oldest", "Name", "Size"].map((s) => (
                        <option key={s} className="bg-white dark:bg-[#1a1240]">{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-1">
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-colors ${view === "grid" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-indigo-200/50 hover:text-slate-800 dark:hover:text-white"}`}
              >
                <Grid2X2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView("list")}
                className={`p-1.5 rounded-lg transition-colors ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-500 dark:text-indigo-200/50 hover:text-slate-800 dark:hover:text-white"}`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-white dark:bg-white/5 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-500 dark:text-indigo-200/50 text-sm">
              {documents.length === 0 ? "No documents uploaded yet." : "No documents match your search."}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {pageItems.map((d) => {
              const { Icon, bg } = fileStyle(d.fileType);
              const isFav = favorites.has(d.id);
              return (
                <div
                  key={d.id}
                  className="bg-white dark:bg-white/[0.04] rounded-2xl p-5 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/[0.07] transition-all duration-300 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
                      <Icon className="w-5 h-5 text-slate-800 dark:text-white" />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => openRename(d)} title="Edit title" className="text-slate-400 dark:text-indigo-200/40 hover:text-indigo-500 dark:hover:text-white">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => toggleFavorite(d.id)}>
                        <Star className={`w-4 h-4 transition-colors ${isFav ? "fill-amber-400 text-amber-400" : "text-slate-400 dark:text-indigo-200/30 hover:text-amber-300"}`} />
                      </button>
                    </div>
                  </div>

                  <p className="text-sm font-semibold text-slate-800 dark:text-white truncate" title={d.title || d.fileName}>
                    {d.title || d.fileName}
                  </p>
                  {d.title && (
                    <p className="text-xs text-slate-400 dark:text-indigo-200/30 truncate">{d.fileName}</p>
                  )}
                  <p className="text-xs text-slate-500 dark:text-indigo-200/40 mt-1">
                    Uploaded {formatDate(d.uploadDate)} · {formatSize(d.fileSizeBytes)}
                  </p>
                  <span className="inline-block w-fit mt-2 text-xs font-semibold text-slate-500 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">
                    {d.category}
                  </span>

                  <div className="flex items-center gap-2 mt-4">
                    <a
                      href={`${FILE_BASE}${d.filePath}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 rounded-lg py-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </a>
                    <a
                      href={`${FILE_BASE}${d.filePath}`}
                      download={d.fileName}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 rounded-lg py-2 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                    <button
                      onClick={() => setDeleteTarget(d)}
                      className="shrink-0 text-slate-500 dark:text-indigo-200/40 hover:text-red-400 transition-colors p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white dark:bg-white/[0.04] rounded-2xl border border-slate-200 dark:border-white/10 divide-y divide-slate-200 dark:divide-white/10 overflow-hidden">
            {pageItems.map((d) => {
              const { Icon, bg } = fileStyle(d.fileType);
              const isFav = favorites.has(d.id);
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-white dark:hover:bg-white/[0.03] transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className="w-4.5 h-4.5 text-slate-800 dark:text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 dark:text-white truncate" title={d.title || d.fileName}>
                      {d.title || d.fileName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-indigo-200/40">
                      {d.title ? `${d.fileName} · ` : ""}{formatDate(d.uploadDate)} · {formatSize(d.fileSizeBytes)}
                    </p>
                  </div>
                  <span className="hidden sm:inline-block text-xs font-semibold text-slate-500 dark:text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full shrink-0">
                    {d.category}
                  </span>
                  <button onClick={() => toggleFavorite(d.id)} className="shrink-0">
                    <Star className={`w-4 h-4 ${isFav ? "fill-amber-400 text-amber-400" : "text-slate-400 dark:text-indigo-200/30 hover:text-amber-300"}`} />
                  </button>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === d.id ? null : d.id)}
                      className="text-slate-500 dark:text-indigo-200/40 hover:text-slate-800 dark:hover:text-white p-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === d.id && (
                      <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-20">
                        <a
                          href={`${FILE_BASE}${d.filePath}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-600 dark:text-indigo-200/80 hover:bg-white dark:hover:bg-white/5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View
                        </a>
                        <a
                          href={`${FILE_BASE}${d.filePath}`}
                          download={d.fileName}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-600 dark:text-indigo-200/80 hover:bg-white dark:hover:bg-white/5"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                        <button
                          onClick={() => { setMenuOpenId(null); openRename(d); }}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-slate-600 dark:text-indigo-200/80 hover:bg-white dark:hover:bg-white/5"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit title
                        </button>
                        <button
                          onClick={() => { setMenuOpenId(null); setDeleteTarget(d); }}
                          className="w-full flex items-center gap-2 text-left px-3 py-2 text-sm text-red-500 dark:text-red-300 hover:bg-white dark:hover:bg-white/5"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && filtered.length > 0 && (
          <div className="flex items-center justify-between mt-6">
            <p className="text-xs text-slate-500 dark:text-indigo-200/50">
              Showing {(pageSafe - 1) * PAGE_SIZE + 1} to {Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length} documents
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe === 1}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-indigo-200/70 flex items-center justify-center disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).slice(0, 5).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-semibold ${
                    pageSafe === i + 1 ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-indigo-200/70 hover:bg-white dark:hover:bg-white/5"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe === totalPages}
                className="w-8 h-8 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-indigo-200/70 flex items-center justify-center disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Rename / edit title */}
      {renameTarget && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setRenameTarget(null)}
        >
          <div className="bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-4">
              <Pencil className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Edit title</h3>
            <p className="text-sm text-slate-500 dark:text-indigo-200/50 mb-4 truncate">
              File: {renameTarget.fileName}
            </p>
            <input
              type="text"
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveRename()}
              className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-slate-800 dark:text-white mb-6 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setRenameTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveRename}
                disabled={renaming || !renameValue.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-50 transition-colors"
              >
                {renaming ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setDeleteTarget(null)}
        >
          <div className="bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Delete this document?</h3>
            <p className="text-sm text-slate-500 dark:text-indigo-200/50 mb-6 truncate">
              &quot;{deleteTarget.fileName}&quot; will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors"
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
    </div>
  );
}
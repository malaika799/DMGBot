"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import {
  Star,
  ClipboardList,
  Clock3,
  CheckCircle2,
  PieChart,
  Search,
  SlidersHorizontal,
  Calendar,
  AlertCircle,
  MoreVertical,
  Trash2,
  Eye,
  Check,
  ExternalLink,
  User,
  Zap,
  Users2,
  Phone,
  Gift,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
} from "lucide-react";

const PAGE_SIZE = 4;

export default function PromisesPage() {
  const router = useRouter();
  const [promises, setPromises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("Pending");
  const [search, setSearch] = useState("");
  const [directionFilter, setDirectionFilter] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadPromises();
  }, [router]);

  const normalize = (p) => ({
    id: p.id ?? p.Id,
    personName: p.personName ?? p.PersonName,
    promiseText: p.promiseText ?? p.PromiseText,
    dueDate: p.dueDate ?? p.DueDate,
    status: p.status ?? p.Status,
    direction: p.direction ?? p.Direction ?? null,
    totalAmount: p.totalAmount ?? p.TotalAmount ?? null,
    paidAmount: p.paidAmount ?? p.PaidAmount ?? 0,
    remainingAmount: p.remainingAmount ?? p.RemainingAmount ?? null,
  });

  const formatMoney = (n) =>
    n === null || n === undefined
      ? null
      : Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 });

  const loadPromises = async () => {
    try {
      const res = await api.get("/promise/list");
      setPromises(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === "Completed" ? "Pending" : "Completed";
    setPromises((prev) =>
      prev.map((p) =>
        normalize(p).id === id ? { ...p, status: newStatus, Status: newStatus } : p
      )
    );
    setMenuOpenId(null);
    try {
      await api.put(`/promise/update/${id}`, JSON.stringify(newStatus), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (err) {
      console.error(err);
      loadPromises();
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    setDeleteTarget(null);
    setPromises((prev) => prev.filter((p) => normalize(p).id !== id));
    try {
      await api.delete(`/promise/delete/${id}`);
    } catch (err) {
      console.error(err);
      loadPromises();
    }
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate || status === "Completed") return false;
    return new Date(dueDate) < new Date();
  };

  const formatDate = (d) => {
    if (!d) return "No due date";
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const promiseIcon = (p) => {
    const t = (p.promiseText || "").toLowerCase();
    if (p.status === "Completed") return { Icon: CheckCircle2, bg: "bg-emerald-500/15", color: "text-emerald-400" };
    if (t.includes("bill") || t.includes("electric") || t.includes("pesco"))
      return { Icon: Zap, bg: "bg-rose-500/15", color: "text-rose-400" };
    if (t.includes("dentist") || t.includes("doctor") || t.includes("appointment"))
      return { Icon: Users2, bg: "bg-amber-500/15", color: "text-amber-400" };
    if (t.includes("call") || t.includes("lawyer"))
      return { Icon: Phone, bg: "bg-blue-500/15", color: "text-blue-400" };
    if (p.totalAmount !== null) return { Icon: Gift, bg: "bg-orange-500/15", color: "text-orange-400" };
    if (!p.dueDate && p.totalAmount === null) return { Icon: ClipboardList, bg: "bg-amber-500/15", color: "text-amber-400" };
    return { Icon: User, bg: "bg-violet-500/15", color: "text-violet-400" };
  };

  const normalized = promises.map(normalize);
  const allCount = normalized.length;
  const pendingCount = normalized.filter((p) => p.status === "Pending").length;
  const completedCount = normalized.filter((p) => p.status === "Completed").length;
  const completionRate = allCount === 0 ? 0 : Math.round((completedCount / allCount) * 100);

  const filtered = normalized.filter((p) => {
    if (filter !== "All" && p.status !== filter) return false;
    if (directionFilter !== "All" && p.direction !== directionFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.promiseText?.toLowerCase().includes(q) && !p.personName?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  useEffect(() => setPage(1), [filter, search, directionFilter]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gradient-to-br dark:from-[#120c2e] dark:via-[#1a1240] dark:to-[#150c33] flex flex-col lg:flex-row">
      <Sidebar active="/promises" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1500px] w-full min-w-0">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
              Promises <Star className="w-6 h-6 text-indigo-400" />
            </h1>
            <p className="text-slate-500 dark:text-indigo-200/60 text-sm mt-1">Track all your commitments and promises.</p>
          </div>
          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-4 py-2 rounded-full shadow-md shadow-indigo-900/40"
          >
            <PieChart className="w-4 h-4" />
            Dashboard
          </a>
        </div>

        {/* Filter tabs + search */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="flex gap-2">
            {["Pending", "Completed", "All"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-colors ${
                  filter === f
                    ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-900/40"
                    : "bg-white dark:bg-white/5 text-slate-600 dark:text-indigo-200/70 border border-slate-200 dark:border-white/10 hover:border-indigo-400/40 hover:bg-white dark:hover:bg-white/10"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 dark:text-indigo-300/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search promises..."
                className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-indigo-200/40 focus:outline-none focus:border-indigo-400/50 w-56"
              />
            </div>
            <div className="relative">
              <button
                onClick={() => setFilterOpen((o) => !o)}
                className="flex items-center gap-1.5 text-sm font-medium text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 px-4 py-2 rounded-xl transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filter
              </button>
              {filterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-2 z-20">
                  {["All", "ToReceive", "ToPay"].map((d) => (
                    <button
                      key={d}
                      onClick={() => {
                        setDirectionFilter(d);
                        setFilterOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm ${
                        directionFilter === d ? "bg-indigo-600 text-white" : "text-slate-600 dark:text-indigo-200/80 hover:bg-white dark:hover:bg-white/5"
                      }`}
                    >
                      {d === "All" ? "All directions" : d === "ToReceive" ? "They owe you" : "You owe them"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center mb-3">
              <ClipboardList className="w-5 h-5 text-indigo-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-indigo-200/60">Total Promises</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{allCount}</p>
            <p className="text-xs text-slate-500 dark:text-indigo-200/40 mt-0.5">All time</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center mb-3">
              <Clock3 className="w-5 h-5 text-amber-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-indigo-200/60">Pending</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{pendingCount}</p>
            <p className="text-xs text-slate-500 dark:text-indigo-200/40 mt-0.5">Active promises</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-indigo-200/60">Completed</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{completedCount}</p>
            <p className="text-xs text-slate-500 dark:text-indigo-200/40 mt-0.5">Total closed</p>
          </div>
          <div className="bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center mb-3">
              <PieChart className="w-5 h-5 text-blue-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-indigo-200/60">Completion Rate</p>
            <p className="text-2xl font-bold text-slate-800 dark:text-white">{completionRate}%</p>
            <p className="text-xs text-slate-500 dark:text-indigo-200/40 mt-0.5">Overall progress</p>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
          </div>
        ) : pageItems.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-slate-500 dark:text-indigo-200/50 text-sm">No promises found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pageItems.map((p) => {
              const overdue = isOverdue(p.dueDate, p.status);
              const { Icon, bg, color } = promiseIcon(p);
              const hasMoney = p.totalAmount !== null;
              const percent = hasMoney && p.totalAmount > 0 ? Math.min(100, Math.round((p.paidAmount / p.totalAmount) * 100)) : null;

              return (
                <div
                  key={p.id}
                  className={`relative bg-white dark:bg-white/5 border rounded-2xl p-5 flex items-start gap-4 transition-colors ${
                    overdue ? "border-red-500/40" : "border-slate-200 dark:border-white/10 hover:border-indigo-400/30"
                  }`}
                >
                  <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 ${color}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold text-slate-800 dark:text-white ${p.status === "Completed" ? "line-through opacity-60" : ""}`}>
                      {p.promiseText}
                    </p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-500 dark:text-indigo-300 bg-indigo-500/15 px-2.5 py-1 rounded-full">
                        {p.personName}
                      </span>
                      {p.direction && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                            p.direction === "ToReceive" ? "text-emerald-300 bg-emerald-500/15" : "text-orange-300 bg-orange-500/15"
                          }`}
                        >
                          {p.direction === "ToReceive" ? "They owe you" : "You owe them"}
                        </span>
                      )}
                      <span
                        className={`text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-full ${
                          overdue ? "text-red-500 dark:text-red-300 bg-red-100 dark:bg-red-500/15" : "text-slate-500 dark:text-indigo-200/50 bg-white dark:bg-white/5"
                        }`}
                      >
                        {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                        {formatDate(p.dueDate)}
                        {overdue && " (Overdue)"}
                      </span>
                    </div>
                  </div>

                  {hasMoney ? (
                    <div className="w-56 shrink-0 hidden md:block">
                      <p className="text-xs text-slate-500 dark:text-indigo-200/50 mb-1">{percent}% Complete</p>
                      <div className="w-full h-1.5 rounded-full bg-white dark:bg-white/10 overflow-hidden mb-3">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" style={{ width: `${percent}%` }} />
                      </div>
                      <div className="flex justify-between text-xs">
                        <div>
                          <p className="text-slate-500 dark:text-indigo-200/40">Total</p>
                          <p className="font-semibold text-slate-800 dark:text-white">{formatMoney(p.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-indigo-200/40">Paid</p>
                          <p className="font-semibold text-emerald-400">{formatMoney(p.paidAmount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500 dark:text-indigo-200/40">Remaining</p>
                          <p className="font-semibold text-red-400">{formatMoney(p.remainingAmount)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="w-56 shrink-0 hidden md:block text-xs">
                      <p className="text-slate-500 dark:text-indigo-200/40 mb-1 flex items-center gap-1"><Calendar className="w-3 h-3" /> Due Date</p>
                      <p className="font-semibold text-slate-800 dark:text-white mb-2">{formatDate(p.dueDate)}</p>
                      <p className="text-slate-500 dark:text-indigo-200/40 mb-1">Status</p>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${
                        p.status === "Completed" ? "bg-emerald-500/15 text-emerald-300" : "bg-indigo-500/15 text-slate-500 dark:text-indigo-300"
                      }`}>
                        {p.status === "Completed" ? "Completed" : overdue ? "Overdue" : "Upcoming"}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col gap-2 shrink-0 w-36">
                    <button
                      onClick={() => setDetailTarget(p)}
                      className="flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 px-3 py-2 rounded-lg transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Details
                    </button>
                    {p.status !== "Completed" && p.direction === "ToPay" && hasMoney && p.remainingAmount > 0 ? (
                      <a
                        href="/chat"
                        className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-2 rounded-lg transition-colors"
                      >
                        Pay Now <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        onClick={() => toggleStatus(p.id, p.status)}
                        className={`flex items-center justify-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg transition-colors ${
                          p.status === "Completed"
                            ? "text-slate-600 dark:text-slate-300 bg-white dark:bg-white/10 hover:bg-white dark:hover:bg-white/20"
                            : "text-white bg-indigo-600 hover:bg-indigo-700"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" /> {p.status === "Completed" ? "Mark Pending" : "Mark Complete"}
                      </button>
                    )}
                  </div>

                  <div className="relative shrink-0">
                    <button
                      onClick={() => setMenuOpenId(menuOpenId === p.id ? null : p.id)}
                      className="text-slate-500 dark:text-indigo-200/40 hover:text-slate-800 dark:hover:text-white transition-colors p-1"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    {menuOpenId === p.id && (
                      <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-xl shadow-xl py-1 z-20">
                        <button
                          onClick={() => {
                            setMenuOpenId(null);
                            setDeleteTarget(p);
                          }}
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
              Showing {(pageSafe - 1) * PAGE_SIZE + 1} to {Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length} promises
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

      {/* Detail modal */}
      {detailTarget && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setDetailTarget(null)}
        >
          <div className="bg-white dark:bg-[#1a1240] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white pr-4">{detailTarget.promiseText}</h3>
              <button onClick={() => setDetailTarget(null)} className="text-slate-500 dark:text-indigo-200/50 hover:text-slate-800 dark:hover:text-white shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Person</span><span className="text-slate-800 dark:text-white font-medium">{detailTarget.personName}</span></div>
              {detailTarget.direction && (
                <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Direction</span><span className="text-slate-800 dark:text-white font-medium">{detailTarget.direction === "ToReceive" ? "They owe you" : "You owe them"}</span></div>
              )}
              <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Due Date</span><span className="text-slate-800 dark:text-white font-medium">{formatDate(detailTarget.dueDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Status</span><span className="text-slate-800 dark:text-white font-medium">{detailTarget.status}</span></div>
              {detailTarget.totalAmount !== null && (
                <>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Total</span><span className="text-slate-800 dark:text-white font-medium">{formatMoney(detailTarget.totalAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Paid</span><span className="text-emerald-400 font-medium">{formatMoney(detailTarget.paidAmount)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500 dark:text-indigo-200/50">Remaining</span><span className="text-red-400 font-medium">{formatMoney(detailTarget.remainingAmount)}</span></div>
                </>
              )}
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
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">Delete this promise?</h3>
            <p className="text-sm text-slate-500 dark:text-indigo-200/50 mb-6">&quot;{deleteTarget.promiseText}&quot; will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-slate-600 dark:text-indigo-200/80 bg-white dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 transition-colors">
                Cancel
              </button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
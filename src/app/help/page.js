"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import Sidebar from "@/components/Sidebar";
import TopNavbar from "@/components/TopNavbar";
import {
  Search,
  Send,
  ArrowRight,
  ClipboardList,
  ShieldCheck,
  Bell,
  Folder,
  MessageCircle,
  Settings,
  ChevronDown,
  Mail,
  Phone,
  Headphones,
  Sparkles,
  Loader2,
  Check,
  X,
  HelpCircle,
} from "lucide-react";

const TOPIC_ICONS = { ClipboardList, ShieldCheck, Bell, Folder, MessageCircle, Settings };

const COLOR_MAP = {
  indigo: { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-600 dark:text-indigo-400" },
  emerald: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400" },
  blue: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-600 dark:text-blue-400" },
  violet: { bg: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-600 dark:text-violet-400" },
  rose: { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-600 dark:text-rose-400" },
};

function TopicCard({ topic, router }) {
  const Icon = TOPIC_ICONS[topic.iconKey] || HelpCircle;
  const color = COLOR_MAP[topic.colorKey] || COLOR_MAP.indigo;
  return (
    <button
      type="button"
      onClick={() => topic.linkUrl && router.push(topic.linkUrl)}
      className="text-left bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:-translate-y-0.5 transition-all group dark:bg-slate-800 dark:border-slate-700"
    >
      <div className={`w-11 h-11 rounded-xl ${color.bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color.text}`} />
      </div>
      <h3 className="font-semibold text-slate-800 mb-1 dark:text-slate-100">{topic.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-2 dark:text-slate-400">{topic.description}</p>
      <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
    </button>
  );
}

function FaqRow({ faq, isOpen, onToggle }) {
  return (
    <div className="py-4 border-b border-slate-100 last:border-b-0 dark:border-slate-700">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left gap-4"
      >
        <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{faq.question}</span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      {isOpen && <p className="text-xs text-slate-500 leading-relaxed mt-2 pr-6 dark:text-slate-400">{faq.answer}</p>}
    </div>
  );
}

export default function HelpSupportPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);

  const [topics, setTopics] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [status, setStatus] = useState({ liveChatOnline: false, supportEmail: "", avgResponseTime: "" });

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null); // null = not searching
  const [openFaqId, setOpenFaqId] = useState(null);

  // contact modal
  const [showContact, setShowContact] = useState(false);
  const [contactType, setContactType] = useState("Message");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [sendSuccess, setSendSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }
    loadOverview();
  }, [router]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await api.get("/support/overview");
      setTopics(res.data.topics || []);
      setFaqs(res.data.faqs || []);
      setPopularSearches(res.data.popularSearches || []);
      setStatus(res.data.status || {});
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const runSearch = useCallback(async (term) => {
    if (!term.trim()) {
      setSearchResults(null);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get("/support/search", { params: { q: term } });
      setSearchResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  const handlePopularClick = (label) => {
    setQuery(label);
  };

  const openContact = (type, subject) => {
    setContactType(type);
    setContactSubject(subject || "");
    setContactMessage("");
    setSendError("");
    setSendSuccess("");
    setShowContact(true);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!contactMessage.trim()) {
      setSendError("Please write a message.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      await api.post("/support/contact", {
        type: contactType,
        subject: contactSubject,
        message: contactMessage,
      });
      setSendSuccess("Sent! Our team will get back to you soon.");
      setContactMessage("");
      setTimeout(() => setShowContact(false), 1800);
    } catch (err) {
      setSendError(err.response?.data?.message || "Could not send your message. Please try again.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row">
        <Sidebar active="/help" />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
        </main>
      </div>
    );
  }

  const showingSearch = query.trim().length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col lg:flex-row">
      <Sidebar active="/help" />

      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6 lg:py-8 max-w-[1600px] w-full min-w-0">
        <TopNavbar
          title="Help & Support"
          subtitle="We're here to help you anytime you need it."
        />

        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 mb-8 flex items-center gap-10 border border-indigo-100/60">
          <div className="hidden md:flex relative w-40 h-40 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-white/60" />
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200 relative">
              <Headphones className="w-10 h-10 text-white" />
            </div>
            <Sparkles className="w-4 h-4 text-indigo-300 absolute top-3 left-6" />
            <Sparkles className="w-3 h-3 text-purple-300 absolute bottom-6 right-3" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-900 mb-1 dark:text-slate-100">How can we help you?</h2>
            <p className="text-sm text-slate-500 mb-4 dark:text-slate-400">Search for help articles or get in touch with our support team.</p>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 dark:text-slate-500" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for help articles..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:bg-slate-800 dark:border-slate-600"
                />
              </div>
              <button
                onClick={() => runSearch(query)}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shrink-0"
              >
                Search
              </button>
            </div>
            {popularSearches.length > 0 && (
              <div className="flex items-center flex-wrap gap-2 mt-3">
                <span className="text-xs text-slate-500 dark:text-slate-400">Popular searches:</span>
                {popularSearches.map((label) => (
                  <button
                    key={label}
                    onClick={() => handlePopularClick(label)}
                    className="text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 transition-colors px-3 py-1 rounded-full"
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {showingSearch ? (
          /* ---------- Search results ---------- */
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-8 dark:bg-slate-800 dark:border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-800 dark:text-slate-100">
                {searching ? "Searching..." : `Results for "${query}"`}
              </h2>
              <button onClick={() => setQuery("")} className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            </div>

            {!searching && searchResults && searchResults.topics.length === 0 && searchResults.faqs.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No results found. Try a different search, or send us a message below.</p>
            )}

            {searchResults?.topics?.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {searchResults.topics.map((t) => (
                  <TopicCard key={`t-${t.id}`} topic={t} router={router} />
                ))}
              </div>
            )}

            {searchResults?.faqs?.length > 0 && (
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {searchResults.faqs.map((f) => (
                  <FaqRow key={f.id} faq={f} isOpen={openFaqId === f.id} onToggle={() => setOpenFaqId(openFaqId === f.id ? null : f.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Help Topics</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {topics.map((t) => (
                    <TopicCard key={t.id} topic={t} router={router} />
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="font-semibold text-slate-800 mb-1 dark:text-slate-100">Frequently Asked Questions</h2>
                <div className="divide-y divide-slate-100 mt-2 dark:divide-slate-700">
                  {faqs.map((f) => (
                    <FaqRow key={f.id} faq={f} isOpen={openFaqId === f.id} onToggle={() => setOpenFaqId(openFaqId === f.id ? null : f.id)} />
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="flex flex-col gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                <h2 className="font-semibold text-slate-800 mb-1 dark:text-slate-100">Contact Support</h2>
                <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">Can&apos;t find what you&apos;re looking for? We&apos;re here to help!</p>

                <button
                  onClick={() => openContact("Message", "Live Chat")}
                  className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-3 mb-3 text-left dark:bg-slate-900 dark:hover:bg-slate-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center shrink-0">
                    <MessageCircle className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Live Chat</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Chat with our support team in real time.</p>
                    <span
                      className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        status.liveChatOnline ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {status.liveChatOnline ? "Online" : "Offline"}
                    </span>
                  </div>
                </button>

                
                <a  href={`mailto:${status.supportEmail}`}
                  className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-3 mb-3 text-left dark:bg-slate-900 dark:hover:bg-slate-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Email Support</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Send us an email and we&apos;ll respond soon.</p>
                    <span className="text-xs font-semibold text-indigo-600">{status.supportEmail}</span>
                  </div>
                </a>

                <button
                  onClick={() => openContact("Call", "Call Request")}
                  className="w-full flex items-center gap-3 bg-slate-50 hover:bg-slate-100 transition-colors rounded-xl p-3 text-left dark:bg-slate-900 dark:hover:bg-slate-700"
                >
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <Phone className="w-4.5 h-4.5 text-violet-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Request a Call</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Schedule a call with our support team.</p>
                  </div>
                </button>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center dark:bg-slate-800 dark:border-slate-700">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-3">
                  <Send className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 mb-1 dark:text-slate-100">Still Need Help?</h3>
                <p className="text-xs text-slate-500 mb-4 dark:text-slate-400">
                  We usually reply within {status.avgResponseTime || "a few hours"}.
                </p>
                <button
                  onClick={() => openContact("Message", "")}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  <Send className="w-4 h-4" /> Send a Message
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Contact modal */}
      {showContact && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl dark:bg-slate-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                {contactType === "Call" ? "Request a Call" : "Send a Message"}
              </h3>
              <button onClick={() => setShowContact(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSendMessage} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block dark:text-slate-300">Subject (optional)</label>
                <input
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 dark:border-slate-600"
                  placeholder="What's this about?"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block dark:text-slate-300">
                  {contactType === "Call" ? "Phone number & best time to call" : "Message"}
                </label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-200 resize-none dark:border-slate-600"
                  placeholder={contactType === "Call" ? "e.g. 03xx-xxxxxxx, mornings work best" : "Tell us what's going on..."}
                />
              </div>

              {sendError && <p className="text-xs text-red-500">{sendError}</p>}
              {sendSuccess && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> {sendSuccess}
                </p>
              )}

              <button
                type="submit"
                disabled={sending}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
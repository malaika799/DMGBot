"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/axios";
import ChatSidebar from "@/components/ChatSidebar";
import {
  Brain,
  Send,
  Loader2,
  Menu,
  LayoutDashboard,
  Sparkles,
  Mic,
  Square,
  ImagePlus,
  X,
} from "lucide-react";

export default function ChatPage() {
  const router = useRouter();
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);
  const sendMessageRef = useRef(null);
  const imageInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [activeTitle, setActiveTitle] = useState(null);
  const [sessionRefresh, setSessionRefresh] = useState(0);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [attachedImage, setAttachedImage] = useState(null); // { base64, mimeType, previewUrl }

  // Images are served by the backend's /files static route, but the browser can't
  // hit the (HTTP-only) backend directly from an HTTPS page — same reason all other
  // API calls go through /api/proxy. So route image URLs through the proxy too,
  // instead of trying to build a direct backend origin.
  const resolveImageUrl = (path) => (path ? `/api/proxy${path}` : null);

  const normalizeMessage = (m) => {
    const imagePath = m.imagePath ?? m.ImagePath ?? null;
    return {
      id: m.id ?? m.Id,
      role: m.role ?? m.Role,
      message: m.message ?? m.Message,
      timestamp: m.timestamp ?? m.Timestamp,
      imagePreview: resolveImageUrl(imagePath),
    };
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (!token) {
      router.push("/login");
      return;
    }
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch {
        setUser(null);
      }
    }
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // On phones/tablets the 288px session list would crowd out the chat
  // itself, so start collapsed there; desktop keeps it open by default.
  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, []);

  // Set up Web Speech API (voice-to-text)
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      // Always call the latest sendMessage via the ref to avoid stale closures
      sendMessageRef.current(transcript, true);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
  }, []);

  const toggleListening = () => {
    if (!voiceSupported) return;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
  };

  // Groq's vision API rejects any request whose base64 image payload is over 4MB.
  // Phone camera photos (bills, receipts) are routinely 3-8MB, so we resize/compress
  // client-side before attaching — this also makes uploads faster.
  const MAX_IMAGE_BASE64_BYTES = 4 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1600;

  const compressImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          const scale = MAX_IMAGE_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        canvas.getContext("2d").drawImage(img, 0, 0, width, height);

        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);

        // Base64 string length * 0.75 ≈ decoded byte size. Keep shrinking quality
        // until we're safely under Groq's 4MB limit.
        while (dataUrl.length * 0.75 > MAX_IMAGE_BASE64_BYTES && quality > 0.4) {
          quality -= 0.15;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
        }

        URL.revokeObjectURL(objectUrl);
        resolve(dataUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Could not read image"));
      };
      img.src = objectUrl;
    });

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    try {
      const dataUrl = await compressImage(file);
      const base64 = dataUrl.split(",")[1];
      if (base64.length * 0.75 > MAX_IMAGE_BASE64_BYTES) {
        alert("Ye image bohat bari hai, please koi chhoti image try karo.");
        return;
      }
      setAttachedImage({
        base64,
        mimeType: "image/jpeg",
        previewUrl: dataUrl,
      });
    } catch (err) {
      console.error(err);
      alert("Image process nahi ho saki, dobara try karo.");
    }
  };

  const removeAttachedImage = () => setAttachedImage(null);

  const openSession = async (id) => {
    setActiveSessionId(id);
    setMessages([]);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/chat/history/${id}`);
      setMessages(res.data.map(normalizeMessage));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const startNewChat = () => {
    setActiveSessionId(null);
    setActiveTitle(null);
    setMessages([]);
  };

  const handleSessionDeleted = (id) => {
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const sendMessage = async (text, fromVoice = false, image = null) => {
    const trimmed = text.trim();
    if ((!trimmed && !image) || sending) return;

    setInput("");
    setSending(true);

    // Track which message this is so we can patch in the persisted image URL once the
    // server responds (the initial preview is a local blob URL that won't survive a refresh).
    const localId = `local-${Date.now()}`;
    const userMsg = {
      id: localId,
      role: "user",
      message: trimmed,
      timestamp: new Date(),
      imagePreview: image?.previewUrl,
    };
    setMessages((prev) => [...prev, userMsg]);
    setAttachedImage(null);

    try {
      let sessionId = activeSessionId;

      if (!sessionId) {
        const createRes = await api.post("/chatsession/create");
        sessionId = createRes.data.id ?? createRes.data.Id;
        setActiveSessionId(sessionId);
      }

      const res = await api.post("/chat/send", {
        sessionId,
        message: trimmed,
        imageBase64: image?.base64 || null,
        imageMimeType: image?.mimeType || null,
      });

      const botReply = res.data.botReply;
      const persistedImagePath = res.data.imagePath;

      // Swap the temporary blob preview for the persisted, server-hosted image URL
      // so it survives a session switch / page refresh.
      if (persistedImagePath) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === localId ? { ...m, imagePreview: resolveImageUrl(persistedImagePath) } : m
          )
        );
      }

      const botMsg = { role: "assistant", message: botReply, timestamp: new Date() };
      setMessages((prev) => [...prev, botMsg]);

      if (fromVoice) speak(botReply);

      // Tell the sidebar to reload (new session, updated title, last message date)
      setSessionRefresh((v) => v + 1);
    } catch (err) {
      console.error(err);
      const errMsg = "Something went wrong sending that. Please try again.";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", message: errMsg, timestamp: new Date() },
      ]);
      if (fromVoice) speak(errMsg);
    } finally {
      setSending(false);
    }
  };

  // Keep the ref pointing at the latest sendMessage so the speech
  // recognition handler (set up once) never calls a stale version.
  useEffect(() => {
    sendMessageRef.current = sendMessage;
  });

  const handleSend = (e) => {
    e.preventDefault();
    sendMessage(input, false, attachedImage);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  const suggestions = [
    "I promised Ahmed 500 dollars by Friday",
    "I have a dentist appointment on Monday",
    "Remind me to call my lawyer next week",
  ];

  return (
    <div className="h-screen flex bg-slate-50 dark:bg-gradient-to-br dark:from-indigo-950 dark:via-[#1a1330] dark:to-purple-950 text-slate-800 dark:text-slate-100 overflow-hidden">
      <ChatSidebar
        sidebarOpen={sidebarOpen}
        activeSessionId={activeSessionId}
        onSelectSession={openSession}
        onNewChat={startNewChat}
        onSessionDeleted={handleSessionDeleted}
        onActiveTitleChange={setActiveTitle}
        refreshSignal={sessionRefresh}
        user={user}
        onLogout={handleLogout}
      />

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
              {activeSessionId ? activeTitle || "Chat" : "New Chat"}
            </span>
          </div>

          <a
            href="/dashboard"
            className="flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 transition-opacity px-3.5 py-1.5 rounded-full shrink-0"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Dashboard
          </a>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto w-full px-4 py-6">
            {loadingHistory ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-5 h-5 animate-spin text-slate-600 dark:text-slate-400" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-16 gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-900/40">
                  <Sparkles className="w-7 h-7 text-slate-800 dark:text-white" />
                </div>
                <div>
                  <h2 className="text-slate-800 dark:text-slate-100 font-semibold text-lg">
                    Tell me something to remember
                  </h2>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                    Type it out, or tap the mic and just say it
                  </p>
                </div>
                <div className="flex flex-col gap-2 w-full max-w-sm mt-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(s)}
                      className="text-left text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 hover:bg-white dark:hover:bg-white/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 ${
                        isUser ? "justify-end" : "justify-start"
                      }`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                          <Brain className="w-3.5 h-3.5 text-slate-800 dark:text-white" />
                        </div>
                      )}
                      <div
                        className={`max-w-xl px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isUser
                            ? "bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-br-md"
                            : "bg-white dark:bg-white/10 text-slate-800 dark:text-slate-100 rounded-bl-md"
                        }`}
                      >
                        {msg.imagePreview && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={msg.imagePreview}
                            alt="Attached"
                            className="rounded-xl mb-2 max-h-56 object-cover"
                          />
                        )}
                        {msg.message}
                      </div>
                    </div>
                  );
                })}
                {sending && (
                  <div className="flex items-start gap-3 justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Brain className="w-3.5 h-3.5 text-slate-800 dark:text-white" />
                    </div>
                    <div className="bg-white dark:bg-white/10 px-4 py-3 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="shrink-0 px-4 pb-6 pt-2">
          <div className="max-w-3xl mx-auto">
            {attachedImage && (
              <div className="flex items-center gap-2 mb-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 w-fit">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedImage.previewUrl}
                  alt="Selected"
                  className="w-10 h-10 rounded-lg object-cover"
                />
                <span className="text-xs text-slate-600 dark:text-slate-300">Image attached</span>
                <button
                  type="button"
                  onClick={removeAttachedImage}
                  className="text-slate-500 dark:text-slate-400 hover:text-red-400 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-2 py-2">
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-white dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 transition-colors shrink-0"
                title="Attach an image"
              >
                <ImagePlus className="w-4 h-4 text-slate-800 dark:text-white" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Message Memory Guardian..."}
                disabled={isListening}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-500 outline-none disabled:opacity-60"
              />
              {voiceSupported && (
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                    isListening
                      ? "bg-red-500 hover:bg-red-600 animate-pulse"
                      : "bg-white dark:bg-white/10 hover:bg-white dark:hover:bg-white/20"
                  }`}
                  title={isListening ? "Stop listening" : "Speak your message"}
                >
                  {isListening ? (
                    <Square className="w-3.5 h-3.5 text-slate-800 dark:text-white" />
                  ) : (
                    <Mic className="w-4 h-4 text-slate-800 dark:text-white" />
                  )}
                </button>
              )}
              <button
                type="submit"
                disabled={sending || (!input.trim() && !attachedImage)}
                className="bg-gradient-to-br from-indigo-600 to-purple-600 hover:opacity-90 disabled:opacity-40 text-white w-9 h-9 rounded-xl flex items-center justify-center transition-opacity shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
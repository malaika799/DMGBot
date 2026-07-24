# DMGBot — Digital Memory Guardian Bot 🧠🤖

DMGBot (Digital Memory Guardian Bot) is a full-stack, AI-powered personal assistant that helps you **remember what matters** — conversations, promises, documents, and life events — all in one place. It combines a conversational AI chat interface with automatic memory extraction, reminders, and a searchable life timeline.

This repository contains the **frontend** (Next.js). The backend is built separately with ASP.NET Core + SQL Server.

🔗 **Live Backend:** [http://dmgbotapi.somee.com/index.html](http://dmgbotapi.somee.com/index.html)

---

## ✨ Features

- **AI Chat Assistant** — Multi-session chat powered by Groq AI (LLaMA / Qwen vision models), with a dark, ChatGPT-style interface.
- **Automatic Memory & Promise Extraction** — Important details and commitments from your conversations are automatically detected and saved.
- **Document Upload** — Upload images/documents (with client-side image compression) for the AI to read and remember.
- **Reminders** — Never forget a promise or important date again.
- **Life Timeline** — A chronological view of everything the bot has learned and remembered about you.
- **Global Search** — Search across chats, memories, promises, and documents.
- **Dashboard** — At-a-glance overview of your memories, promises, and activity.
- **Settings** — Fully dynamic settings, including working push & email notification toggles (SMS removed).
- **Help & Support Page** — Built-in help center for users.
- **JWT Authentication** — Secure login/register flow.
- **Fully Responsive UI** — Optimized for mobile, tablet, and desktop.
- **Dark Mode** — Consistent dark theme across the entire app.

---

## 🛠️ Tech Stack

**Frontend**
- [Next.js](https://nextjs.org/) 16 (App Router)
- React 19
- Tailwind CSS 4
- Axios
- Lucide React (icons)
- Web Push API for notifications

**Backend** (separate repo)
- ASP.NET Core Web API
- Entity Framework Core
- SQL Server
- JWT Authentication
- Groq AI API (LLaMA / Qwen)

---

## 📂 Project Structure

```
src/
├── app/
│   ├── chat/          # AI chat interface
│   ├── dashboard/      # Dashboard overview
│   ├── documents/      # Document upload & management
│   ├── help/           # Help & support
│   ├── login/          # Login page
│   ├── register/       # Register page
│   ├── promises/       # Extracted promises/commitments
│   ├── search/         # Global search
│   ├── settings/       # User settings
│   └── timeline/        # Life timeline
├── components/         # Sidebar, Navbars, ThemeManager, PushManager, etc.
└── lib/                # Axios instance, theme & push notification helpers
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- The [DMGBot backend](http://dmgbotapi.somee.com/index.html) running (locally or the hosted version)

### Installation

```bash
git clone https://github.com/malaika799/dmgbot-frontend.git
cd dmgbot-frontend
npm install
```

### Configure API URL

Update the backend base URL in `src/lib/axios.js` to point to your backend (local or the live Somee-hosted API):

```js
baseURL: "https://your-backend-url/api"
```

### Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Responsive & Dark Mode

The entire app has been optimized to work seamlessly across all device sizes, with a consistent dark mode theme applied app-wide.

---

## 👩‍💻 Author

**Malaika Shehzadi**
- GitHub: [@malaika799](https://github.com/malaika799)
- LinkedIn: [malaika-shehzadi](https://linkedin.com/in/malaika-shehzadi)

---

## 📄 License

This project is open source and available for learning purposes.
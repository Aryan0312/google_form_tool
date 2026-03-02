<div align="center">

# 🔥 FormForge AI

**AI-Powered Google Form Generator for College Events**

*Paste any event description — hackathons, fests, workshops, coding contests — and get a production-ready Google Form in under 10 seconds.*

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Llama 3.3](https://img.shields.io/badge/AI-Llama_3.3_70B-purple)](https://groq.com)
[![Google APIs](https://img.shields.io/badge/Google-Forms%20%7C%20Drive%20%7C%20Calendar-4285F4?logo=google&logoColor=white)](https://console.cloud.google.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Live Demo](https://google-form-tool.onrender.com) · [Report Bug](https://github.com/Aryan0312/google_form_tool/issues) · [Request Feature](https://github.com/Aryan0312/google_form_tool/issues)

</div>

---

## 📋 What It Does

FormForge AI takes raw, unstructured event text (from Unstop, WhatsApp messages, college notices, etc.) and:

1. **Parses it with AI** — Extracts event name, dates, team size, eligibility, rounds, and more using Llama 3.3 70B
2. **Generates a Google Form** — Creates a fully structured registration form with sections, team logic, file upload fields, and smart validations
3. **Creates reminder drafts** — AI-generated reminder emails saved to Google Drive, with Google Calendar events for each round

### ✨ Key Features

| Feature | Description |
|---|---|
| 🤖 **AI-Powered Extraction** | Paste any event text — AI extracts everything automatically |
| 👥 **Smart Team Logic** | Detects solo vs team events, sets required/optional member fields |
| 📝 **Custom Fields** | Add extra fields as chips, mark them required with one click |
| 📧 **Reminder System** | AI-generated reminder emails saved to Drive + Calendar events |
| 🔒 **Secure OAuth** | Minimal scopes, session-only tokens, rate limiting on all endpoints |
| 🎨 **Premium UI** | Dark theme with glassmorphism, animations, and responsive design |
| ⚡ **Fast** | Form generated in under 10 seconds |
| 💰 **100% Free** | Uses Groq's free API tier + Google's free APIs |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                    Frontend                       │
│         Vanilla HTML/CSS/JS · Dark Theme          │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│              Express.js Backend                   │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐│
│  │ /api/generate│  │/api/forms    │  │/api/     ││
│  │ (AI Parse)  │  │/create       │  │reminders ││
│  └──────┬──────┘  └──────┬───────┘  └────┬─────┘│
│         │                │               │       │
│  ┌──────▼──────┐  ┌──────▼───────┐  ┌────▼─────┐│
│  │ Groq API    │  │ Google Forms │  │ Drive +  ││
│  │ (Llama 3.3) │  │     API      │  │ Calendar ││
│  └─────────────┘  └──────────────┘  └──────────┘│
└──────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ ([download](https://nodejs.org))
- **Git** ([download](https://git-scm.com))
- **Groq API Key** (free: [console.groq.com](https://console.groq.com))
- **Google Cloud Project** with OAuth credentials ([console.cloud.google.com](https://console.cloud.google.com))

### 1. Clone the Repository

```bash
git clone https://github.com/Aryan0312/google_form_tool.git
cd google_form_tool
npm install
```

### 2. Set Up Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com) → create a new project (or use existing)
2. Enable these **3 APIs**:
   - [Google Forms API](https://console.cloud.google.com/apis/library/forms.googleapis.com)
   - [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
   - [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
3. Go to **APIs & Services → OAuth consent screen**:
   - Select **External** → Create
   - Fill in app name, support email, developer email
   - Add scopes: `forms.body`, `drive.file`, `calendar.events`
   - Add your email under **Test users**
4. Go to **APIs & Services → Credentials**:
   - Click **+ Create Credentials → OAuth client ID**
   - Type: **Web application**
   - Authorized JavaScript origins: `http://localhost:3000`
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback`
   - Copy the **Client ID** and **Client Secret**

### 3. Set Up Groq (Free AI)

1. Go to [console.groq.com](https://console.groq.com)
2. Create an account → go to **API Keys**
3. Click **Create API Key** → copy it

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=any-random-string-at-least-32-chars

GROQ_API_KEY=gsk_your_groq_api_key_here

GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback

ALLOWED_ORIGIN=*
```

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) → Click **Connect Google** → Authorize → Paste event text → Done! 🎉

---

## 📁 Project Structure

```
google_form_tool/
├── public/                    # Frontend (served as static files)
│   ├── index.html             # Main app (home + generator pages)
│   ├── app.js                 # Frontend logic
│   ├── styles.css             # Premium dark theme
│   ├── privacy.html           # Privacy policy
│   └── terms.html             # Terms of service
│
├── src/                       # Backend (TypeScript)
│   ├── server.ts              # Entry point
│   ├── app.ts                 # Express app setup
│   ├── config/                # Environment config
│   ├── prompts/               # AI system prompts
│   │   └── stage1.prompt.ts   # Form schema generation prompt
│   ├── services/              # Business logic
│   │   ├── ai.service.ts      # Groq API integration
│   │   ├── google-auth.service.ts
│   │   ├── google-forms.service.ts
│   │   ├── google-drive.service.ts
│   │   ├── google-calendar.service.ts
│   │   └── reminder-ai.service.ts
│   ├── controllers/           # Route handlers
│   ├── routes/                # API routes
│   ├── middleware/             # Rate limiting, error handling
│   ├── builders/              # Google Form builder
│   └── types/                 # TypeScript interfaces
│
├── .env.example               # Environment template
├── package.json
└── tsconfig.json
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description | Rate Limit |
|--------|----------|-------------|------------|
| `GET` | `/api/auth/url` | Get Google OAuth URL | 10/15min |
| `GET` | `/api/auth/callback` | OAuth redirect handler | 10/15min |
| `GET` | `/api/auth/status` | Check auth status | 10/15min |
| `GET` | `/api/auth/disconnect` | Revoke Google access | 10/15min |
| `POST` | `/api/generate` | AI: event text → form schema | 10/15min |
| `POST` | `/api/forms/create` | Create Google Form | 20/15min |
| `POST` | `/api/reminders/preview` | AI: generate reminder emails | 10/15min |
| `POST` | `/api/reminders/create` | Save to Drive + Calendar | 5/15min |

---

## 🔒 Security

- **Minimal OAuth scopes** — `drive.file` (not full Drive), `calendar.events`, `forms.body`
- **Session-only tokens** — OAuth tokens are never stored on disk or in a database
- **Rate limiting** — All endpoints are rate limited to prevent abuse
- **Input validation** — Length caps, HTML stripping, date format validation
- **Helmet.js** — Security headers in production
- **CORS** — Locked to configured origin in production
- **CSRF protection** — OAuth `state` parameter validation
- **Calendar deduplication** — Prevents duplicate events using `extendedProperties`
- **Drive idempotency** — Searches before creating, updates existing files

---

## 🌐 Deploying to Render

1. Push to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Set:
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables (see `.env.example`)
5. Update `GOOGLE_REDIRECT_URI` and `ALLOWED_ORIGIN` to your Render URL
6. Add the Render URL to Google Cloud Console → Credentials → Authorized origins/redirects

> **Note:** Free tier sleeps after 15min of inactivity. First request after sleep takes ~30s.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **AI** | Llama 3.3 70B via [Groq](https://groq.com) (free tier) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Google APIs** | Forms API, Drive API, Calendar API |
| **Auth** | Google OAuth 2.0 |
| **Security** | Helmet, express-rate-limit, express-session |
| **Hosting** | [Render](https://render.com) (free tier) |

---

## 🤝 Contributing

Contributions are welcome! Feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Aryan** — [@Aryan0312](https://github.com/Aryan0312)

---

<div align="center">

Built with ❤️ using Llama 3.3 70B · Google Forms API · Node.js

**FormForge AI** — Open source, free forever.

</div>

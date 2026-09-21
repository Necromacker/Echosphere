# 🎙️ Echosphere — Next-Gen AI Interviewer & Voice Career Agent

<div align="center">

![Echosphere Banner](https://img.shields.io/badge/Echosphere-AI%20Voice%20Interviewer-6C63FF?style=for-the-badge&logo=robot&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![Agora AI](https://img.shields.io/badge/Agora-Conversational%20AI-0099FF?style=for-the-badge&logo=agora&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama%203.3-FF6B6B?style=for-the-badge&logo=ai&logoColor=white)

**An Intelligent, Real-Time AI Voice Interviewing Platform & Career Assistant**  
*Parse Resumes · Dynamic RAG Question Generation · Live Agora AI Voice Conversational Agent · Dynamic Prompt Management*

</div>

---

## 📖 About Echosphere

**Echosphere** is a state-of-the-art full-stack platform designed to simulate realistic, voice-interactive technical and behavioral mock interviews. Powered by **Groq (Llama-3.3-70b)**, **Agora Conversational AI**, **LangChain RAG**, and **MongoDB**, Echosphere bridges candidate resume context with dynamic position requirements to deliver rigorous, interactive interview sessions.

### 🌟 Key Core Capabilities
- 📄 **Smart Resume Parsing**: Extracts structured skills, work experience, education, and projects from candidate PDFs.
- 🧠 **RAG-Driven Question Generation**: Contextually retrieves resume chunks and job descriptions to synthesize zero-hallucination interview questions.
- 🎙️ **Live Agora Voice Agent**: Connects candidates to a real-time conversational AI interviewer via Agora WebRTC voice channels.
- ⚡ **Dynamic Adaptive Questioning**: Adjusts follow-up question depth and interviewer role based on the candidate's previous response.
- 📊 **Strict Evaluation & Scorecards**: Evaluates answer accuracy, clarity, and depth with difficulty-calibrated scoring.
- 🛠️ **Admin Prompt Management System**: Real-time prompt editing, version control, and self-healing baseline prompt seeding.
- 💼 **Job Board & Smart Search**: Real-time query parsing with LLM fallback and live job listings integrated via Adzuna API.

---

## 🛠️ Technology Stack

### Backend
- **Runtime**: Node.js + Express.js
- **Database**: MongoDB Atlas (Mongoose ORM)
- **AI / LLM Orchestration**: Groq SDK (`llama-3.3-70b-versatile`), LangChain, OpenAI Embeddings
- **Real-Time Voice & WebSockets**: Agora Conversational AI REST API v2, Socket.io
- **File Storage**: Cloudinary + Multer
- **Cache**: Redis (ioredis)
- **Security & Logging**: JWT Auth, Helmet, CORS, Rate-Limiting, Winston Logger
- **Job Search**: Adzuna API Integration

### Frontend
- **Framework**: React 18 + Vite
- **Styling & UI**: Tailwind CSS, Framer Motion, Lucide Icons, React Icons
- **State & Data Fetching**: Zustand + TanStack React Query
- **Voice Communication**: Agora RTC SDK Client
- **Charts & Feedback**: Recharts, React Hot Toast

---

## 📁 Project Structure

```
Echosphere/
├── backend/
│   └── src/
│       ├── server.js               # Entry point (HTTP & Socket.io server)
│       ├── app.js                  # Express middleware & API routes configuration
│       ├── socket.js               # WebSockets real-time session streaming
│       ├── config/                 # DB, Groq, Cloudinary, Agora & Logger setup
│       ├── controllers/            # Request handlers (auth, resume, interview, prompts)
│       │   ├── adminPrompt.controller.js  # Dynamic System Prompt Manager & Seeder
│       │   ├── interview.controller.js    # Interview flow handlers
│       │   ├── resume.controller.js       # Resume upload & parsing handlers
│       │   └── session.controller.js      # Session execution handlers
│       ├── services/               # Core AI services & orchestration
│       │   ├── ai.service.js          # Groq LLM prompt orchestration
│       │   ├── agoraAgent.service.js  # Live Agora Voice AI pipeline
│       │   ├── rag.service.js         # Document retrieval & RAG vector search
│       │   ├── chunking.service.js    # Semantic text splitting
│       │   └── optimizer.service.js   # Semantic search query optimizer
│       ├── models/                 # Mongoose schemas
│       │   ├── SystemPrompt.model.js  # Editable prompt schema & versioning
│       │   ├── Interview.model.js     # Interview configuration schema
│       │   └── Session.model.js       # Candidate response & evaluation logs
│       ├── routes/                 # Express API routes
│       └── utils/                  # Query parsers, AppError, JWT normalizer
│
└── frontend/
    └── src/
        ├── pages/                  # Interviewer, Dashboard, Jobs, Landing pages
        ├── components/             # Reusable UI components & Voice controls
        ├── services/               # Axios API client functions
        └── store/                  # Zustand global application state
```

---

## 🤖 Comprehensive AI Prompts & Locations Index

Below is the complete index of all system prompts, user prompts, default seed templates, and LLM prompt configurations used throughout Echosphere, along with their exact file locations and line numbers.

---

### 1. `backend/src/services/ai.service.js`
*Primary LLM service file orchestrating candidate parsing, question generation, answer scoring, RAG grounded interview flows, and evaluation reports.*

#### 🔹 `generateInterviewQuestions`
- **Location**: [`ai.service.js:L57-L60`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L57-L60) (System Prompt) | [`ai.service.js:L62-L91`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L62-L91) (User Prompt)
- **Role / Persona**: Expert technical interviewer and HR specialist.
- **Purpose**: Generates grounded interview questions strictly based on RAG chunks extracted from the candidate's resume and job description.
- **System Prompt Snippet**:
  ```text
  You are an expert technical interviewer and HR specialist.
  You create precise, challenging, and role-relevant interview questions solely based on the provided context retrieved from RAG chunks.
  NO HALLUCINATIONS: Do not ask questions about skills or tools not explicitly present in the provided context.
  Always respond with valid JSON only — no extra text, no markdown fences.
  ```

#### 🔹 `generateNextInterviewQuestion`
- **Location**: [`ai.service.js:L194-L195`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L194-L195) (System Prompt) | [`ai.service.js:L169-L188`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L169-L188) (User Prompt)
- **Role / Persona**: Adaptive interview question generator.
- **Purpose**: Dynamically generates single follow-up or category-switched questions based on the candidate's answer quality, difficulty level, and category sequence.

#### 🔹 `evaluateAnswer`
- **Location**: [`ai.service.js:L227-L245`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L227-L245) (Default Fallback Prompt) | [`ai.service.js:L248-L255`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L248-L255) (Calibrated User Prompt)
- **Role / Persona**: Interviewer evaluating response.
- **Purpose**: Evaluates candidate answers on correctness, clarity, and depth, ignoring non-substantive filler/repeat requests. Uses dynamic prompt override from `ats_scorer` category if configured in DB.

#### 🔹 `generateOverallFeedback`
- **Location**: [`ai.service.js:L277-L290`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L277-L290) (Default Fallback Prompt) | [`ai.service.js:L293`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L293) (User Prompt)
- **Role / Persona**: Senior interviewer providing final report.
- **Purpose**: Synthesizes session performance into overall score (1-100), key strengths, weaknesses, and targeted improvement tips.

#### 🔹 `parseResumeAndJD`
- **Location**: [`ai.service.js:L314-L334`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L314-L334) (Default Fallback System Prompt) | [`ai.service.js:L338-L343`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L338-L343) (User Prompt)
- **Role / Persona**: Expert resume and job description parser.
- **Purpose**: Extracts structured JSON data (name, skills, experience, projects, education, requirements) from raw resume and job description texts.

#### 🔹 `generateSeniorTechnicalQuestions`
- **Location**: [`ai.service.js:L379-L392`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L379-L392) (System Prompt) | [`ai.service.js:L394-L404`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L394-L404) (User Prompt)
- **Role / Persona**: Senior technical interviewer.
- **Purpose**: Produces a numbered list of technical questions mapped directly to retrieved candidate context.

#### 🔹 `evaluateStrictAnswer`
- **Location**: [`ai.service.js:L428-L437`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L428-L437) (System Prompt) | [`ai.service.js:L439-L456`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L439-L456) (User Prompt)
- **Role / Persona**: Strict technical interviewer.
- **Purpose**: Performs strict answer evaluation against RAG context, returning score (0-10), correctness grade, missed concepts, and suggestions.

#### 🔹 `generateFollowUpQuestion`
- **Location**: [`ai.service.js:L486-L494`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L486-L494) (System Prompt) | [`ai.service.js:L496-L506`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L496-L506) (User Prompt)
- **Role / Persona**: Technical interviewer.
- **Purpose**: Probes weak areas or gaps identified in the candidate's prior response.

#### 🔹 `generateFinalEvaluationReport`
- **Location**: [`ai.service.js:L527-L535`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L527-L535) (System Prompt) | [`ai.service.js:L537-L553`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L537-L553) (User Prompt)
- **Role / Persona**: Senior interviewer.
- **Purpose**: Generates candidate hire decisions (`yes | no | borderline`), skill breakdowns, and actionable improvement plans.

#### 🔹 `validateGrounding`
- **Location**: [`ai.service.js:L582-L591`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L582-L591) (System Prompt) | [`ai.service.js:L593-L597`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L593-L597) (User Prompt)
- **Role / Persona**: Grounding validation system.
- **Purpose**: Verifies if generated model output is fully supported by retrieved RAG context, flagging unsupported claims.

#### 🔹 `generateQuestionsDirect`
- **Location**: [`ai.service.js:L650-L661`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L650-L661) (System Prompt) | [`ai.service.js:L663-L665`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/ai.service.js#L663-L665) (User Prompt)
- **Role / Persona**: Professional AI Technical Recruiter.
- **Purpose**: Directly generates 5 targeted questions (3 technical, 2 behavioral) based on job title and description without resume context.

---

### 2. `backend/src/services/agoraAgent.service.js`
*Manages live Agora Conversational Voice AI Agent sessions over WebRTC.*

#### 🔹 `startAgent` (Initial Voice Session Prompt)
- **Location**: [`agoraAgent.service.js:L93-L130`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/agoraAgent.service.js#L93-L130) (System Prompt) | [`agoraAgent.service.js:L151`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/agoraAgent.service.js#L151) (Greeting Message)
- **Role / Persona**: Live Spoken Voice AI Interviewer.
- **Purpose**: Defines voice conversation flow rules for Question 1 (asking, clarifying when asked, listening for keywords, 1 follow-up max, confirming answer save).
- **Spoken Greeting Snippet**:
  ```text
  Hello! Welcome to your AI interview for [Job Title]. I will ask you [N] questions today. Let's begin with question 1: [Question Text]
  ```

#### 🔹 `updateAgentQuestion` (Voice Question Transition Prompt)
- **Location**: [`agoraAgent.service.js:L186-L226`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/agoraAgent.service.js#L186-L226) (System Prompt)
- **Role / Persona**: Live Spoken Voice AI Interviewer.
- **Purpose**: Re-configures the active Agora AI Agent prompt with Question N rules when candidate clicks "Next Question".

---

### 3. `backend/src/services/optimizer.service.js`
*Semantic search query optimizer for vector search.*

#### 🔹 `optimizeQuery`
- **Location**: [`optimizer.service.js:L19-L27`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/optimizer.service.js#L19-L27) (System Prompt) | [`optimizer.service.js:L29-L33`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/services/optimizer.service.js#L29-L33) (User Prompt)
- **Role / Persona**: Semantic query optimizer for vector search.
- **Purpose**: Converts raw user query string into precise, context-rich vector search intent (expanding acronyms like JS → JavaScript).

---

### 4. `backend/src/utils/queryParser.js`
*LLM fallback query parser for Adzuna job search.*

#### 🔹 `llmFallbackParse`
- **Location**: [`queryParser.js:L263-L276`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/utils/queryParser.js#L263-L276) (System Prompt) | [`queryParser.js:L278-L284`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/utils/queryParser.js#L278-L284) (User Prompt)
- **Role / Persona**: Job-search query parser.
- **Purpose**: Parses unstructured search queries into structured JSON fields (keywords, location, remote, experience, contract type, salary ranges).

---

### 5. `backend/src/controllers/adminPrompt.controller.js`
*Database self-healing baseline prompt seeding dictionary stored in `SystemPrompt` Mongoose collection.*

- **Location**: [`adminPrompt.controller.js:L15-L95`](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L15-L95)
- **Seed Categories & Prompt Content**:
  1. `interview` ([L17-L21](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L17-L21)): Spoken follow-up persona prompt for live voice interviewer.
  2. `resume_parser` ([L23-L46](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L23-L46)): Baseline resume & job description parser prompt.
  3. `ats_scorer` ([L49-L65](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L49-L65)): Candidate alignment match & answer evaluation baseline prompt.
  4. `career_coach` ([L67-L71](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L67-L71)): Baseline prompt for career advice & skill development suggestions.
  5. `job_recommendation` ([L73-L77](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L73-L77)): Platform job matching baseline prompt.
  6. `feedback_report` ([L79-L94](file:///Users/krishnagorde/Documents/GitHub/Echosphere/backend/src/controllers/adminPrompt.controller.js#L79-L94)): Baseline prompt for overall session feedback report calculation.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+
- **MongoDB Atlas** or local MongoDB instance
- **Redis** server (local or cloud)
- **Groq API Key** (Free Tier available at console.groq.com)
- **Agora App Credentials** (App ID, Customer ID, Customer Secret, Certificate)

### ⚡ Installation & Launch

```bash
# 1. Clone repo
git clone https://github.com/your-username/Echosphere.git
cd Echosphere

# 2. Setup Backend
cd backend
npm install
cp .env.example .env  # Fill in credentials
npm run dev

# 3. Setup Frontend
cd ../frontend
npm install
npm run dev
```

---

## 📄 License
This project is licensed under the [MIT License](LICENSE).

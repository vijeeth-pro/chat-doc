# ChatDoc AI — Multi-Document Chat Assistant

ChatDoc AI is a high-fidelity, context-aware document Q&A application. It allows users to upload multiple documents (including PDF, TXT, Markdown, and DOCX) and engage in real-time conversational analysis with them. 

The application utilizes a **React + Vite** frontend with a responsive glassmorphic UI styled using Ant Design, and a **Python Flask** backend powered by **LlamaIndex** and **Google Gemini** models (`gemini-2.5-flash` for LLM and `gemini-embedding-001` for vector embedding generation).

---

## 🌟 Key Features

- **Dynamic Drag-and-Drop Uploader**: Instantly uploads and parses text, PDF, and Markdown files.
- **Auto-indexing (RAG Pipeline)**: Automatically segments documents, generates vector embeddings, and stores them in a local storage context.
- **Context-Aware Sidebar Selection**: Select checkboxes next to specific uploaded files to scope the AI’s knowledge boundary dynamically during chat.
- **Side-by-side Document Reader**: View active document details on-screen alongside your chat window.
- **Vector DB Inspector**: A built-in diagnostic tool to review vector store nodes, chunk statistics, index files, and parsed metadata.
- **Local Simulation Fallback**: If the Python backend isn't running, the frontend gracefully falls back to a simulated RAG engine using `localStorage`, keeping the app fully interactive.

---

## 📂 Project Structure

```text
chat-doc/
├── backend/                  # Flask RAG backend
│   ├── server.py             # Main Flask API endpoints
│   ├── uploads/              # Local storage for uploaded files
│   ├── index/                # Persisted LlamaIndex vector store JSON files
│   └── .env                  # Environment secrets (Gemini API key)
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/       # DocumentDashboard, DocumentViewer, FloatingChat, etc.
│   │   ├── App.jsx           # Application shell & state manager
│   │   └── api.js            # Axios client with local simulation fallback logic
│   ├── public/               # Static assets & icons
│   ├── package.json          # Node dependencies
│   └── bun.lock              # Bun lockfile
└── .gitignore                # Configured git ignore patterns (ignores local DB/node_modules)
```

---

## 🛠️ Setup & Running Instructions

### 1. Prerequisites
- **Node.js** (v18+) or **Bun** installed
- **Python** (v3.10+) installed
- **Google Gemini API Key** (Get one from [Google AI Studio](https://aistudio.google.com/))

---

### 2. Backend Setup (Python Flask)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python3 -m venv venv
   ```

3. Activate the virtual environment:
   - **macOS/Linux**:
     ```bash
     source venv/bin/activate
     ```
   - **Windows**:
     ```bash
     venv\Scripts\activate
     ```

4. Install the required dependencies:
   ```bash
   pip install flask flask-cors python-dotenv llama-index llama-index-llms-google-genai llama-index-embeddings-google-genai
   ```

5. Create a `.env` file inside the `backend` folder and add your Gemini API Key:
   ```env
   GOOGLE_API_KEY=your_gemini_api_key_here
   ```

6. Start the Flask server:
   ```bash
   python server.py
   ```
   *The server runs locally at `http://127.0.0.1:5001`.*

---

### 3. Frontend Setup (React + Vite)

1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```

2. Install dependencies:
   - Using **npm**:
     ```bash
     npm install
     ```
   - Using **Bun** (recommended, since `bun.lock` is present):
     ```bash
     bun install
     ```

3. Start the Vite development server:
   - Using **npm**:
     ```bash
     npm run dev
     ```
   - Using **Bun**:
     ```bash
     bun dev
     ```

4. Open the app in your browser:
   *Visit the URL displayed in the terminal (typically `http://localhost:5173` or similar).*

---

## 🔌 API Endpoints Reference

The backend Flask app exposes the following APIs:

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/` | `GET` | Generates/re-indexes current uploads on load. |
| `/upload` | `POST` | Uploads a new document, clears previous uploads, and generates the LlamaIndex storage index. |
| `/chat` | `POST` | Processes user query against the loaded index context and returns response + sources. |
| `/api/db-stats` | `GET` | Returns vector store statistics (total node count, unique document list, initialization status). |
| `/api/db-nodes` | `GET` | Fetches all vector store chunks (nodes) and their metadata details for debugging. |

# FPL Analyzer

An AI-powered Fantasy Premier League autonomous manager that leverages Claude AI to provide intelligent team recommendations, transfer suggestions, captain picks, and chip strategy advice.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)
![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white)
![Claude AI](https://img.shields.io/badge/Claude-Opus%204-cc785c?logo=anthropic&logoColor=white)

## Features

- **AI-Powered Analysis** — Claude AI analyzes your squad, budget, and fixtures to recommend optimal transfers
- **Real-Time Reasoning** — Watch the AI think through decisions with a live reasoning feed
- **Smart Transfers** — Budget-aware recommendations respecting free transfers and point hits
- **Captain Selection** — Intelligent captain and vice-captain picks based on form and fixtures
- **Chip Strategy** — Guidance on when to play Wildcard, Free Hit, Bench Boost, and Triple Captain
- **One-Click Execution** — Execute recommended transfers directly on your FPL account
- **Performance Tracking** — Monitor your season progression with historical data and charts
- **League Standings** — View your private league positions and rank changes

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js, Express.js |
| **Frontend** | React 18, Vite, Tailwind CSS |
| **Database** | SQLite (better-sqlite3) |
| **AI** | Anthropic Claude API |
| **Charts** | Recharts |

## Getting Started

### Prerequisites

- Node.js 18+
- An FPL account
- Anthropic API key ([get one here](https://console.anthropic.com))

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/fpl-analyzer.git
   cd fpl-analyzer
   ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   ```

3. **Configure environment variables**

   Edit `backend/.env` with your credentials:
   ```env
   FPL_EMAIL=your-email@example.com
   FPL_PASSWORD=your-fpl-password
   FPL_TEAM_ID=123456
   ANTHROPIC_API_KEY=sk-ant-...
   ```

   > **Finding your Team ID:** Go to the FPL website, click "Points", and check the URL: `fantasy.premierleague.com/entry/YOUR_TEAM_ID/...`

4. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

### Running the Application

Start both services in separate terminals:

```bash
# Terminal 1 — Backend (runs on port 3001)
cd backend
npm start

# Terminal 2 — Frontend (runs on port 5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Usage

1. **View Your Squad** — The "My Team" tab shows your current squad in a pitch formation
2. **Run AI Analysis** — Click the "Run AI Analysis" button to get recommendations
3. **Watch the AI Think** — The reasoning feed shows Claude's analysis in real-time
4. **Review Transfers** — Check the "Transfers" tab for detailed recommendations
5. **Execute Changes** — Click "Execute Transfers" to apply changes to your FPL account

## Project Structure

```
fpl-analyzer/
├── backend/
│   ├── src/
│   │   ├── index.js           # Express server & API routes
│   │   ├── db.js              # SQLite database setup
│   │   └── services/
│   │       ├── fpl.js         # FPL API client
│   │       └── ai.js          # Claude AI integration
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main application
│   │   └── components/
│   │       ├── TeamPitch.jsx          # Squad visualization
│   │       ├── AIReasoningFeed.jsx    # Live AI reasoning
│   │       ├── TransferRecommendations.jsx
│   │       ├── PerformanceChart.jsx
│   │       └── ...
│   └── package.json
│
└── README.md
```

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/bootstrap` | GET | FPL static data (players, teams) |
| `/api/my-team` | GET | Current squad |
| `/api/fixtures` | GET | Upcoming fixtures |
| `/api/analyze` | POST | Run AI analysis |
| `/api/reasoning` | GET | Get AI reasoning log |
| `/api/transfers/execute` | POST | Execute transfers on FPL |
| `/api/performance` | GET | Historical performance data |
| `/api/leagues` | GET | Private league standings |

## Configuration Options

| Variable | Description | Default |
|----------|-------------|---------|
| `FPL_EMAIL` | FPL account email | — |
| `FPL_PASSWORD` | FPL account password | — |
| `FPL_TEAM_ID` | Your FPL team ID | — |
| `ANTHROPIC_API_KEY` | Claude API key | — |
| `AUTO_EXECUTE` | Auto-execute recommended transfers | `false` |
| `MAX_HITS` | Maximum points hit allowed | `-8` |
| `PORT` | Backend server port | `3001` |
| `DEMO_MODE` | Run without API key (mock data) | `false` |

## Development

```bash
# Backend with auto-reload
cd backend && npm run dev

# Frontend with HMR
cd frontend && npm run dev

# Build frontend for production
cd frontend && npm run build
```

## License

MIT

---

Built with Claude AI by Anthropic

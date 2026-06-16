# AAkar - Frontend

The presentation layer of **AAkar**. Built with speed, reactivity, and a premium aesthetic in mind. It uses a modern glassmorphic design system and integrates interactive network structures to represent the Knowledge Graph natively in the browser.

---

## Tech Stack

- **Framework**: Next.js 16 + React 19 (App Router)
- **Styling**: Vanilla CSS (Dark Theme + Glassmorphism)
- **Authentication**: Fully local JWT-based `AuthContext` (No external Firebase dependency)
- **Graph Visualization**: `vis-network` & `vis-data` (Louvain Community clustering & PageRank)
- **Tooling**: TypeScript, ESLint, Node.js

---

## Project Structure

```text
frontend/
 ├── public/             # Static Assets
 ├── src/
 │   ├── app/            # Next.js App Router Pages & Layouts
 │   │   ├── layout.tsx  # Root Layout
 │   │   ├── page.tsx    # Portal Gateway
 │   │   ├── login/      # User Login
 │   │   └── dashboard/  # Admin/DM Dashboard
 │   └── components/     # Reusable Dashboard panels
 │       ├── LoginPage.jsx
 │       ├── MapPanel.jsx
 │       ├── OverviewPanel.jsx
 │       ├── AskPanel.jsx
 │       └── ...
 ├── next.config.ts      # Next.js configurations
 ├── tsconfig.json       # TypeScript configuration
 ├── package.json        # Dependencies & Scripts
 └── README.md           # Frontend Documentation
```

---

## Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or later)
- **npm** (v9.x or later)

### 2. Installation

Navigate to the frontend directory and install the necessary dependencies:

```bash
cd frontend
npm install
```

### 3. Running the Development Server

Fire up the Next.js development server:

```bash
npm run dev
```

The frontend will be instantly accessible, normally at: `http://localhost:3000`

*(Note: Make sure the FastAPI backend is concurrently running on port 8000 so the frontend can successfully retrieve and display the graph data!)*

---

## Design Principles

The UI of AAkar is built around the concept of a **Living Dashboard**:
- **Premium Aesthetics**: Deep, carefully curated custom dark palettes combined with vibrant, purposeful accent colors (e.g., Amber for high-risk zones, Blue for active connections).
- **Glassmorphism Integration**: Floating panels and transparent CSS blurs that bring the interactive Knowledge Graph to the forefront without clutter.
- **Dynamic Interaction**: Utilizes `vis-network` to allow users to physically drag, zoom, and explore node connections within the civic dataset.
- **Real-Time Responsiveness**: Stat cards dynamically calculate progress bars, Resolution Rates, and Active Action-Items fetched directly from the Neo4j backend.

---

## Scripts Available

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the application for production.
- `npm run start`: Starts the Next.js production server.
- `npm run lint`: Runs ESLint to verify code quality.

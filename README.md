# 🏀 March Madness 2026 — Seed Points Contest

A shareable web app where participants pick winners of every NCAA tournament game and earn points equal to the winning team's seed number. Upsets are worth more!

## How It Works

- **Admin** sets up the bracket (64 teams) and enters results as games are played
- **Participants** open the shared URL, enter their name, and pick winners for every game
- **Leaderboard** auto-updates with scores broken down by round
- Picks lock once the admin enters the actual result

## Quick Setup (15 minutes)

### Step 1: Create a Free Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it something like `march-madness-2026`
4. Disable Google Analytics (not needed) → **Create Project**

### Step 2: Add a Web App

1. On the project overview page, click the **Web icon** `</>`
2. Name it `march-madness` → **Register app**
3. You'll see a `firebaseConfig` object — **copy it**
4. Open `src/firebase.js` and **paste your config** replacing the placeholder values

### Step 3: Enable Realtime Database

1. In the Firebase Console sidebar, click **Build → Realtime Database**
2. Click **"Create Database"**
3. Choose a location (any is fine)
4. Select **"Start in test mode"** → **Enable**

> ⚠️ Test mode allows anyone to read/write for 30 days. For a tournament that's usually enough. To extend, go to Realtime Database → Rules and set the expiry date further out.

### Step 4: Deploy to Vercel (Free)

**Option A: Vercel (recommended)**

1. Push this folder to a GitHub repo
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click **"New Project"** → Import your repo
4. Framework: **Vite** (auto-detected)
5. Click **Deploy**
6. You'll get a URL like `march-madness-xyz.vercel.app` — share this with your group!

**Option B: Netlify**

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → **"Add new site"** → **"Import from Git"**
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click **Deploy**

**Option C: Run locally**

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`

### Step 5: Share & Play!

1. Open the deployed URL
2. First time: set up an **Admin PIN**
3. Enter the 64 teams after Selection Sunday (March 15)
4. Share the URL with your group — they just enter their name and start picking!
5. As games are played, log in as Admin and enter results

## Scoring

| Winner's Seed | Points Earned |
|---------------|---------------|
| 1-seed wins   | 1 point       |
| 5-seed wins   | 5 points      |
| 10-seed wins  | 10 points     |
| 12-seed upset | 12 points     |
| 16-seed upset | 16 points!    |

Higher seeds = more points. The strategy is picking the right upsets!

## Project Structure

```
march-madness/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Build config
├── src/
│   ├── main.jsx        # React mount
│   ├── App.jsx         # Main app (all UI)
│   └── firebase.js     # Firebase config (EDIT THIS)
└── README.md           # You're here
```

## Tech Stack

- **React 18** + **Vite** (fast builds)
- **Firebase Realtime Database** (free shared storage)
- No CSS framework — custom styled for a dark tournament feel
- Fonts: Oswald (display) + Source Sans 3 (body) + JetBrains Mono (numbers)

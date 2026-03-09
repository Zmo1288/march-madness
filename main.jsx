import { useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from './firebase.js';
const firebaseConfig = {
  apiKey: "AIzaSyDLPdDbK4nrTMfCNozvEriGznIsVH58EjQ",
  authDomain: "seed-pts-march-madness-app.firebaseapp.com",
  databaseURL: "https://seed-pts-march-madness-app-default-rtdb.firebaseio.com",
  projectId: "seed-pts-march-madness-app",
  storageBucket: "seed-pts-march-madness-app.firebasestorage.app",
  messagingSenderId: "131780916355",
  appId: "1:131780916355:web:c1c57d13e1686ccdd957b6",
  measurementId: "G-PBGS0PTVM8"

// ── Constants ────────────────────────────────────────────────
const REGIONS = ['South', 'East', 'Midwest', 'West'];
const ROUNDS = [
  { name: 'First Round', key: 'R64', games: 32 },
  { name: 'Second Round', key: 'R32', games: 16 },
  { name: 'Sweet 16', key: 'S16', games: 8 },
  { name: 'Elite Eight', key: 'E8', games: 4 },
  { name: 'Final Four', key: 'F4', games: 2 },
  { name: 'Championship', key: 'CHAMP', games: 1 },
];

const STANDARD_SEEDS = [1,16,8,9,5,12,4,13,6,11,3,14,7,10,2,15];

const emptyBracket = () => {
  const b = {};
  REGIONS.forEach((r) => {
    b[r] = Array.from({ length: 16 }, (_, i) => ({
      seed: STANDARD_SEEDS[i],
      team: '',
    }));
  });
  return b;
};

// ── Storage helpers ──────────────────────────────────────────
async function sGet(key) {
  try {
    const r = await storage.get(key);
    return r ? JSON.parse(r.value) : null;
  } catch { return null; }
}

async function sSet(key, val) {
  try {
    await storage.set(key, JSON.stringify(val));
  } catch (e) { console.error('storage set error', e); }
}

// ── Colors ───────────────────────────────────────────────────
const C = {
  bg: '#0a0e1a', card: '#111827', surface: '#1e293b',
  accent: '#f97316', accentGlow: 'rgba(249,115,22,0.2)',
  gold: '#fbbf24', silver: '#9ca3af', bronze: '#d97706',
  green: '#22c55e', greenBg: 'rgba(34,197,94,0.1)',
  red: '#ef4444', redBg: 'rgba(239,68,68,0.08)',
  text: '#f1f5f9', textMuted: '#94a3b8', textDim: '#64748b',
  border: '#1e293b', borderLight: '#334155',
};

const F = {
  display: "'Oswald', sans-serif",
  body: "'Source Sans 3', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState(null);
  const [userName, setUserName] = useState('');
  const [storedPin, setStoredPin] = useState(null);
  const [bracket, setBracket] = useState(emptyBracket());
  const [results, setResults] = useState({});
  const [participants, setParticipants] = useState([]);
  const [allPicks, setAllPicks] = useState({});
  const [myPicks, setMyPicks] = useState({});
  const [tab, setTab] = useState('picks');
  const [pinInput, setPinInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [setupPin, setSetupPin] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // ── Load all shared data ────────────────────────────────
  const loadAll = useCallback(async () => {
    const [b, r, pin, parts] = await Promise.all([
      sGet('mm-bracket'), sGet('mm-results'), sGet('mm-admin-pin'), sGet('mm-participants'),
    ]);
    if (b) setBracket(b);
    if (r) setResults(r);
    if (pin) setStoredPin(pin);
    if (parts) {
      setParticipants(parts);
      const picksObj = {};
      await Promise.all(parts.map(async (name) => {
        const p = await sGet(`mm-picks:${name}`);
        if (p) picksObj[name] = p;
      }));
      setAllPicks(picksObj);
    }
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-refresh on leaderboard or admin views
  useEffect(() => {
    if (tab !== 'leaderboard' && tab !== 'participants') return;
    const id = setInterval(loadAll, 12000);
    return () => clearInterval(id);
  }, [tab, loadAll]);

  // ── Admin actions ───────────────────────────────────────
  const saveBracket = async () => {
    setSaving(true);
    await sSet('mm-bracket', bracket);
    setSaving(false);
  };

  const saveResult = async (gameKey, team, seed) => {
    const next = { ...results, [gameKey]: { winner: team, seed: Number(seed) } };
    setResults(next);
    await sSet('mm-results', next);
  };

  const clearResult = async (gameKey) => {
    const next = { ...results };
    delete next[gameKey];
    setResults(next);
    await sSet('mm-results', next);
  };

  const handleAdminSetup = async () => {
    if (setupPin.length < 4) { setError('PIN must be at least 4 characters'); return; }
    await sSet('mm-admin-pin', setupPin);
    setStoredPin(setupPin);
    setRole('admin');
    setTab('bracket');
    setError('');
  };

  const handleAdminLogin = () => {
    if (pinInput === storedPin) { setRole('admin'); setTab('bracket'); setError(''); }
    else setError('Incorrect PIN');
  };

  // ── Participant actions ─────────────────────────────────
  const handleJoin = async () => {
    const name = nameInput.trim();
    if (!name) { setError('Enter your name'); return; }
    setUserName(name);
    if (!participants.includes(name)) {
      const next = [...participants, name];
      setParticipants(next);
      await sSet('mm-participants', next);
    }
    const existing = await sGet(`mm-picks:${name}`);
    if (existing) setMyPicks(existing);
    setRole('participant');
    setTab('picks');
    setError('');
  };

  const setMyPick = (gameKey, team, seed) => {
    const updated = { ...myPicks, [gameKey]: { team, seed: Number(seed) } };
    setMyPicks(updated);
    sSet(`mm-picks:${userName}`, updated);
  };

  // ── Build games from bracket + results ──────────────────
  const allGames = useMemo(() => {
    const games = [];
    let idx = 0;
    REGIONS.forEach((region) => {
      const teams = bracket[region];
      for (let i = 0; i < 16; i += 2) {
        games.push({
          key: `R64-${idx}`, round: 'R64', roundName: 'First Round', region,
          options: [
            { team: teams[i].team, seed: teams[i].seed },
            { team: teams[i + 1].team, seed: teams[i + 1].seed },
          ],
        });
        idx++;
      }
    });
    const buildRound = (rk, rn, pk) => {
      const prev = games.filter((g) => g.round === pk);
      let i2 = 0;
      for (let i = 0; i < prev.length; i += 2) {
        const w1 = results[prev[i].key];
        const w2 = prev[i + 1] ? results[prev[i + 1].key] : null;
        const opts = [];
        if (w1) opts.push({ team: w1.winner, seed: w1.seed });
        if (w2) opts.push({ team: w2.winner, seed: w2.seed });
        const region = rk === 'F4' || rk === 'CHAMP' ? '' : prev[i].region;
        games.push({ key: `${rk}-${i2}`, round: rk, roundName: rn, region, options: opts });
        i2++;
      }
    };
    buildRound('R32', 'Second Round', 'R64');
    buildRound('S16', 'Sweet 16', 'R32');
    buildRound('E8', 'Elite Eight', 'S16');
    buildRound('F4', 'Final Four', 'E8');
    buildRound('CHAMP', 'Championship', 'F4');
    return games;
  }, [bracket, results]);

  // ── Leaderboard calculation ─────────────────────────────
  const leaderboard = useMemo(() => {
    const source = role === 'participant'
      ? { ...allPicks, [userName]: myPicks }
      : allPicks;
    return participants.map((name) => {
      const picks = source[name] || {};
      let total = 0;
      const rp = {};
      ROUNDS.forEach((r) => (rp[r.key] = 0));
      Object.entries(picks).forEach(([gk, pick]) => {
        const res = results[gk];
        if (res && res.winner === pick.team) {
          total += res.seed;
          rp[gk.split('-')[0]] += res.seed;
        }
      });
      return { name, total, roundPoints: rp, pickCount: Object.keys(picks).length };
    }).sort((a, b) => b.total - a.total);
  }, [participants, allPicks, myPicks, results, role, userName]);

  const gamesDecided = Object.keys(results).length;
  const bracketReady = REGIONS.every((r) => bracket[r].some((t) => t.team && t.team.length > 0));

  // ── Loading state ───────────────────────────────────────
  if (loading) {
    return (
      <Shell>
        <div style={{ textAlign: 'center', padding: 80, color: C.textDim }}>
          <div className="loader" style={{
            width: 40, height: 40, border: `3px solid ${C.border}`,
            borderTop: `3px solid ${C.accent}`, borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 16px',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          Loading contest...
        </div>
      </Shell>
    );
  }

  // ── Login / Join Screen ─────────────────────────────────
  if (!role) {
    return (
      <Shell>
        <div style={{ maxWidth: 440, margin: '60px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ textAlign: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 56, marginBottom: 12, filter: 'drop-shadow(0 4px 12px rgba(249,115,22,0.3))' }}>🏀</div>
            <h2 style={{
              fontFamily: F.display, fontSize: 28, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.03em', margin: 0, color: C.accent,
            }}>Seed Points Contest</h2>
            <p style={{ color: C.textMuted, fontSize: 14, marginTop: 6 }}>2026 NCAA Men's Tournament</p>
          </div>

          <Card title="I'm a Participant" icon="🎯">
            <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 12px' }}>
              Enter your name to make your picks. If you've been here before, use the same name to load your picks.
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input placeholder="Your name..." value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                style={inputStyle} />
              <button onClick={handleJoin} style={btnPrimary}>Join</button>
            </div>
          </Card>

          <Card title="I'm the Admin" icon="⚙️">
            {storedPin ? (
              <>
                <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 12px' }}>
                  Enter your PIN to manage the bracket and enter results.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="password" placeholder="Admin PIN..."
                    value={pinInput} onChange={(e) => setPinInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                    style={inputStyle} />
                  <button onClick={handleAdminLogin} style={btnPrimary}>Enter</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ color: C.textMuted, fontSize: 13, margin: '0 0 12px' }}>
                  First time? Create a PIN to run this contest.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="password" placeholder="Create PIN (4+ chars)..."
                    value={setupPin} onChange={(e) => setSetupPin(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAdminSetup()}
                    style={inputStyle} />
                  <button onClick={handleAdminSetup} style={btnPrimary}>Setup</button>
                </div>
              </>
            )}
          </Card>

          {error && <div style={{ color: C.red, fontSize: 13, textAlign: 'center', padding: '8px', background: C.redBg, borderRadius: 8 }}>{error}</div>}

          <Card title="How Scoring Works" icon="📐">
            <div style={{ color: C.textMuted, fontSize: 13, lineHeight: 1.7 }}>
              <p style={{ margin: '0 0 8px' }}>
                Pick the winner of every tournament game. You earn points equal to the winning team's seed — upsets are worth more!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 8 }}>
                {[['1-seed win', '1 pt'], ['5-seed win', '5 pts'], ['10-seed win', '10 pts'], ['16-seed upset', '16 pts!']].map(([l, v]) => (
                  <div key={l} style={{ background: C.bg, borderRadius: 6, padding: '8px 12px', display: 'flex', justifyContent: 'space-between', border: `1px solid ${C.border}` }}>
                    <span>{l}</span>
                    <span style={{ fontFamily: F.mono, color: C.accent, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>
      </Shell>
    );
  }

  // ── Main App (logged in) ────────────────────────────────
  const tabs = role === 'admin'
    ? [{ key: 'bracket', label: 'Bracket' }, { key: 'results', label: 'Results' }, { key: 'leaderboard', label: 'Leaderboard' }, { key: 'participants', label: 'Players' }]
    : [{ key: 'picks', label: 'My Picks' }, { key: 'leaderboard', label: 'Leaderboard' }];

  return (
    <Shell>
      {/* Status Bar */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '10px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
            <StatBadge label="Signed in as" value={role === 'admin' ? '🔒 Admin' : userName} />
            <StatBadge label="Games" value={`${gamesDecided}/63`} />
            <StatBadge label="Players" value={participants.length} accent />
          </div>
          <button onClick={() => { setRole(null); setError(''); }}
            style={{ ...btnSmall, color: C.textDim, borderColor: C.borderLight }}>
            Sign Out
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '16px 20px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button key={t.key}
            onClick={() => { setTab(t.key); if (t.key === 'leaderboard' || t.key === 'participants') loadAll(); }}
            style={{
              fontFamily: F.display, fontSize: 13, padding: '8px 18px', borderRadius: 6,
              border: tab === t.key ? `1px solid ${C.accent}` : `1px solid ${C.borderLight}`,
              background: tab === t.key ? C.accentGlow : 'transparent',
              color: tab === t.key ? C.accent : C.textDim, cursor: 'pointer',
              textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 20px 60px' }}>
        {role === 'admin' && tab === 'bracket' && (
          <AdminBracket bracket={bracket} setBracket={setBracket} saveBracket={saveBracket} saving={saving} />
        )}
        {role === 'admin' && tab === 'results' && (
          <AdminResults allGames={allGames} results={results} saveResult={saveResult} clearResult={clearResult} />
        )}
        {role === 'admin' && tab === 'participants' && (
          <AdminParticipants participants={participants} allPicks={allPicks} loadAll={loadAll} />
        )}
        {role === 'participant' && tab === 'picks' && (
          <ParticipantPicks allGames={allGames} myPicks={myPicks} setMyPick={setMyPick} results={results} bracketReady={bracketReady} />
        )}
        {tab === 'leaderboard' && (
          <LeaderboardView leaderboard={leaderboard} currentUser={role === 'participant' ? userName : null} />
        )}
      </div>
    </Shell>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Bracket Setup
// ══════════════════════════════════════════════════════════════
function AdminBracket({ bracket, setBracket, saveBracket, saving }) {
  const [region, setRegion] = useState('South');

  const update = (idx, val) => {
    setBracket((prev) => {
      const next = { ...prev };
      next[region] = [...next[region]];
      next[region][idx] = { ...next[region][idx], team: val };
      return next;
    });
  };

  return (
    <Card title="Bracket Editor" icon="🏀" subtitle="Enter all 64 teams after Selection Sunday, then Save. Participants will see teams once saved.">
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {REGIONS.map((r) => (
          <RegionBtn key={r} label={r} active={region === r} onClick={() => setRegion(r)} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
        {bracket[region].map((entry, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.surface, borderRadius: 8, padding: '8px 12px', border: `1px solid ${C.border}` }}>
            <div style={{
              fontFamily: F.mono, fontSize: 14, color: C.accent,
              minWidth: 28, textAlign: 'center', fontWeight: 700,
            }}>{entry.seed}</div>
            <input type="text" placeholder="Team name" value={entry.team}
              onChange={(e) => update(idx, e.target.value)}
              style={{
                flex: 1, padding: '8px 10px', background: C.bg,
                border: `1px solid ${C.border}`, borderRadius: 6,
                color: C.text, fontFamily: F.body, fontSize: 13, outline: 'none',
              }} />
          </div>
        ))}
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={saveBracket} style={btnPrimary}>
          {saving ? 'Saving...' : '💾 Save Bracket'}
        </button>
        <span style={{ color: C.textDim, fontSize: 12 }}>All participants will see this once saved</span>
      </div>
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Enter Results
// ══════════════════════════════════════════════════════════════
function AdminResults({ allGames, results, saveResult, clearResult }) {
  const [round, setRound] = useState('R64');
  const roundGames = allGames.filter((g) => g.round === round);

  return (
    <div>
      <RoundTabs round={round} setRound={setRound} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
        {roundGames.map((game) => {
          const both = game.options.length === 2 && game.options.every((o) => o.team);
          const res = results[game.key];
          return (
            <div key={game.key} style={{
              background: C.card, borderRadius: 10, padding: '14px 18px',
              border: `1px solid ${res ? C.green + '44' : C.border}`,
            }}>
              {game.region && (
                <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F.display, marginBottom: 4 }}>
                  {game.region}
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 10 }}>
                {both
                  ? `(${game.options[0].seed}) ${game.options[0].team}  vs  (${game.options[1].seed}) ${game.options[1].team}`
                  : 'Waiting for prior results...'}
              </div>
              {both && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {game.options.map((opt) => (
                    <button key={opt.team}
                      onClick={() => saveResult(game.key, opt.team, opt.seed)}
                      style={{
                        padding: '7px 16px', borderRadius: 6, cursor: 'pointer',
                        fontFamily: F.body, fontSize: 13, fontWeight: 600,
                        border: res?.winner === opt.team ? `2px solid ${C.green}` : `1px solid ${C.borderLight}`,
                        background: res?.winner === opt.team ? C.greenBg : C.surface,
                        color: res?.winner === opt.team ? C.green : C.text,
                      }}>
                      ({opt.seed}) {opt.team}
                    </button>
                  ))}
                  {res && (
                    <>
                      <span style={{ fontFamily: F.mono, fontSize: 13, color: C.green, fontWeight: 600 }}>+{res.seed} pts</span>
                      <button onClick={() => clearResult(game.key)} style={{ ...btnSmall, color: C.red, borderColor: C.red + '44' }}>Clear</button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ADMIN: Participants
// ══════════════════════════════════════════════════════════════
function AdminParticipants({ participants, allPicks, loadAll }) {
  return (
    <Card title="Participants" icon="👥" subtitle="Everyone who has joined. Share the site URL with your group!">
      <button onClick={loadAll} style={{ ...btnSmall, marginBottom: 16, color: C.accent, borderColor: C.accent + '44' }}>
        🔄 Refresh
      </button>
      {participants.length === 0 ? (
        <p style={{ color: C.textDim, fontSize: 14 }}>No one has joined yet. Share the link!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {participants.map((name) => {
            const count = Object.keys(allPicks[name] || {}).length;
            return (
              <div key={name} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`,
              }}>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1 }}>{name}</span>
                <div style={{
                  background: count === 63 ? C.greenBg : C.bg,
                  border: `1px solid ${count === 63 ? C.green + '44' : C.border}`,
                  borderRadius: 6, padding: '4px 10px',
                }}>
                  <span style={{
                    fontFamily: F.mono, fontSize: 12,
                    color: count === 63 ? C.green : C.textDim,
                  }}>{count}/63 picks</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ══════════════════════════════════════════════════════════════
// PARTICIPANT: My Picks
// ══════════════════════════════════════════════════════════════
function ParticipantPicks({ allGames, myPicks, setMyPick, results, bracketReady }) {
  const [round, setRound] = useState('R64');
  const roundGames = allGames.filter((g) => g.round === round);
  const pickedCount = Object.keys(myPicks).length;

  if (!bracketReady) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: C.textDim }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⏳</div>
        <p style={{ fontSize: 16, fontWeight: 500 }}>The bracket hasn't been set up yet.</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>Check back after the admin enters the teams.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <RoundTabs round={round} setRound={setRound} />
        <div style={{
          fontFamily: F.mono, fontSize: 13, color: C.accent, fontWeight: 600,
          background: C.accentGlow, padding: '6px 14px', borderRadius: 6,
          border: `1px solid ${C.accent}33`,
        }}>
          {pickedCount}/63 picked
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {roundGames.map((game) => {
          const both = game.options.length === 2 && game.options.every((o) => o.team);
          const pick = myPicks[game.key];
          const res = results[game.key];
          const correct = res && pick && res.winner === pick.team;
          const wrong = res && pick && res.winner !== pick.team;
          const locked = !!res;

          return (
            <div key={game.key} style={{
              background: C.card, borderRadius: 10, padding: '14px 18px',
              border: `1px solid ${correct ? C.green + '44' : wrong ? C.red + '33' : C.border}`,
            }}>
              {game.region && (
                <div style={{ fontSize: 10, color: C.textDim, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: F.display, marginBottom: 4 }}>
                  {game.region}
                </div>
              )}
              {both ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  {game.options.map((opt) => (
                    <button key={opt.team}
                      onClick={() => !locked && setMyPick(game.key, opt.team, opt.seed)}
                      disabled={locked}
                      style={{
                        padding: '9px 18px', borderRadius: 7,
                        cursor: locked ? 'default' : 'pointer',
                        fontFamily: F.body, fontSize: 14, fontWeight: 600,
                        opacity: locked && pick?.team !== opt.team ? 0.4 : 1,
                        border: pick?.team === opt.team
                          ? `2px solid ${correct ? C.green : wrong ? C.red : C.accent}`
                          : `1px solid ${C.borderLight}`,
                        background: pick?.team === opt.team
                          ? (correct ? C.greenBg : wrong ? C.redBg : C.accentGlow)
                          : C.surface,
                        color: pick?.team === opt.team
                          ? (correct ? C.green : wrong ? C.red : C.accent)
                          : C.text,
                      }}>
                      ({opt.seed}) {opt.team}
                    </button>
                  ))}
                  {correct && <span style={{ fontFamily: F.mono, fontSize: 14, color: C.green, fontWeight: 700 }}>+{res.seed}</span>}
                  {wrong && <span style={{ fontSize: 13, color: C.red }}>✗</span>}
                  {locked && !pick && <span style={{ fontSize: 12, color: C.textDim }}>Locked — no pick</span>}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: C.textDim }}>Waiting for prior round results...</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════════════════
function LeaderboardView({ leaderboard, currentUser }) {
  if (leaderboard.length === 0) {
    return <div style={{ textAlign: 'center', padding: 60, color: C.textDim, fontSize: 15 }}>No participants yet.</div>;
  }

  const tc = [C.gold, C.silver, C.bronze];
  const te = ['🥇', '🥈', '🥉'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Podium */}
      {leaderboard.length >= 2 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, padding: '20px 0 10px' }}>
          {[1, 0, 2].map((rank) => {
            const p = leaderboard[rank];
            if (!p) return <div key={rank} style={{ width: 120 }} />;
            const h = [180, 130, 100];
            const a = rank === 1 ? 0 : rank === 0 ? 1 : 2;
            return (
              <div key={rank} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 130 }}>
                <span style={{ fontSize: 26, marginBottom: 6 }}>{te[a]}</span>
                <span style={{
                  fontFamily: F.display, fontSize: 15, fontWeight: 700, textAlign: 'center',
                  color: p.name === currentUser ? C.accent : C.text,
                }}>{p.name}</span>
                <span style={{ fontFamily: F.mono, fontSize: 20, fontWeight: 600, color: tc[a], marginBottom: 6 }}>{p.total}</span>
                <div style={{
                  width: '100%', height: h[a],
                  background: `linear-gradient(180deg, ${tc[a]}22 0%, ${C.card} 100%)`,
                  borderRadius: '10px 10px 0 0',
                  border: `1px solid ${tc[a]}33`, borderBottom: 'none',
                }} />
              </div>
            );
          })}
        </div>
      )}

      {/* Standings Table */}
      <Card title="Full Standings" icon="📊">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {leaderboard.map((p, idx) => {
            const isMe = p.name === currentUser;
            return (
              <div key={p.name} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                background: isMe ? C.accentGlow : C.surface, borderRadius: 8,
                border: `1px solid ${isMe ? C.accent + '44' : idx === 0 ? C.gold + '22' : C.border}`,
              }}>
                <span style={{ fontFamily: F.mono, fontSize: 14, color: C.textDim, width: 26, textAlign: 'center' }}>{idx + 1}</span>
                <span style={{ fontWeight: 600, fontSize: 14, flex: 1, color: isMe ? C.accent : C.text }}>
                  {p.name}{isMe ? ' (you)' : ''}
                </span>
                <div style={{ display: 'flex', gap: 3 }}>
                  {ROUNDS.map((r) => (
                    <div key={r.key} title={`${r.name}: ${p.roundPoints[r.key]} pts`} style={{
                      background: p.roundPoints[r.key] > 0 ? C.accentGlow : C.bg,
                      border: `1px solid ${p.roundPoints[r.key] > 0 ? C.accent + '44' : C.border}`,
                      borderRadius: 4, padding: '2px 6px', fontSize: 10, fontFamily: F.mono,
                      color: p.roundPoints[r.key] > 0 ? C.accent : C.textDim, minWidth: 26, textAlign: 'center',
                    }}>{p.roundPoints[r.key]}</div>
                  ))}
                </div>
                <div style={{
                  fontFamily: F.mono, fontSize: 18, fontWeight: 700,
                  color: C.accent, minWidth: 44, textAlign: 'right',
                }}>{p.total}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10, color: C.textDim }}>
          {ROUNDS.map((r) => (
            <span key={r.key}>
              <span style={{ fontFamily: F.mono, color: C.textMuted }}>{r.key}</span> = {r.name}
            </span>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// SHARED UI COMPONENTS
// ══════════════════════════════════════════════════════════════
function Shell({ children }) {
  return (
    <div style={{
      fontFamily: F.body,
      background: `linear-gradient(180deg, ${C.bg} 0%, #0f1629 100%)`,
      minHeight: '100vh', color: C.text,
    }}>
      <div style={{
        background: `linear-gradient(135deg, #1a0a00 0%, ${C.bg} 40%, #0a0e1a 100%)`,
        borderBottom: `1px solid ${C.border}`, padding: '20px 0',
      }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <h1 style={{
            fontFamily: F.display, fontSize: 32, fontWeight: 700,
            letterSpacing: '0.02em', textTransform: 'uppercase', margin: 0,
            background: `linear-gradient(135deg, ${C.accent} 0%, ${C.gold} 100%)`,
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>March Madness 2026</h1>
          <span style={{
            fontFamily: F.display, fontSize: 14, color: C.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.15em',
          }}>Seed Points Contest</span>
        </div>
      </div>
      {children}
    </div>
  );
}

function Card({ title, icon, subtitle, children }) {
  return (
    <div style={{ background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: subtitle ? 2 : 14 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h2 style={{ fontFamily: F.display, fontSize: 17, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>{title}</h2>
      </div>
      {subtitle && <p style={{ color: C.textDim, fontSize: 12, margin: '0 0 14px 28px' }}>{subtitle}</p>}
      {children}
    </div>
  );
}

function StatBadge({ label, value, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ color: C.textDim, fontWeight: 500, fontSize: 13 }}>{label}</span>
      <span style={{ fontFamily: F.mono, fontWeight: 500, color: accent ? C.accent : C.text, fontSize: 14 }}>{value}</span>
    </div>
  );
}

function RoundTabs({ round, setRound }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {ROUNDS.map((r) => (
        <button key={r.key} onClick={() => setRound(r.key)} style={{
          fontFamily: F.display, fontSize: 12, padding: '7px 14px', borderRadius: 6,
          border: round === r.key ? `1px solid ${C.accent}` : `1px solid ${C.borderLight}`,
          background: round === r.key ? C.accentGlow : 'transparent',
          color: round === r.key ? C.accent : C.textDim, cursor: 'pointer',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
        }}>{r.name}</button>
      ))}
    </div>
  );
}

function RegionBtn({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: F.display, fontSize: 13, padding: '8px 18px', borderRadius: 6,
      border: active ? `1px solid ${C.accent}` : `1px solid ${C.borderLight}`,
      background: active ? C.accentGlow : 'transparent',
      color: active ? C.accent : C.textMuted, cursor: 'pointer',
      textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
    }}>{label}</button>
  );
}

// ── Shared Styles ────────────────────────────────────────────
const inputStyle = {
  flex: 1, minWidth: 160, padding: '10px 14px', background: C.surface,
  border: `1px solid ${C.borderLight}`, borderRadius: 8, color: C.text,
  fontFamily: F.body, fontSize: 14, outline: 'none',
};

const btnPrimary = {
  padding: '10px 20px',
  background: `linear-gradient(135deg, ${C.accent}, #ea580c)`,
  border: 'none', borderRadius: 8, color: '#fff',
  fontFamily: F.display, fontSize: 14, fontWeight: 600,
  letterSpacing: '0.04em', cursor: 'pointer', textTransform: 'uppercase',
};

const btnSmall = {
  padding: '6px 12px', borderRadius: 6,
  border: `1px solid ${C.borderLight}`,
  background: 'transparent', cursor: 'pointer',
  fontFamily: F.body, fontSize: 12, color: C.text,
};

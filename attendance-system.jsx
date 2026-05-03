import { useState, useRef, useCallback } from "react";

const DEFAULT_STUDENTS = [];

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : initial;
    } catch { return initial; }
  });
  const set = (v) => {
    const next = typeof v === "function" ? v(val) : v;
    setVal(next);
    localStorage.setItem(key, JSON.stringify(next));
  };
  return [val, set];
}

// ---------- ICONS ----------
const IconScan = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/>
    <rect x="7" y="7" width="10" height="10" rx="1"/>
  </svg>
);
const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93a10 10 0 0 0-14.14 0M4.93 19.07a10 10 0 0 0 14.14 0M12 2v2M12 20v2M2 12h2M20 12h2"/>
  </svg>
);
const IconHistory = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
    <path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
  </svg>
);
const IconUpload = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

// ---------- MAIN APP ----------
export default function AttendanceApp() {
  const [tab, setTab] = useState("scan");
  const [students, setStudents] = useLocalStorage("att_students", DEFAULT_STUDENTS);
  const [sessions, setSessions] = useLocalStorage("att_sessions", []);

  return (
    <div style={styles.root}>
      {/* Background grid */}
      <div style={styles.gridBg} />

      <div style={styles.container}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.logoRow}>
            <div style={styles.logoIcon}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <div>
              <h1 style={styles.title}>AttendAI</h1>
              <p style={styles.subtitle}>Google Meet Attendance Scanner</p>
            </div>
          </div>

          {/* Tabs */}
          <nav style={styles.nav}>
            {[
              { id: "scan", label: "Scan", icon: <IconScan /> },
              { id: "settings", label: "Roster", icon: <IconSettings /> },
              { id: "history", label: "History", icon: <IconHistory /> },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{ ...styles.tabBtn, ...(tab === t.id ? styles.tabBtnActive : {}) }}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Content */}
        <main style={styles.main}>
          {tab === "scan" && (
            <ScanTab students={students} onSessionSave={(s) => setSessions(prev => [s, ...prev])} />
          )}
          {tab === "settings" && (
            <RosterTab students={students} setStudents={setStudents} />
          )}
          {tab === "history" && (
            <HistoryTab sessions={sessions} setSessions={setSessions} />
          )}
        </main>
      </div>
    </div>
  );
}

// ---------- SCAN TAB ----------
function ScanTab({ students, onSessionSave }) {
  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [sessionLabel, setSessionLabel] = useState(() => {
    const now = new Date();
    return `${now.toLocaleDateString()} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  });
  const fileRef = useRef();
  const dropRef = useRef();

  const handleFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setImage(url);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setImageBase64(e.target.result.split(",")[1]);
    reader.readAsDataURL(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, []);

  const handlePaste = useCallback((e) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"));
    if (item) handleFile(item.getAsFile());
  }, []);

  const analyze = async () => {
    if (!imageBase64) return;
    if (students.length === 0) {
      setError("No students in roster. Go to Roster tab and add names first.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    const roster = students.map(s => s.name).join(", ");
    const prompt = `You are an attendance assistant. Look at this Google Meet screenshot carefully.

Your job:
1. Find ALL participant names visible in this screenshot (look at participant tiles, participant list/panel, names shown on video tiles, etc.)
2. Match those names against the class roster below (use fuzzy/partial matching — names may be shortened, nicknames, or partially visible)
3. Return ONLY a JSON object with this exact shape:

{
  "detected": ["Name1", "Name2", ...],
  "present": ["ExactRosterName1", ...],
  "absent": ["ExactRosterName2", ...]
}

Class Roster: ${roster}

Rules:
- "detected" = raw names you actually see in the screenshot
- "present" = roster names that match detected names
- "absent" = roster names NOT matched
- Use the exact roster name spelling in present/absent arrays
- Return ONLY valid JSON, no explanation`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: imageBase64 } },
              { type: "text", text: prompt }
            ]
          }]
        })
      });

      const data = await res.json();
      const text = data.content?.map(b => b.text || "").join("") || "";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      const sessionData = {
        id: Date.now(),
        label: sessionLabel,
        date: new Date().toISOString(),
        detected: parsed.detected || [],
        present: parsed.present || [],
        absent: parsed.absent || [],
        total: students.length,
      };
      setResult(sessionData);
      onSessionSave(sessionData);
    } catch (err) {
      setError("Failed to analyze screenshot. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.scanWrap} onPaste={handlePaste} tabIndex={0}>
      {/* Session label */}
      <div style={styles.labelRow}>
        <label style={styles.label}>Session Label</label>
        <input
          style={styles.input}
          value={sessionLabel}
          onChange={e => setSessionLabel(e.target.value)}
          placeholder="e.g. Math Class – May 3"
        />
      </div>

      {/* Upload area */}
      <div
        ref={dropRef}
        style={{ ...styles.dropzone, ...(image ? styles.dropzoneHasImage : {}) }}
        onClick={() => !image && fileRef.current.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
        {image ? (
          <div style={styles.previewWrap}>
            <img src={image} alt="Screenshot" style={styles.preview} />
            <button style={styles.clearBtn} onClick={e => { e.stopPropagation(); setImage(null); setImageBase64(null); setResult(null); }}>
              Remove
            </button>
          </div>
        ) : (
          <div style={styles.dropContent}>
            <div style={styles.uploadIconWrap}><IconUpload /></div>
            <p style={styles.dropTitle}>Drop screenshot here</p>
            <p style={styles.dropSub}>or click to browse · paste from clipboard (Ctrl+V)</p>
          </div>
        )}
      </div>

      {error && <div style={styles.errorBox}>{error}</div>}

      <button
        style={{ ...styles.analyzeBtn, ...(loading || !imageBase64 ? styles.analyzeBtnDisabled : {}) }}
        onClick={analyze}
        disabled={loading || !imageBase64}
      >
        {loading ? <><Spinner /> Analyzing...</> : "⚡ Analyze Attendance"}
      </button>

      {/* Results */}
      {result && <AttendanceResult result={result} />}
    </div>
  );
}

function AttendanceResult({ result }) {
  const pct = result.total > 0 ? Math.round((result.present.length / result.total) * 100) : 0;

  return (
    <div style={styles.resultWrap}>
      <div style={styles.resultHeader}>
        <h2 style={styles.resultTitle}>Attendance Result</h2>
        <div style={styles.statRow}>
          <StatBadge label="Present" value={result.present.length} color="#4ade80" />
          <StatBadge label="Absent" value={result.absent.length} color="#f87171" />
          <StatBadge label="Rate" value={`${pct}%`} color="#60a5fa" />
        </div>
      </div>

      {/* Detected names */}
      {result.detected?.length > 0 && (
        <div style={styles.detectedRow}>
          <span style={styles.detectedLabel}>Detected in screenshot:</span>
          {result.detected.map((n, i) => (
            <span key={i} style={styles.detectedChip}>{n}</span>
          ))}
        </div>
      )}

      {/* Present / Absent lists */}
      <div style={styles.listsRow}>
        <StudentList title="✅ Present" names={result.present} color="#4ade80" bg="#052e16" />
        <StudentList title="❌ Absent" names={result.absent} color="#f87171" bg="#2d0a0a" />
      </div>
    </div>
  );
}

function StatBadge({ label, value, color }) {
  return (
    <div style={{ ...styles.statBadge, borderColor: color + "44", background: color + "11" }}>
      <span style={{ ...styles.statVal, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

function StudentList({ title, names, color, bg }) {
  return (
    <div style={{ ...styles.listBox, background: bg, borderColor: color + "33" }}>
      <h3 style={{ ...styles.listTitle, color }}>{title} ({names.length})</h3>
      {names.length === 0
        ? <p style={styles.listEmpty}>None</p>
        : names.map((n, i) => (
          <div key={i} style={styles.listItem}>
            <span style={{ color, marginRight: 6 }}>{color === "#4ade80" ? <IconCheck /> : <IconX />}</span>
            {n}
          </div>
        ))
      }
    </div>
  );
}

// ---------- ROSTER TAB ----------
function RosterTab({ students, setStudents }) {
  const [input, setInput] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulk, setBulk] = useState("");

  const addOne = () => {
    const name = input.trim();
    if (!name) return;
    if (students.find(s => s.name.toLowerCase() === name.toLowerCase())) {
      alert("Name already in roster.");
      return;
    }
    setStudents(prev => [...prev, { id: Date.now(), name }]);
    setInput("");
  };

  const addBulk = () => {
    const names = bulk.split("\n").map(n => n.trim()).filter(Boolean);
    const existing = new Set(students.map(s => s.name.toLowerCase()));
    const toAdd = names.filter(n => !existing.has(n.toLowerCase())).map(n => ({ id: Date.now() + Math.random(), name: n }));
    setStudents(prev => [...prev, ...toAdd]);
    setBulk("");
    setBulkMode(false);
  };

  const remove = (id) => setStudents(prev => prev.filter(s => s.id !== id));
  const clearAll = () => { if (confirm("Clear entire roster?")) setStudents([]); };

  return (
    <div style={styles.rosterWrap}>
      <div style={styles.rosterTop}>
        <h2 style={styles.sectionTitle}>Class Roster <span style={styles.countBadge}>{students.length}</span></h2>
        <button style={styles.ghostBtn} onClick={() => setBulkMode(b => !b)}>
          {bulkMode ? "Single Add" : "Bulk Add"}
        </button>
      </div>

      {bulkMode ? (
        <div style={styles.bulkWrap}>
          <textarea
            style={styles.textarea}
            placeholder={"One name per line:\nJuan Dela Cruz\nMaria Santos\nAhmed Ali"}
            value={bulk}
            onChange={e => setBulk(e.target.value)}
            rows={8}
          />
          <button style={styles.addBtn} onClick={addBulk}>Add All</button>
        </div>
      ) : (
        <div style={styles.addRow}>
          <input
            style={styles.input}
            placeholder="Student full name"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addOne()}
          />
          <button style={styles.addBtn} onClick={addOne}><IconPlus /> Add</button>
        </div>
      )}

      <div style={styles.rosterList}>
        {students.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={{ color: "#555", fontSize: 14 }}>No students yet. Add names above.</p>
          </div>
        ) : students.map((s, i) => (
          <div key={s.id} style={styles.rosterItem}>
            <span style={styles.rosterNum}>{i + 1}</span>
            <span style={styles.rosterName}>{s.name}</span>
            <button style={styles.removeBtn} onClick={() => remove(s.id)}><IconTrash /></button>
          </div>
        ))}
      </div>

      {students.length > 0 && (
        <button style={styles.dangerBtn} onClick={clearAll}>Clear All</button>
      )}
    </div>
  );
}

// ---------- HISTORY TAB ----------
function HistoryTab({ sessions, setSessions }) {
  const [selected, setSelected] = useState(null);

  const deleteSession = (id) => {
    setSessions(prev => prev.filter(s => s.id !== id));
    if (selected?.id === id) setSelected(null);
  };

  if (sessions.length === 0) return (
    <div style={styles.emptyState}>
      <p style={{ color: "#555", fontSize: 14 }}>No sessions scanned yet.</p>
    </div>
  );

  return (
    <div style={styles.historyWrap}>
      <div style={styles.sessionList}>
        {sessions.map(s => (
          <div
            key={s.id}
            style={{ ...styles.sessionCard, ...(selected?.id === s.id ? styles.sessionCardActive : {}) }}
            onClick={() => setSelected(s)}
          >
            <div style={styles.sessionInfo}>
              <span style={styles.sessionLabel}>{s.label}</span>
              <span style={styles.sessionDate}>{new Date(s.date).toLocaleString()}</span>
            </div>
            <div style={styles.sessionMeta}>
              <span style={{ color: "#4ade80", fontSize: 13 }}>{s.present.length}P</span>
              <span style={{ color: "#f87171", fontSize: 13, margin: "0 6px" }}>{s.absent.length}A</span>
              <button style={styles.removeBtn} onClick={e => { e.stopPropagation(); deleteSession(s.id); }}><IconTrash /></button>
            </div>
          </div>
        ))}
      </div>
      {selected && (
        <div style={styles.sessionDetail}>
          <h3 style={styles.listTitle}>{selected.label}</h3>
          <div style={styles.listsRow}>
            <StudentList title="✅ Present" names={selected.present} color="#4ade80" bg="#052e16" />
            <StudentList title="❌ Absent" names={selected.absent} color="#f87171" bg="#2d0a0a" />
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span style={{ display: "inline-block", width: 14, height: 14, border: "2px solid #fff4", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: 8 }} />
  );
}

// ---------- STYLES ----------
const styles = {
  root: {
    minHeight: "100vh",
    background: "#0a0a0f",
    color: "#e2e8f0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  gridBg: {
    position: "fixed", inset: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(rgba(74,222,128,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(74,222,128,0.04) 1px, transparent 1px)",
    backgroundSize: "40px 40px",
  },
  container: { maxWidth: 760, margin: "0 auto", padding: "0 16px 40px", position: "relative", zIndex: 1 },
  header: { padding: "28px 0 0" },
  logoRow: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
  logoIcon: {
    width: 46, height: 46, borderRadius: 12,
    background: "linear-gradient(135deg, #052e16, #14532d)",
    border: "1px solid #166534",
    display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 0 20px #4ade8022",
  },
  title: { margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", color: "#f0fdf4" },
  subtitle: { margin: 0, fontSize: 12, color: "#4ade80", letterSpacing: "0.05em" },
  nav: { display: "flex", gap: 6, borderBottom: "1px solid #1f2937", paddingBottom: 0, marginBottom: 0 },
  tabBtn: {
    display: "flex", alignItems: "center", gap: 6, padding: "10px 18px",
    background: "transparent", border: "none", color: "#6b7280",
    borderRadius: "8px 8px 0 0", cursor: "pointer", fontSize: 13, fontWeight: 500,
    borderBottom: "2px solid transparent", marginBottom: -1, transition: "all 0.15s",
  },
  tabBtnActive: { color: "#4ade80", borderBottomColor: "#4ade80", background: "#052e1622" },
  main: { padding: "24px 0" },

  // SCAN
  scanWrap: { display: "flex", flexDirection: "column", gap: 16, outline: "none" },
  labelRow: { display: "flex", flexDirection: "column", gap: 6 },
  label: { fontSize: 12, color: "#9ca3af", letterSpacing: "0.05em", textTransform: "uppercase" },
  input: {
    background: "#111827", border: "1px solid #1f2937", borderRadius: 8,
    color: "#f0fdf4", padding: "10px 14px", fontSize: 14, outline: "none",
    fontFamily: "inherit", width: "100%", boxSizing: "border-box",
  },
  dropzone: {
    border: "2px dashed #1f2937", borderRadius: 12, minHeight: 180,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "border-color 0.2s", overflow: "hidden",
    background: "#0d1117",
  },
  dropzoneHasImage: { border: "2px dashed #166534", cursor: "default" },
  dropContent: { textAlign: "center", padding: 24 },
  uploadIconWrap: { color: "#374151", marginBottom: 12, display: "flex", justifyContent: "center" },
  dropTitle: { margin: "0 0 6px", color: "#9ca3af", fontWeight: 600 },
  dropSub: { margin: 0, fontSize: 12, color: "#4b5563" },
  previewWrap: { width: "100%", position: "relative" },
  preview: { width: "100%", display: "block", maxHeight: 360, objectFit: "contain" },
  clearBtn: {
    position: "absolute", top: 8, right: 8,
    background: "#1f2937cc", border: "1px solid #374151", borderRadius: 6,
    color: "#9ca3af", padding: "4px 10px", cursor: "pointer", fontSize: 12,
  },
  analyzeBtn: {
    background: "linear-gradient(135deg, #166534, #15803d)",
    border: "1px solid #4ade8044", color: "#f0fdf4", padding: "13px 24px",
    borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 600,
    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
    boxShadow: "0 0 24px #4ade8022", transition: "opacity 0.2s",
  },
  analyzeBtnDisabled: { opacity: 0.4, cursor: "not-allowed" },
  errorBox: {
    background: "#2d0a0a", border: "1px solid #7f1d1d",
    borderRadius: 8, padding: "12px 16px", color: "#fca5a5", fontSize: 13,
  },

  // RESULT
  resultWrap: { display: "flex", flexDirection: "column", gap: 16, animation: "fadeIn 0.3s ease" },
  resultHeader: { display: "flex", flexDirection: "column", gap: 12 },
  resultTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: "#f0fdf4" },
  statRow: { display: "flex", gap: 10 },
  statBadge: {
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "8px 18px", borderRadius: 8, border: "1px solid",
  },
  statVal: { fontSize: 20, fontWeight: 700 },
  statLabel: { fontSize: 11, color: "#9ca3af" },
  detectedRow: {
    background: "#111827", border: "1px solid #1f2937", borderRadius: 8,
    padding: "10px 14px", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center",
  },
  detectedLabel: { fontSize: 11, color: "#6b7280", marginRight: 4 },
  detectedChip: {
    background: "#1f2937", borderRadius: 20, padding: "2px 10px",
    fontSize: 12, color: "#d1d5db", border: "1px solid #374151",
  },
  listsRow: { display: "flex", gap: 12, flexWrap: "wrap" },
  listBox: { flex: 1, minWidth: 200, borderRadius: 10, padding: "14px 16px", border: "1px solid" },
  listTitle: { margin: "0 0 10px", fontSize: 13, fontWeight: 600 },
  listEmpty: { fontSize: 13, color: "#4b5563", margin: 0 },
  listItem: { fontSize: 13, padding: "5px 0", borderBottom: "1px solid #ffffff08", display: "flex", alignItems: "center", color: "#d1d5db" },

  // ROSTER
  rosterWrap: { display: "flex", flexDirection: "column", gap: 16 },
  rosterTop: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 },
  countBadge: {
    background: "#166534", color: "#4ade80", fontSize: 11, fontWeight: 700,
    padding: "2px 8px", borderRadius: 20, border: "1px solid #4ade8044",
  },
  addRow: { display: "flex", gap: 8 },
  addBtn: {
    background: "#166534", border: "1px solid #4ade8044", color: "#f0fdf4",
    padding: "10px 18px", borderRadius: 8, cursor: "pointer", fontSize: 13,
    fontWeight: 600, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
  },
  ghostBtn: {
    background: "transparent", border: "1px solid #1f2937", color: "#9ca3af",
    padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 12,
  },
  bulkWrap: { display: "flex", flexDirection: "column", gap: 8 },
  textarea: {
    background: "#111827", border: "1px solid #1f2937", borderRadius: 8,
    color: "#f0fdf4", padding: "10px 14px", fontSize: 13, outline: "none",
    fontFamily: "inherit", resize: "vertical",
  },
  rosterList: { display: "flex", flexDirection: "column", gap: 4, maxHeight: 400, overflowY: "auto" },
  rosterItem: {
    display: "flex", alignItems: "center", gap: 10,
    background: "#0d1117", border: "1px solid #1f2937",
    borderRadius: 8, padding: "10px 14px",
  },
  rosterNum: { fontSize: 11, color: "#4b5563", minWidth: 20 },
  rosterName: { flex: 1, fontSize: 14, color: "#e2e8f0" },
  removeBtn: {
    background: "transparent", border: "none", color: "#4b5563",
    cursor: "pointer", padding: 4, display: "flex", alignItems: "center",
    borderRadius: 4,
  },
  dangerBtn: {
    background: "transparent", border: "1px solid #7f1d1d", color: "#f87171",
    padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 12, alignSelf: "flex-start",
  },
  emptyState: {
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 48, border: "1px dashed #1f2937", borderRadius: 12,
  },

  // HISTORY
  historyWrap: { display: "flex", flexDirection: "column", gap: 16 },
  sessionList: { display: "flex", flexDirection: "column", gap: 6 },
  sessionCard: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#0d1117", border: "1px solid #1f2937",
    borderRadius: 8, padding: "12px 16px", cursor: "pointer", transition: "border-color 0.15s",
  },
  sessionCardActive: { borderColor: "#166534", background: "#052e1633" },
  sessionInfo: { display: "flex", flexDirection: "column", gap: 3 },
  sessionLabel: { fontSize: 14, fontWeight: 600, color: "#f0fdf4" },
  sessionDate: { fontSize: 11, color: "#4b5563" },
  sessionMeta: { display: "flex", alignItems: "center", gap: 6 },
  sessionDetail: {
    background: "#0d1117", border: "1px solid #1f2937",
    borderRadius: 10, padding: "16px",
  },
};

// CSS animations injection
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
    @keyframes spin { to { transform: rotate(360deg); } }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    * { box-sizing: border-box; }
    ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #0a0a0f; }
    ::-webkit-scrollbar-thumb { background: #1f2937; border-radius: 4px; }
  `;
  document.head.appendChild(style);
}

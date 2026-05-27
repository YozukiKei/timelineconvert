import { useState, useCallback } from "react";

const SAMPLE = `0:00 イントロ
0:45 第1章：セットアップ
2:30 ハイライト①
5:12 重要ポイント
8:00 第2章：実践編
12:45 神プレイ
15:30 まとめ`;

const FPS_OPTIONS = [23.976, 24, 25, 29.97, 30, 59.94, 60];

function parseTimestamp(ts) {
  const parts = ts.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

function secondsToSMPTE(totalSeconds, fps) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const f = Math.round((totalSeconds % 1) * fps);
  return [h, m, s, f].map((v) => String(v).padStart(2, "0")).join(":");
}

function parseInput(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => {
      const match = line.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s+(.+)$/);
      if (!match) return null;
      return { time: match[1], seconds: parseTimestamp(match[1]), label: match[2].trim() };
    })
    .filter(Boolean);
}

function generatePremiereCSV(markers, fps) {
  const header = "Marker Name\tDescription\tIn\tOut\tDuration\tMarker Type";
  const rows = markers.map((m) => {
    const inTC = secondsToSMPTE(m.seconds, fps);
    const outTC = inTC;
    return `${m.label}\t\t${inTC}\t${outTC}\t00:00:00:01\tComment`;
  });
  return header + "\n" + rows.join("\n");
}

function generateEDL(markers, fps) {
  let edl = `TITLE: YouTube Markers\nFCM: NON-DROP FRAME\n\n`;
  markers.forEach((m, i) => {
    const tc = secondsToSMPTE(m.seconds, fps);
    edl += `${String(i + 1).padStart(3, "0")}  001      V     C        ${tc} ${tc} ${tc} ${tc}\n`;
    edl += `* FROM CLIP NAME: ${m.label}\n`;
    edl += `* COMMENT: ${m.label}\n\n`;
  });
  return edl;
}

function downloadFile(content, filename, type) {
  const bom = "\uFEFF";
  const blob = new Blob([bom + content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [input, setInput] = useState("");
  const [fps, setFps] = useState(29.97);
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState("csv");

  const markers = parseInput(input);
  const output =
    exportFormat === "csv"
      ? generatePremiereCSV(markers, fps)
      : generateEDL(markers, fps);

  const handlePaste = useCallback(() => {
    setInput(SAMPLE);
  }, []);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }, [output]);

  const handleDownload = useCallback(() => {
    if (exportFormat === "csv") {
      downloadFile(output, "markers.tsv", "text/tab-separated-values");
    } else {
      downloadFile(output, "markers.edl", "text/plain");
    }
  }, [output, exportFormat]);

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg, #0c0c0e)",
      color: "var(--text, #e8e6e1)",
      fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      padding: "32px 20px",
      boxSizing: "border-box",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600&family=DM+Sans:wght@400;500;700&display=swap');
        :root {
          --bg: #0c0c0e;
          --surface: #161618;
          --surface2: #1e1e22;
          --border: #2a2a30;
          --border-active: #ea4f6a;
          --accent: #ea4f6a;
          --accent-dim: rgba(234,79,106,0.12);
          --accent-glow: rgba(234,79,106,0.25);
          --text: #e8e6e1;
          --text2: #8a8890;
          --text3: #5a5860;
          --premiere-blue: #00d4ff;
          --premiere-blue-dim: rgba(0,212,255,0.08);
          --green: #4ade80;
          --green-dim: rgba(74,222,128,0.12);
        }
        * { box-sizing: border-box; }
        textarea:focus, select:focus, button:focus-visible {
          outline: 1px solid var(--accent);
          outline-offset: 1px;
        }
        textarea::placeholder { color: var(--text3); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .marker-row { animation: fadeIn 0.2s ease both; }
        .marker-row:hover { background: var(--accent-dim) !important; }
        .btn {
          padding: 8px 16px;
          border-radius: 6px;
          border: 1px solid var(--border);
          background: var(--surface2);
          color: var(--text);
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .btn:hover { border-color: var(--text3); background: var(--border); }
        .btn-accent {
          background: var(--accent);
          border-color: var(--accent);
          color: #fff;
        }
        .btn-accent:hover { background: #d43d5a; border-color: #d43d5a; }
        .format-tab {
          padding: 6px 14px;
          border-radius: 5px;
          border: 1px solid transparent;
          background: transparent;
          color: var(--text3);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .format-tab.active {
          background: var(--accent-dim);
          color: var(--accent);
          border-color: rgba(234,79,106,0.25);
        }
        .format-tab:hover:not(.active) { color: var(--text2); }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12, marginBottom: 8
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: "linear-gradient(135deg, var(--accent), #9b59b6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>▶</div>
            <h1 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em",
            }}>
              YT → Premiere Pro Markers
            </h1>
          </div>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            color: "var(--text2)", fontSize: 14, margin: 0, paddingLeft: 48,
          }}>
            YouTubeのタイムスタンプをPremiere Proマーカーに変換
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Left: Input */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 500, color: "var(--text2)",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>タイムスタンプ入力</label>
              <button className="btn" onClick={handlePaste}
                style={{ padding: "4px 10px", fontSize: 11 }}>
                サンプル挿入
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`0:00 イントロ\n0:45 第1章\n2:30 ハイライト\n5:12 重要ポイント`}
              spellCheck={false}
              style={{
                width: "100%", height: 320,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10, padding: 16,
                color: "var(--text)", fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineHeight: 2, resize: "none",
              }}
            />

            {/* Settings */}
            <div style={{
              marginTop: 14,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 16,
            }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 14,
              }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12, color: "var(--text2)",
                  textTransform: "uppercase", letterSpacing: "0.08em",
                }}>設定</span>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                marginBottom: 12,
              }}>
                <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  フレームレート
                </span>
                <select value={fps} onChange={(e) => setFps(Number(e.target.value))}
                  style={{
                    background: "var(--surface2)", border: "1px solid var(--border)",
                    borderRadius: 6, padding: "5px 10px",
                    color: "var(--text)", fontSize: 13,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>
                  {FPS_OPTIONS.map((f) => (
                    <option key={f} value={f}>{f} fps</option>
                  ))}
                </select>
              </div>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <span style={{ fontSize: 13, fontFamily: "'DM Sans', sans-serif" }}>
                  出力形式
                </span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button
                    className={`format-tab ${exportFormat === "csv" ? "active" : ""}`}
                    onClick={() => setExportFormat("csv")}
                  >TSV</button>
                  <button
                    className={`format-tab ${exportFormat === "edl" ? "active" : ""}`}
                    onClick={() => setExportFormat("edl")}
                  >EDL</button>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Preview & Output */}
          <div>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 10,
            }}>
              <label style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12, fontWeight: 500, color: "var(--text2)",
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                プレビュー
                {markers.length > 0 && (
                  <span style={{
                    marginLeft: 8, color: "var(--accent)",
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11, fontWeight: 400,
                  }}>
                    {markers.length} markers
                  </span>
                )}
              </label>
            </div>

            {/* Visual Timeline */}
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10, padding: 0,
              height: 320, overflowY: "auto",
            }}>
              {markers.length === 0 ? (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  height: "100%", flexDirection: "column", gap: 8,
                }}>
                  <span style={{ fontSize: 28, opacity: 0.3 }}>⏱</span>
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    color: "var(--text3)", fontSize: 13,
                  }}>左にタイムスタンプを貼り付け</span>
                </div>
              ) : (
                <div style={{ padding: "8px 0" }}>
                  {markers.map((m, i) => (
                    <div key={i} className="marker-row" style={{
                      display: "flex", alignItems: "center",
                      padding: "8px 16px", gap: 12,
                      borderLeft: "3px solid transparent",
                      animationDelay: `${i * 40}ms`,
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderLeftColor = "var(--accent)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderLeftColor = "transparent";
                    }}
                    >
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 12, color: "var(--premiere-blue)",
                        background: "var(--premiere-blue-dim)",
                        padding: "3px 8px", borderRadius: 4,
                        minWidth: 72, textAlign: "center",
                        fontWeight: 500,
                      }}>
                        {secondsToSMPTE(m.seconds, fps)}
                      </span>
                      <span style={{
                        fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                        color: "var(--text)",
                        overflow: "hidden", textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {m.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{
              marginTop: 14, display: "flex", gap: 8,
            }}>
              <button
                className="btn btn-accent"
                onClick={handleDownload}
                disabled={markers.length === 0}
                style={{
                  flex: 1,
                  opacity: markers.length === 0 ? 0.4 : 1,
                  justifyContent: "center",
                }}>
                ↓ {exportFormat === "csv" ? ".tsv" : ".edl"} ダウンロード
              </button>
              <button
                className="btn"
                onClick={handleCopy}
                disabled={markers.length === 0}
                style={{
                  opacity: markers.length === 0 ? 0.4 : 1,
                }}>
                {copied ? "✓ コピー済" : "コピー"}
              </button>
            </div>

            {/* Usage hint */}
            <div style={{
              marginTop: 14,
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: 10, padding: 14,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 12, color: "var(--text3)", lineHeight: 1.7,
            }}>
              <div style={{
                fontWeight: 500, color: "var(--text2)", marginBottom: 6,
                textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11,
              }}>使い方</div>
              <div><span style={{ color: "var(--accent)" }}>TSV</span> → Premiere Pro のマーカーパネル右クリック →「マーカーを読み込み」</div>
              <div><span style={{ color: "var(--accent)" }}>EDL</span> → ファイル → 読み込み → EDLファイルを選択</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

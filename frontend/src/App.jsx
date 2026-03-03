import { useState, useEffect } from "react";

function App() {
  const BACKEND = "http://localhost:5000";

  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("IN");
  const [minSubs, setMinSubs] = useState(50000);
  const [target, setTarget] = useState(500);

  const [channels, setChannels] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  const startScraper = async () => {
    setLoading(true);

    await fetch(`${BACKEND}/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: keywords.split(",").map(k => k.trim()),
        country,
        minSubs: Number(minSubs),
        target: Number(target),
      }),
    });

    setLoading(false);
  };

  const fetchData = async () => {
    const ch = await fetch(`${BACKEND}/channels`).then(r => r.json());
    const lg = await fetch(`${BACKEND}/logs`).then(r => r.json());
    setChannels(ch);
    setLogs(lg);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{
      background: "#0f172a",
      minHeight: "100vh",
      color: "#22d3ee",
      fontFamily: "monospace",
      padding: 20
    }}>
      <h1>YOUTUBE SCRAPER DASHBOARD</h1>

      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <input
          placeholder="Keywords"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
        />
        <input
          placeholder="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        />
        <input
          type="number"
          value={minSubs}
          onChange={(e) => setMinSubs(e.target.value)}
        />
        <input
          type="number"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        />
        <button onClick={startScraper}>
          {loading ? "Starting..." : "Start"}
        </button>
      </div>

      <h2>EMAIL LEADS ({channels.length})</h2>

      <table border="1" cellPadding="8" style={{ width: "100%", marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Channel</th>
            <th>Subscribers</th>
            <th>Country</th>
            <th>Email</th>
          </tr>
        </thead>
        <tbody>
          {channels.map((ch) => (
            <tr key={ch.channelId}>
              <td>{ch.title}</td>
              <td>{ch.subscribers}</td>
              <td>{ch.country}</td>
              <td>{ch.email}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>LIVE LOGS</h2>

      <div style={{
        background: "black",
        padding: 10,
        height: 250,
        overflowY: "scroll"
      }}>
        {logs.map((log) => (
          <div key={log._id}>
            [{new Date(log.createdAt).toLocaleTimeString()}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
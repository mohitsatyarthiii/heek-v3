import { useEffect, useState } from "react";
import { 
  PlayCircle, 
  Users, 
  Mail, 
  TrendingUp, 
  Globe2,
  Activity,
  Clock,
  Target,
  MapPin,
  Filter,
  Sparkles,
  BarChart3,
  Zap,
  RefreshCw,
  ChevronRight
} from "lucide-react";

const API = "https://heek-v3.onrender.com";

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("IN");
  const [minSubs, setMinSubs] = useState(50000);
  const [target, setTarget] = useState(500);

  const startScraper = async () => {
    setLoading(true);
    try {
      await fetch(API + "/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: keywords.split(",").map(k => k.trim()),
          country,
          minSubs: Number(minSubs),
          target: Number(target)
        })
      });
    } catch (error) {
      console.error("Error starting scraper:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
  try {
    const response = await fetch(API + "/stats");
    
    // Check if response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Check content type
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("Received non-JSON response:", text.substring(0, 200));
      throw new Error("Received non-JSON response from server");
    }
    
    const data = await response.json();
    setStats(data);
    
    // Similarly for logs
    const logsResponse = await fetch(API + "/logs");
    if (!logsResponse.ok) throw new Error(`HTTP error! status: ${logsResponse.status}`);
    const logsData = await logsResponse.json();
    setLogs(logsData);
    
  } catch (error) {
    console.error("Error fetching data:", error);
    // Set fallback data to prevent UI breakage
    setStats({
      total: 0,
      withEmail: 0,
      emailRate: 0,
      topCountries: []
    });
    setLogs([]);
  }
};

  useEffect(() => {
    fetchData();
    if (autoRefresh) {
      const i = setInterval(fetchData, 3000);
      return () => clearInterval(i);
    }
  }, [autoRefresh]);

  // Calculate dynamic stats
  const successRate = stats?.total ? Math.round((stats.withEmail / stats.total) * 100) : 0;
  const topCountry = stats?.topCountries?.[0]?._id || "N/A";
  const topCountryCount = stats?.topCountries?.[0]?.count || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header with animated gradient */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl blur-xl" />
          <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-cyan-400" />
                Scraper Control Center
                <span className="text-sm font-normal text-slate-500 ml-2 flex items-center gap-1">
                  <Activity className="w-4 h-4" />
                  v2.0
                </span>
              </h1>
              <p className="text-slate-400">Monitor and manage your YouTube creator scraper in real-time</p>
            </div>
            
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
                autoRefresh 
                  ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400' 
                  : 'bg-slate-800/50 border-slate-700 text-slate-400'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium">Auto-refresh</span>
            </button>
          </div>
        </div>

        {/* Stats Grid with animated cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          {/* Total Collected Card */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-800 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/5">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/0 group-hover:from-cyan-500/5 group-hover:via-cyan-500/5 group-hover:to-transparent rounded-2xl transition-all duration-500" />
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Collected
                </p>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {stats?.total ?? 0}
                </h2>
                <p className="text-xs text-slate-500">Across all campaigns</p>
              </div>
              <div className="w-12 h-12 bg-cyan-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div className="mt-4 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
            </div>
          </div>

          {/* With Email Card */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-800 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5">
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  With Email
                </p>
                <h2 className="text-4xl font-bold text-white mb-2">
                  {stats?.withEmail ?? 0}
                </h2>
                <p className="text-xs text-slate-500">{successRate}% success rate</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-6 h-6 text-purple-400" />
              </div>
            </div>
          </div>

          {/* Email Hit Rate Card */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-800 rounded-2xl p-6 hover:border-green-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-green-500/5">
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Email Hit Rate
                </p>
                <h2 className="text-4xl font-bold text-green-400 mb-2">
                  {stats?.emailRate ?? 0}%
                </h2>
                <p className="text-xs text-slate-500">Above target</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          {/* Top Country Card */}
          <div className="group relative bg-gradient-to-br from-slate-900 to-slate-800/50 border border-slate-800 rounded-2xl p-6 hover:border-orange-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-orange-500/5">
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1 flex items-center gap-2">
                  <Globe2 className="w-4 h-4" />
                  Top Country
                </p>
                <h2 className="text-4xl font-bold text-white mb-2 flex items-baseline gap-2">
                  {topCountry}
                  <span className="text-sm font-normal text-slate-500">
                    ({topCountryCount})
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Leading region</p>
              </div>
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <MapPin className="w-6 h-6 text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Control Center */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 rounded-2xl" />
          <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
            
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-cyan-400" />
                Scraper Configuration
              </h2>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Filter className="w-4 h-4" />
                <span>Configure parameters below</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              
              {/* Keywords Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-cyan-400 rounded-full" />
                  Keywords
                </label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 transition-colors"
                  placeholder="ai, crypto, tech"
                  value={keywords}
                  onChange={e => setKeywords(e.target.value)}
                />
              </div>

              {/* Country Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-purple-400 rounded-full" />
                  Country
                </label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Country code"
                  value={country}
                  onChange={e => setCountry(e.target.value)}
                />
              </div>

              {/* Min Subs Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-green-400 rounded-full" />
                  Min Subscribers
                </label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-green-500 transition-colors"
                  type="number"
                  value={minSubs}
                  onChange={e => setMinSubs(e.target.value)}
                />
              </div>

              {/* Target Input */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="w-1 h-1 bg-orange-400 rounded-full" />
                  Target Count
                </label>
                <input
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:border-orange-500 transition-colors"
                  type="number"
                  value={target}
                  onChange={e => setTarget(e.target.value)}
                />
              </div>

              {/* Start Button */}
              <div className="space-y-2">
                <label className="text-sm text-slate-400 opacity-0">Action</label>
                <button
                  onClick={startScraper}
                  disabled={loading}
                  className="w-full h-[50px] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-5 h-5" />
                      Start Scraper
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live Logs Section */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-2xl" />
          <div className="relative bg-slate-900/90 backdrop-blur-sm border border-slate-800 rounded-2xl p-6">
            
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-green-400" />
                  Live Activity Feed
                </h2>
                <span className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-green-400">LIVE</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock className="w-4 h-4" />
                <span>Last updated: {new Date().toLocaleTimeString()}</span>
              </div>
            </div>

            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-4 h-[400px] overflow-y-auto custom-scrollbar">
              {logs.length > 0 ? (
                <div className="space-y-3">
                  {logs.map((log, index) => (
                    <div
                      key={log._id || index}
                      className="group relative bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:border-green-500/30 transition-all duration-300 hover:translate-x-1"
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-green-500 to-emerald-500 rounded-l-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex items-start gap-3 ml-2">
                        <span className="text-xs font-mono text-green-400 min-w-[70px]">
                          [{new Date(log.createdAt).toLocaleTimeString()}]
                        </span>
                        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 transition-colors" />
                        <span className="text-sm text-slate-300 flex-1">
                          {log.message}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-600">
                  <Activity className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium">No logs available</p>
                  <p className="text-sm">Start the scraper to see live activity</p>
                </div>
              )}
            </div>

            {/* Logs Footer */}
            <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <span className="w-1 h-1 bg-green-500 rounded-full" />
                  {logs.length} events
                </span>
                <span className="flex items-center gap-1">
                  <BarChart3 className="w-3 h-3" />
                  Real-time updates
                </span>
              </div>
              <button className="hover:text-cyan-400 transition-colors">
                View all logs →
              </button>
            </div>
          </div>
        </div>

        {/* Custom Scrollbar Styles */}
        <style jsx>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(15, 23, 42, 0.5);
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(34, 211, 238, 0.3);
            border-radius: 10px;
            transition: all 0.3s;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(34, 211, 238, 0.5);
          }
        `}</style>
      </div>
    </div>
  );
}
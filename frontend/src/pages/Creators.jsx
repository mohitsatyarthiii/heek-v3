import { useEffect, useState } from "react";
import { 
  Search, 
  Mail, 
  Users, 
  Globe, 
  Filter,
  ChevronDown,
  ExternalLink,
  Youtube 
} from "lucide-react";

const API = "http://31.97.228.243:5000";

export default function Creators() {
  const [channels, setChannels] = useState([]);
  const [filteredChannels, setFilteredChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");
  const [subscriberFilter, setSubscriberFilter] = useState("all");
  const [uniqueCountries, setUniqueCountries] = useState([]);

  // Format subscribers with K, M, B suffixes
  const formatSubscribers = (count) => {
    if (!count && count !== 0) return "N/A";
    if (count >= 1000000000) {
      return (count / 1000000000).toFixed(1) + "B";
    }
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + "M";
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + "K";
    }
    return count.toString();
  };

  // Generate YouTube channel URL
  const getChannelUrl = (channelId) => {
    return `https://youtube.com/channel/${channelId}`;
  };

  // Generate mailto link
  const getMailtoLink = (email) => {
    return `mailto:${email}`;
  };

  const fetchChannels = async () => {
    try {
      const data = await fetch(API + "/channels").then((r) => r.json());
      setChannels(data);
      setFilteredChannels(data);
      
      // Extract unique countries for filter
      const countries = [...new Set(data.map(c => c.country).filter(Boolean))];
      setUniqueCountries(countries);
    } catch (error) {
      console.error("Error fetching channels:", error);
    }
  };

  // Apply filters whenever search term or filters change
  useEffect(() => {
    let filtered = [...channels];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (channel) =>
          channel.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          channel.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply country filter
    if (countryFilter !== "all") {
      filtered = filtered.filter((channel) => channel.country === countryFilter);
    }

    // Apply subscriber filter
    if (subscriberFilter !== "all") {
      filtered = filtered.filter((channel) => {
        const subs = channel.subscribers || 0;
        switch (subscriberFilter) {
          case "under10k":
            return subs < 10000;
          case "10kto100k":
            return subs >= 10000 && subs < 100000;
          case "100kto1m":
            return subs >= 100000 && subs < 1000000;
          case "over1m":
            return subs >= 1000000;
          default:
            return true;
        }
      });
    }

    setFilteredChannels(filtered);
  }, [searchTerm, countryFilter, subscriberFilter, channels]);

  useEffect(() => {
    fetchChannels();
    const i = setInterval(fetchChannels, 3000);
    return () => clearInterval(i);
  }, []);

  // Calculate stats
  const totalSubscribers = channels.reduce((acc, c) => acc + (c.subscribers || 0), 0);
  const averageSubscribers = channels.length ? Math.round(totalSubscribers / channels.length) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
              <Youtube className="w-8 h-8 text-red-500" />
              Creator Analytics Dashboard
            </h1>
            <p className="text-slate-400">Track and manage your YouTube creators</p>
          </div>
          
          {/* Stats Cards */}
          <div className="flex gap-4">
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl px-6 py-3">
              <p className="text-slate-400 text-sm">Total Creators</p>
              <p className="text-2xl font-bold text-white">{channels.length}</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl px-6 py-3">
              <p className="text-slate-400 text-sm">Total Subs</p>
              <p className="text-2xl font-bold text-white">{formatSubscribers(totalSubscribers)}</p>
            </div>
            <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl px-6 py-3">
              <p className="text-slate-400 text-sm">Avg Subs</p>
              <p className="text-2xl font-bold text-white">{formatSubscribers(averageSubscribers)}</p>
            </div>
          </div>
        </div>

        {/* Filters Section */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <Filter className="w-5 h-5 text-slate-400" />
            <h2 className="text-white font-semibold">Filters</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search by channel or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            {/* Country Filter */}
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={countryFilter}
                onChange={(e) => setCountryFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">All Countries</option>
                {uniqueCountries.map((country) => (
                  <option key={country} value={country}>
                    {country || "Unknown"}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Subscriber Filter */}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={subscriberFilter}
                onChange={(e) => setSubscriberFilter(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-8 py-2.5 text-white appearance-none cursor-pointer focus:outline-none focus:border-cyan-500 transition-colors"
              >
                <option value="all">All Subscribers</option>
                <option value="under10k">Under 10K</option>
                <option value="10kto100k">10K - 100K</option>
                <option value="100kto1m">100K - 1M</option>
                <option value="over1m">Over 1M</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
            </div>

            {/* Results Count */}
            <div className="flex items-center justify-end text-slate-400">
              <span className="text-sm">
                Showing <span className="text-white font-semibold">{filteredChannels.length}</span> of{" "}
                <span className="text-white font-semibold">{channels.length}</span> creators
              </span>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-slate-800 to-slate-900">
                <th className="p-5 text-left">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Youtube className="w-4 h-4 text-red-400" />
                    Channel
                  </div>
                </th>
                <th className="p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold">
                    <Users className="w-4 h-4 text-blue-400" />
                    Subscribers
                  </div>
                </th>
                <th className="p-5 text-center">
                  <div className="flex items-center justify-center gap-2 text-slate-300 font-semibold">
                    <Globe className="w-4 h-4 text-green-400" />
                    Country
                  </div>
                </th>
                <th className="p-5 text-left">
                  <div className="flex items-center gap-2 text-slate-300 font-semibold">
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Email
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredChannels.length > 0 ? (
                filteredChannels.map((c, index) => (
                  <tr
                    key={c.channelId}
                    className="group border-t border-slate-800 hover:bg-slate-800/50 transition-all duration-300"
                  >
                    <td className="p-5">
                      <a
                        href={getChannelUrl(c.channelId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 text-white hover:text-cyan-400 transition-colors group/link"
                      >
                        <span className="font-medium">{c.title || "Untitled"}</span>
                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="p-5 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 bg-gradient-to-r from-slate-800 to-slate-700 rounded-full text-sm font-semibold text-white">
                        {formatSubscribers(c.subscribers)}
                      </span>
                    </td>
                    <td className="p-5 text-center">
                      <span className="text-slate-300">{c.country || "Unknown"}</span>
                    </td>
                    <td className="p-5">
                      {c.email ? (
                        <a
                          href={getMailtoLink(c.email)}
                          className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors group"
                        >
                          <Mail className="w-4 h-4" />
                          <span className="border-b border-cyan-400/30 group-hover:border-cyan-300">
                            {c.email}
                          </span>
                        </a>
                      ) : (
                        <span className="text-slate-600">No email</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="p-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-500">
                      <Search className="w-12 h-12 opacity-50" />
                      <p className="text-lg">No creators found</p>
                      <p className="text-sm">Try adjusting your filters</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
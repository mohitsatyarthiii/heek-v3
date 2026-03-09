import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import express from "express";
import cors from "cors";

dotenv.config();

/* ================= CONFIG ================= */

let COUNTRY = "IN";
let MIN_SUBS = 0;
let TARGET_PER_KEYWORD = 0;
let INTERVAL = 1000 * 60 * 30;
let isRunning = false;

// API Keys configuration
const API_KEYS = [
  process.env.YOUTUBE_API_KEY_1,
  process.env.YOUTUBE_API_KEY_2,
  process.env.YOUTUBE_API_KEY_3,
  process.env.YOUTUBE_API_KEY_4,
  process.env.YOUTUBE_API_KEY_5,
  process.env.YOUTUBE_API_KEY_6,
  process.env.YOUTUBE_API_KEY_7,
  process.env.YOUTUBE_API_KEY_8,
  process.env.YOUTUBE_API_KEY_9,
  process.env.YOUTUBE_API_KEY_10,
  process.env.YOUTUBE_API_KEY_11,
  process.env.YOUTUBE_API_KEY_12  
].filter(key => key);

let currentKeyIndex = 0;
let quotaExceededKeys = new Set();
let lastKeyReset = Date.now();

/* ================= QUEUE SCHEMA ================= */

const queueSchema = new mongoose.Schema({
  keyword: { type: String, required: true },
  country: { type: String, default: "IN" },
  minSubs: { type: Number, default: 50000 },
  targetCount: { type: Number, default: 500 },
  status: { 
    type: String, 
    enum: ['pending', 'running', 'completed', 'paused', 'failed'],
    default: 'pending'
  },
  progress: {
    collected: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  stats: {
    channelsFound: { type: Number, default: 0 },
    emailsFound: { type: Number, default: 0 },
    startTime: Date,
    endTime: Date,
    lastRun: Date
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const crawlerConfigSchema = new mongoose.Schema({
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  currentKeyword: String,
  lastRun: Date,
  totalRuns: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const Queue = mongoose.model("Queue", queueSchema);
const CrawlerConfig = mongoose.model("CrawlerConfig", crawlerConfigSchema);

/* ================= DB CONNECT ================= */

await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB Connected");

/* ================= MODELS ================= */

const channelSchema = new mongoose.Schema(
  {
    channelId: { type: String, unique: true, index: true },
    keyword: { type: String, index: true }, // Track which keyword found it
    title: String,
    subscribers: Number,
    views: Number,
    videos: Number,
    country: String,
    email: String,
  },
  { timestamps: true }
);

const logSchema = new mongoose.Schema(
  {
    message: String,
    keyword: String,
    type: { type: String, enum: ['info', 'success', 'error', 'warning'], default: 'info' }
  },
  { timestamps: true }
);

const Channel = mongoose.model("Channel", channelSchema);
const Log = mongoose.model("Log", logSchema);

/* ================= LOG FUNCTION ================= */

async function addLog(message, type = 'info', keyword = null) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] [${type.toUpperCase()}] ${message}`);
  await Log.create({ message, type, keyword });
}

/* ================= QUEUE FUNCTIONS ================= */

// Add keyword to queue
async function addToQueue(keyword, country, minSubs, targetCount) {
  const existing = await Queue.findOne({ 
    keyword, 
    status: { $in: ['pending', 'running'] } 
  });
  
  if (existing) {
    return { success: false, message: "Keyword already in queue" };
  }

  const queueItem = await Queue.create({
    keyword,
    country: country || COUNTRY,
    minSubs: minSubs || MIN_SUBS,
    targetCount: targetCount || TARGET_PER_KEYWORD,
    progress: { total: targetCount || TARGET_PER_KEYWORD }
  });

  return { success: true, queueItem };
}

// Get next pending item from queue
async function getNextQueueItem() {
  return await Queue.findOneAndUpdate(
    { 
      status: 'pending',
      $or: [
        { 'stats.lastRun': { $exists: false } },
        { 'stats.lastRun': { $lt: new Date(Date.now() - 5 * 60 * 1000) } } // 5 min cooldown
      ]
    },
    { 
      status: 'running',
      'stats.startTime': new Date(),
      updatedAt: new Date()
    },
    { sort: { createdAt: 1 }, new: true }
  );
}

// Update queue progress
async function updateQueueProgress(queueId, collected, channelsFound, emailsFound) {
  await Queue.findByIdAndUpdate(queueId, {
    $set: {
      'progress.collected': collected,
      'stats.channelsFound': channelsFound,
      'stats.emailsFound': emailsFound,
      'stats.lastRun': new Date(),
      updatedAt: new Date()
    }
  });
}

// Complete queue item
async function completeQueueItem(queueId, collected) {
  await Queue.findByIdAndUpdate(queueId, {
    status: 'completed',
    'progress.collected': collected,
    'stats.endTime': new Date(),
    updatedAt: new Date()
  });
}

// Pause queue item
async function pauseQueueItem(queueId) {
  await Queue.findByIdAndUpdate(queueId, {
    status: 'paused',
    updatedAt: new Date()
  });
}

// Resume queue item
async function resumeQueueItem(queueId) {
  await Queue.findByIdAndUpdate(queueId, {
    status: 'pending',
    updatedAt: new Date()
  });
}

// Fail queue item
async function failQueueItem(queueId, error) {
  await Queue.findByIdAndUpdate(queueId, {
    status: 'failed',
    'stats.endTime': new Date(),
    updatedAt: new Date()
  });
  await addLog(`Queue item failed: ${error}`, 'error');
}

/* ================= API KEY FUNCTIONS ================= */

function shouldResetQuotaTracking() {
  const now = Date.now();
  const lastReset = new Date(lastKeyReset);
  const today = new Date(now);
  
  return lastReset.getDate() !== today.getDate() ||
         lastReset.getMonth() !== today.getMonth() ||
         lastReset.getFullYear() !== today.getFullYear();
}

function resetQuotaTracking() {
  if (shouldResetQuotaTracking()) {
    quotaExceededKeys.clear();
    currentKeyIndex = 0;
    lastKeyReset = Date.now();
    console.log("🔄 New day - Reset quota tracking for all keys");
  }
}

function getNextApiKey() {
  resetQuotaTracking();
  
  if (quotaExceededKeys.size >= API_KEYS.length) {
    console.log("❌ ALL API KEYS HAVE EXCEEDED QUOTA!");
    return null;
  }

  let attempts = 0;
  const maxAttempts = API_KEYS.length * 2;

  while (attempts < maxAttempts) {
    const key = API_KEYS[currentKeyIndex];
    
    if (!quotaExceededKeys.has(key)) {
      return key;
    }

    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    attempts++;
  }

  return null;
}

function markCurrentKeyQuotaExceeded() {
  const currentKey = API_KEYS[currentKeyIndex];
  quotaExceededKeys.add(currentKey);
  
  console.log(`⚠️ API Key ${currentKeyIndex + 1} quota exceeded. Moving to next key...`);
  console.log(`📊 Active keys: ${API_KEYS.length - quotaExceededKeys.size}/${API_KEYS.length}`);
  
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
}

/* ================= EMAIL EXTRACT ================= */

function extractEmail(text) {
  if (!text) return null;
  const match = text.match(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
  );
  return match ? match[0] : null;
}

/* ================= API REQUEST WITH RETRY ================= */

async function makeRequest(requestFn, retryCount = 0) {
  const maxRetries = API_KEYS.length * 2;
  
  try {
    return await requestFn();
  } catch (error) {
    if (error.response?.status === 403 && 
        error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
      
      markCurrentKeyQuotaExceeded();
      
      if (retryCount < maxRetries) {
        await addLog(`🔄 Retrying with next API key... (Attempt ${retryCount + 1}/${maxRetries})`, 'info');
        await new Promise(resolve => setTimeout(resolve, 1000));
        return await makeRequest(requestFn, retryCount + 1);
      } else {
        throw new Error("All API keys have exceeded quota");
      }
    }
    throw error;
  }
}

/* ================= SCRAPER ================= */

async function fetchChannels(queueItem) {
  const { keyword, country, minSubs, targetCount, _id } = queueItem;

  await addLog(`🔍 Searching: ${keyword}`, "info", keyword);

  let nextPageToken = null;
  let collected = 0;
  let totalChannelsFound = 0;
  let emailsFound = 0;
  let consecutiveErrors = 0;

  let pageCount = 0;
  const MAX_PAGES =1000; // prevents infinite loops

  while (collected < targetCount && pageCount < MAX_PAGES) {
    try {

      const currentItem = await Queue.findById(_id);
      if (!currentItem || currentItem.status === "paused") {
        await addLog(`⏸️ Paused: ${keyword}`, "warning", keyword);
        break;
      }

      const apiKey = getNextApiKey();
      if (!apiKey) {
        await addLog("❌ No API keys available", "error", keyword);
        break;
      }

      const search = await makeRequest(async () => {
        return await axios.get(
          "https://www.googleapis.com/youtube/v3/search",
          {
            params: {
              key: apiKey,
              q: keyword,
              type: "channel",
              part: "snippet",
              maxResults: 5000,
              regionCode: country,
              pageToken: nextPageToken
            },
            timeout: 30000
          }
        );
      });

      const ids = search.data.items.map(i => i.snippet.channelId);
      if (!ids.length) break;

      const details = await makeRequest(async () => {
        return await axios.get(
          "https://www.googleapis.com/youtube/v3/channels",
          {
            params: {
              key: apiKey,
              id: ids.join(","),
              part: "snippet,statistics"
            },
            timeout: 30000
          }
        );
      });

      for (const ch of details.data.items) {

        totalChannelsFound++;

        const subs = parseInt(ch.statistics.subscriberCount || 0);
        if (subs < minSubs) continue;

        const email = extractEmail(ch.snippet.description);

        if (!email) continue;

        const exists = await Channel.findOne({ channelId: ch.id });
        if (exists) continue;

        emailsFound++;

        await Channel.create({
          channelId: ch.id,
          keyword,
          title: ch.snippet.title,
          subscribers: subs,
          views: parseInt(ch.statistics.viewCount || 0),
          videos: parseInt(ch.statistics.videoCount || 0),
          country: ch.snippet.country,
          email
        });

        collected++;

        await addLog(
          `✅ Saved: ${ch.snippet.title} (${subs.toLocaleString()} subs)`,
          "success",
          keyword
        );

        if (collected % 10 === 0) {
          await updateQueueProgress(_id, collected, totalChannelsFound, emailsFound);
        }

        if (collected >= targetCount) break;
      }

      nextPageToken = search.data.nextPageToken;
      pageCount++;

      if (!nextPageToken) break;

    } catch (error) {

      consecutiveErrors++;

      if (error.message === "All API keys have exceeded quota") {
        await addLog("❌ All API keys quota exceeded", "error", keyword);
        await failQueueItem(_id, "All keys quota exceeded");
        break;
      }

      await addLog(`❌ Error: ${error.message}`, "error", keyword);

      if (consecutiveErrors > 5) {
        await addLog("❌ Too many errors. Stopping.", "error", keyword);
        await failQueueItem(_id, "Too many errors");
        break;
      }

      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (collected >= targetCount) {

    await completeQueueItem(_id, collected);

    await addLog(
      `🎯 Completed ${keyword} → ${collected}/${targetCount} emails`,
      "success",
      keyword
    );

  } else {

    await updateQueueProgress(_id, collected, totalChannelsFound, emailsFound);

    await addLog(
      `⚠ Partial result: ${collected}/${targetCount}`,
      "warning",
      keyword
    );
  }

  return collected;
}

async function runScraper() {
  if (isRunning) {
    await addLog("⚠️ Scraper already running, skipping...", 'warning');
    return;
  }
  
  isRunning = true;
  await addLog("🚀 Scraper Started", 'info');

  while (isRunning) {
    // Check if any keys are available
    if (quotaExceededKeys.size >= API_KEYS.length) {
      await addLog("❌ All keys are quota exceeded. Waiting for next day...", 'error');
      isRunning = false;
      break;
    }

    // Get next queue item
    const queueItem = await getNextQueueItem();
    if (!queueItem) {
      await addLog("📭 No pending items in queue", 'info');
      break;
    }

    await addLog(`▶️ Processing: ${queueItem.keyword}`, 'info', queueItem.keyword);
    
    try {
      await fetchChannels(queueItem);
    } catch (error) {
      await addLog(`❌ Failed to process ${queueItem.keyword}: ${error.message}`, 'error', queueItem.keyword);
      await failQueueItem(queueItem._id, error.message);
    }
  }

  await addLog("✅ Scraper Completed", 'info');
  isRunning = false;
}

/* ================= EXPRESS ================= */

const app = express();
const allowedOrigins = [
  
  "http://localhost:5173",
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());

// API Status endpoint
app.get("/api-status", (req, res) => {
  res.json({
    totalKeys: API_KEYS.length,
    activeKeys: API_KEYS.length - quotaExceededKeys.size,
    quotaExceededKeys: quotaExceededKeys.size,
    currentKeyIndex: currentKeyIndex + 1,
    lastKeyReset: new Date(lastKeyReset).toLocaleString(),
    isRunning
  });
});

// Queue endpoints
// Get all queue items
app.get("/queue", async (req, res) => {
  try {
    const items = await Queue.find().sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Add keywords to queue
app.post("/queue/add", async (req, res) => {
  try {
    const { keywords, country, minSubs, target } = req.body;
    
    // Handle both string and array formats
    const keywordList = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
    
    const results = [];
    for (const keyword of keywordList) {
      if (keyword) { // Skip empty strings
        const result = await addToQueue(keyword, country, minSubs, target);
        results.push(result);
      }
    }
    
    res.json({ 
      success: true, 
      added: results.filter(r => r?.success).length,
      results 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Pause queue item
app.post("/queue/pause/:id", async (req, res) => {
  try {
    await pauseQueueItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Resume queue item
app.post("/queue/resume/:id", async (req, res) => {
  try {
    await resumeQueueItem(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete queue item
app.delete("/queue/:id", async (req, res) => {
  try {
    await Queue.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Clear completed items
app.post("/queue/clear", async (req, res) => {
  try {
    await Queue.deleteMany({ status: 'completed' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Scraper control
app.post("/scraper/start", async (req, res) => {
  if (!isRunning) {
    runScraper();
    res.json({ message: "Scraper Started", isRunning: true });
  } else {
    res.json({ message: "Scraper already running", isRunning: true });
  }
});

app.post("/scraper/stop", async (req, res) => {
  isRunning = false;
  res.json({ message: "Scraper Stopped", isRunning: false });
});

app.get("/scraper/status", (req, res) => {
  res.json({ isRunning });
});

// Keyword stats
app.get("/keyword-stats", async (req, res) => {
  const stats = await Channel.aggregate([
    {
      $group: {
        _id: "$keyword",
        channelsFound: { $sum: 1 },
        emailsFound: { 
          $sum: { 
            $cond: [{ $ne: ["$email", null] }, 1, 0] 
          } 
        },
        avgSubs: { $avg: "$subscribers" },
        totalSubs: { $sum: "$subscribers" }
      }
    },
    { $sort: { channelsFound: -1 } }
  ]);
  
  const queueStats = await Queue.find().sort({ createdAt: -1 });
  
  res.json({ keywordStats: stats, queue: queueStats });
});

// Existing endpoints
app.post("/start", async (req, res) => {
  try {
    const { keywords, country, minSubs, target } = req.body;
    
    // Handle both string and array formats
    const keywordList = Array.isArray(keywords) ? keywords : keywords.split(',').map(k => k.trim());
    
    for (const keyword of keywordList) {
      if (keyword) {
        await addToQueue(keyword, country, minSubs, target);
      }
    }

    resetQuotaTracking();
    
    if (!isRunning) {
      runScraper();
    }
    
    res.json({ 
      message: "Keywords added to queue",
      apiStatus: {
        totalKeys: API_KEYS.length,
        activeKeys: API_KEYS.length - quotaExceededKeys.size
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/channels", async (req, res) => {
  const { keyword } = req.query;
  const query = { email: { $ne: null } };
  if (keyword) query.keyword = keyword;
  
  const data = await Channel.find(query)
    .sort({ subscribers: -1 })
    .limit(10000);
  res.json(data);
});

app.get("/logs", async (req, res) => {
  const { keyword } = req.query;
  const query = {};
  if (keyword) query.keyword = keyword;
  
  const data = await Log.find(query)
    .sort({ createdAt: -1 })
    .limit(200);
  res.json(data);
});

app.get("/stats", async (req, res) => {
  try {
    const total = await Channel.countDocuments();
    const withEmail = await Channel.countDocuments({
      email: { $exists: true, $ne: null, $ne: "" }
    });
    const emailRate = total > 0 ? ((withEmail / total) * 100).toFixed(1) : 0;

    const topCountries = await Channel.aggregate([
      {
        $match: {
          country: { $exists: true, $ne: null, $ne: "" }
        }
      },
      {
        $group: {
          _id: "$country",
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const keywordBreakdown = await Channel.aggregate([
      {
        $group: {
          _id: "$keyword",
          count: { $sum: 1 },
          emails: { 
            $sum: { 
              $cond: [{ $ne: ["$email", null] }, 1, 0] 
            } 
          }
        }
      }
    ]);

    res.json({
      total,
      withEmail,
      emailRate,
      topCountries,
      keywordBreakdown
    });

  } catch (err) {
    console.error("Stats error:", err);
    res.status(500).json({ error: "Stats fetch failed" });
  }
});

app.get("/speed", async (req,res)=>{
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const count = await Channel.countDocuments({
    createdAt: { $gte: oneHourAgo }
  });
  res.json({ perHour: count });
});



const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔑 Loaded ${API_KEYS.length} API keys`);
  console.log(`📊 MongoDB Queue System Active`);
});

/* ================= AUTO LOOP ================= */

// Run immediately
setTimeout(() => {
  runScraper();
}, 5000);

// Then run on interval
setInterval(() => {
  runScraper();
}, INTERVAL);
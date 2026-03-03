import dotenv from "dotenv";
import mongoose from "mongoose";
import axios from "axios";
import express from "express";
import cors from "cors";

dotenv.config();

/* ================= CONFIG ================= */

let KEYWORDS = ["tech"];
let COUNTRY = "IN";
let MIN_SUBS = 50000;
let TARGET_PER_KEYWORD = 500;
let INTERVAL = 1000 * 60 * 30;
let isRunning = false;

/* ================= DB CONNECT ================= */

await mongoose.connect(process.env.MONGO_URI);
console.log("MongoDB Connected");

/* ================= MODELS ================= */

const channelSchema = new mongoose.Schema(
  {
    channelId: { type: String, unique: true, index: true },
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
  },
  { timestamps: true }
);

const Channel = mongoose.model("Channel", channelSchema);
const Log = mongoose.model("Log", logSchema);

/* ================= LOG FUNCTION ================= */

async function addLog(message) {
  console.log(message);
  await Log.create({ message });
}

/* ================= EMAIL EXTRACT ================= */

function extractEmail(text) {
  if (!text) return null;
  const match = text.match(
    /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi
  );
  return match ? match[0] : null;
}

/* ================= SCRAPER ================= */

async function fetchChannels(keyword) {
  await addLog(`Searching: ${keyword}`);

  let nextPageToken = null;
  let collected = 0;

  while (collected < TARGET_PER_KEYWORD) {
    const search = await axios.get(
      "https://www.googleapis.com/youtube/v3/search",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          q: keyword,
          type: "channel",
          part: "snippet",
          maxResults: 50,
          regionCode: COUNTRY,
          pageToken: nextPageToken,
        },
      }
    );

    const ids = search.data.items.map(i => i.snippet.channelId);
    if (!ids.length) break;

    const details = await axios.get(
      "https://www.googleapis.com/youtube/v3/channels",
      {
        params: {
          key: process.env.YOUTUBE_API_KEY,
          id: ids.join(","),
          part: "snippet,statistics",
        },
      }
    );

    for (const ch of details.data.items) {
      const subs = parseInt(ch.statistics.subscriberCount || 0);
      if (subs < MIN_SUBS) continue;

      const email = extractEmail(ch.snippet.description);
      if (!email) continue;

      await Channel.updateOne(
        { channelId: ch.id },
        {
          $set: {
            channelId: ch.id,
            title: ch.snippet.title,
            subscribers: subs,
            views: parseInt(ch.statistics.viewCount || 0),
            videos: parseInt(ch.statistics.videoCount || 0),
            country: ch.snippet.country,
            email,
          },
        },
        { upsert: true }
      );

      collected++;
      await addLog(`Saved: ${ch.snippet.title}`);

      if (collected >= TARGET_PER_KEYWORD) break;
    }

    nextPageToken = search.data.nextPageToken;
    if (!nextPageToken) break;
  }

  await addLog(`Finished ${keyword} → ${collected} collected`);
}

async function runScraper() {
  if (isRunning) return;
  isRunning = true;

  await addLog("Scraper Started");

  for (const keyword of KEYWORDS) {
    await fetchChannels(keyword);
  }

  await addLog("Scraper Completed");
  isRunning = false;
}

/* ================= EXPRESS ================= */

const app = express();
app.use(cors());
app.use(express.json());

app.post("/start", async (req, res) => {
  const { keywords, country, minSubs, target } = req.body;

  KEYWORDS = keywords || KEYWORDS;
  COUNTRY = country || COUNTRY;
  MIN_SUBS = minSubs || MIN_SUBS;
  TARGET_PER_KEYWORD = target || TARGET_PER_KEYWORD;

  runScraper();
  res.json({ message: "Scraper Triggered" });
});

app.get("/channels", async (req, res) => {
  const data = await Channel.find({ email: { $ne: null } })
    .sort({ subscribers: -1 });

  res.json(data);
});

app.get("/logs", async (req, res) => {
  const data = await Log.find().sort({ createdAt: -1 }).limit(200);
  res.json(data);
});

app.listen(5000, () => {
  console.log("Server running on 5000");
});

/* ================= AUTO LOOP ================= */

runScraper();

setInterval(() => {
  runScraper();
}, INTERVAL);
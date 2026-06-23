require("dotenv").config();

const { Telegraf } = require("telegraf");
const axios = require("axios");
const fs = require("fs");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// 📌 CONFIG
const MAX_REQUESTS = 2;
const USERS_FILE = "users.json";

// 🎨 styles
const styles = [
  "anime style, vibrant colors",
  "cyberpunk neon avatar, futuristic",
  "pixar style 3d character",
  "dark cinematic portrait",
  "oil painting, renaissance style",
  "glitch art, distorted aesthetic",
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 📂 FILE HELPERS
function loadUsers() {
  if (!fs.existsSync(USERS_FILE)) return {};
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(data) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

// 📅 get today's date string
function getToday() {
  return new Date().toISOString().split("T")[0];
}

// 🧠 get + reset logic
function getUserData(userId) {
  const users = loadUsers();
  const today = getToday();

  if (!users[userId]) {
    users[userId] = { count: 0, lastReset: today };
  }

  // 🔄 reset if new day
  if (users[userId].lastReset !== today) {
    users[userId].count = 0;
    users[userId].lastReset = today;
  }

  return { users, user: users[userId] };
}

// 📸 get telegram image
async function getImageUrl(ctx) {
  const photo = ctx.message.photo.pop();

  const file = await ctx.telegram.getFile(photo.file_id);

  const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;

  return url;
}

// 🚀 replicate call
async function generateAIImage(imageUrl, prompt) {
  const response = await axios.post(
    "https://api.replicate.com/v1/predictions",
    {
      version: "stability-ai/sdxl", // or proper version ID from Replicate
      input: {
        image: imageUrl,
        prompt: prompt,
        strength: 0.75,
      },
    },
    {
      headers: {
        Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    },
  );

  let prediction = response.data;

  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await new Promise((r) => setTimeout(r, 2000));

    const poll = await axios.get(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      {
        headers: {
          Authorization: `Token ${process.env.REPLICATE_API_TOKEN}`,
        },
      },
    );

    prediction = poll.data;
  }

  if (prediction.status === "failed") {
    throw new Error(prediction.error || "Generation failed");
  }

  return prediction.output[0];
}

// 👋 start
bot.start((ctx) => {
  ctx.reply("Send a photo — you get 2 AI generations per day 🎨");
});

// 📸 main handler
bot.on("photo", async (ctx) => {
  try {
    const userId = ctx.from.id.toString();

    const { users, user } = getUserData(userId);

    // 🚫 limit check
    if (user.count >= MAX_REQUESTS) {
      return ctx.reply(
        "You’ve used your 2 generations for today.\nCome back tomorrow 👀",
      );
    }

    // ✅ increment
    user.count += 1;
    saveUsers(users);

    await ctx.reply(`🎨 Generating (${user.count}/${MAX_REQUESTS})...`);

    const imageUrl = await getImageUrl(ctx);

    const style = rand(styles);
    const prompt = `High quality profile picture, ${style}, ultra detailed, 4k`;

    const aiImage = await generateAIImage(imageUrl, prompt);

    await ctx.replyWithPhoto(aiImage, {
      caption: ` Done (${user.count}/${MAX_REQUESTS})`,
    });
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Something went wrong.");
  }
});

// 🚀 launch
bot.launch();
console.log("Bot running with daily limits...");

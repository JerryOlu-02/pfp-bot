require("dotenv").config();

const { Telegraf } = require("telegraf");
const { createCanvas, loadImage } = require("@napi-rs/canvas");

const axios = require("axios");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

// Helper function to download an image from a URL as a Buffer
async function downloadImage(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return Buffer.from(response.data, "binary");
}

// Handle '/start' command
bot.start((ctx) => {
  ctx.reply(
    "Welcome! Send me any photo, and I will transform it into a custom profile picture for you.",
  );
});

// Handle incoming photos
bot.on("photo", async (ctx) => {
  try {
    await ctx.reply("Processing your custom PFP... Please wait.");

    const photoArray = ctx.message.photo;
    const highestResPhoto = photoArray[photoArray.length - 1];
    const fileId = highestResPhoto.file_id;
    const fileLink = await ctx.telegram.getFileLink(fileId);
    const imageBuffer = await downloadImage(fileLink.href);
    const baseImage = await loadImage(imageBuffer);

    const width = baseImage.width;
    const height = baseImage.height;
    const canvas = createCanvas(width, height);
    const ctxCanvas = canvas.getContext("2d");

    // Draw base image
    ctxCanvas.drawImage(baseImage, 0, 0, width, height);

    // --- DYNAMIC VARIATIONS START HERE ---

    // 1. Array of random badge text options
    const badgeTexts = [
      "VERIFIED",
      "PREMIUM USER",
      "GAMER",
      "CREATOR",
      "VIP MEMBER",
    ];
    const randomText =
      badgeTexts[Math.floor(Math.random() * badgeTexts.length)];

    // 2. Array of random theme colors (Hex codes)
    const colors = ["#4A90E2", "#E24A4A", "#4AE280", "#F5A623", "#BD10E0"];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // 3. Randomize the overlay style (50% chance for a ring border, 50% for corner badges)
    const styleChoice = Math.random() > 0.5 ? "ring" : "badge";

    if (styleChoice === "ring") {
      // Draw a random colored outer circle border
      ctxCanvas.strokeStyle = randomColor;
      ctxCanvas.lineWidth = Math.min(width, height) * 0.05;
      ctxCanvas.beginPath();
      ctxCanvas.arc(
        width / 2,
        height / 2,
        Math.min(width, height) / 2 - ctxCanvas.lineWidth / 2,
        0,
        Math.PI * 2,
      );
      ctxCanvas.stroke();
    } else {
      // Draw a solid dark bottom banner with random text
      ctxCanvas.fillStyle = "rgba(0, 0, 0, 0.7)";
      const bannerHeight = height * 0.12;
      ctxCanvas.fillRect(0, height - bannerHeight, width, bannerHeight);

      ctxCanvas.fillStyle = randomColor; // Text color matches the random theme
      ctxCanvas.font = `bold ${Math.floor(bannerHeight * 0.45)}px sans-serif`;
      ctxCanvas.textAlign = "center";
      ctxCanvas.textBaseline = "middle";
      ctxCanvas.fillText(randomText, width / 2, height - bannerHeight / 2);
    }

    // --- DYNAMIC VARIATIONS END HERE ---

    const finalPfpBuffer = canvas.toBuffer("image/png");
    await ctx.replyWithPhoto(
      { source: finalPfpBuffer },
      {
        caption: "✨ Your unique custom PFP variation is ready!",
      },
    );
  } catch (error) {
    console.error("Error processing image:", error);
    ctx.reply("Sorry, something went wrong while processing your image.");
  }
});

bot.launch();
console.log("PFP modification bot is running...");

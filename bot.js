require("dotenv").config();
const { Telegraf } = require("telegraf");
const { createCanvas, loadImage } = require("canvas");
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

    // 1. Get the highest quality version of the photo sent by the user
    const photoArray = ctx.message.photo;
    const highestResPhoto = photoArray[photoArray.length - 1];
    const fileId = highestResPhoto.file_id;

    // 2. Get the secure download link from Telegram
    const fileLink = await ctx.telegram.getFileLink(fileId);

    // 3. Download the user's image into a buffer
    const imageBuffer = await downloadImage(fileLink.href);

    // 4. Load the image buffer into the Canvas library
    const baseImage = await loadImage(imageBuffer);

    // 5. Create a canvas matching the base image dimensions
    const width = baseImage.width;
    const height = baseImage.height;
    const canvas = createCanvas(width, height);
    const ctxCanvas = canvas.getContext("2d");

    // 6. Draw the base image onto the canvas canvas
    ctxCanvas.drawImage(baseImage, 0, 0, width, height);

    // 7. Example modification: Add a visual PFP circular border overlay
    ctxCanvas.strokeStyle = "#4A90E2"; // Light blue border color
    ctxCanvas.lineWidth = Math.min(width, height) * 0.04; // Responsive border width (4% of size)
    ctxCanvas.beginPath();
    ctxCanvas.arc(
      width / 2,
      height / 2,
      Math.min(width, height) / 2 - ctxCanvas.lineWidth / 2,
      0,
      Math.PI * 2,
    );
    ctxCanvas.stroke();

    // 8. Example modification: Add watermark text at the bottom
    ctxCanvas.fillStyle = "rgba(0, 0, 0, 0.6)"; // Semi-transparent black banner
    const bannerHeight = height * 0.12;
    ctxCanvas.fillRect(0, height - bannerHeight, width, bannerHeight);

    ctxCanvas.fillStyle = "#ffffff"; // White text
    ctxCanvas.font = `bold ${Math.floor(bannerHeight * 0.5)}px sans-serif`;
    ctxCanvas.textAlign = "center";
    ctxCanvas.textBaseline = "middle";
    ctxCanvas.fillText("VERIFIED USER", width / 2, height - bannerHeight / 2);

    // 9. Convert final canvas to a buffer and send it back
    const finalPfpBuffer = canvas.toBuffer("image/png");
    await ctx.replyWithPhoto(
      { source: finalPfpBuffer },
      {
        caption: "✨ Here is your updated profile picture!",
      },
    );
  } catch (error) {
    console.error("Error processing image:", error);
    ctx.reply("Sorry, something went wrong while processing your image.");
  }
});

bot.launch();
console.log("PFP modification bot is running...");

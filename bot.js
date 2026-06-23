require("dotenv").config();

const { Telegraf } = require("telegraf");
const Replicate = require("replicate");

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// 🎨 styles
const styles = [
  "cyberpunk neon portrait",
  "anime style avatar",
  "cinematic dramatic lighting",
  "glitch art distorted aesthetic",
  "pixar 3d character",
];

// helper
const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];

// get telegram image URL
async function getImageUrl(ctx) {
  const photo = ctx.message.photo.pop();
  const file = await ctx.telegram.getFile(photo.file_id);

  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
}

// 🚀 REPLICATE USING SDK
async function generateAI(imageUrl) {
  const output = await replicate.run(
    "stability-ai/stable-diffusion-img2img:15a3689ee13b0d2616e98820eca31d4c3abcd36672df6afce5cb6feb1d66087d",
    {
      input: {
        image: imageUrl,
        num_inference_steps: "25",
      },
    },
  );

  return output[0].url();
}

// 👋 start
bot.start((ctx) => {
  ctx.reply("Send a photo and I’ll turn it into an AI avatar 🎨");
});

// 📸 handler
bot.on("photo", async (ctx) => {
  try {
    await ctx.reply("🎨 Generating AI avatar...");

    const imageUrl = await getImageUrl(ctx);

    // const prompt = `A high quality profile picture, ${rand(styles)}, ultra detailed, 4k`;

    const result = await generateAI(imageUrl);

    await ctx.replyWithPhoto(result, {
      caption: "✨ Your AI avatar is ready!",
    });
  } catch (err) {
    console.error(err);
    ctx.reply("❌ Failed to generate image.");
  }
});

bot.launch();
console.log("🤖 Bot running...");

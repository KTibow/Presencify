import canvasPkg from "canvas";
const { createCanvas, registerFont } = canvasPkg;
import chartPkg from "chart.js";
const { Chart } = chartPkg;
import { Client, Intents } from "discord.js";
import fs from "fs/promises";
const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_PRESENCES,
  ],
});
const fetchJson = async (path, fallback) => {
  try {
    const data = await fs.readFile(path);
    return JSON.parse(data);
  } catch (err) {
    return fallback;
  }
};
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  // 1. Log the message
  const messageTimes = await fetchJson("data/messageTimes.json", {});
  if (!messageTimes[message.author.id]) {
    messageTimes[message.author.id] = [];
  }
  messageTimes[message.author.id].push(message.createdAt.getTime());
  await fs.writeFile("data/messageTimes.json", JSON.stringify(messageTimes));
  return; // Presencify is in monitoring mode
  // 2. Respond if we should
  const userSettings = await fetchJson("data/userSettings.json", {});
  const authorSettings = userSettings[message.author.id] || {};
  const whenToReply = authorSettings.tellMeAboutOthers ?? -1;
  for (const [id, user] of message.mentions.users) {
    if (whenToReply == 0) continue;
    else if (whenToReply == 1 && message.mentions.repliedUser.id == user) continue;
    else if (userSettings[id]?.informOthersAboutMe === 0) continue;
    const userMessageTimes = messageTimes[id] || [];
    const userOffset = userSettings[id]?.timezone ?? 0;
    // Filter the times to the period
    const localDayOfWeek = (time) =>
      Math.floor(
        ((new Date(time).getTime() + userOffset * 60 * 60 * 1000) / (24 * 60 * 60 * 1000) + 4) % 7
      );
    const isWeekend = [0, 6].includes(localDayOfWeek(message.createdAt));
    const relevantTimes = userMessageTimes.filter(
      (time) => [0, 6].includes(localDayOfWeek(time)) == isWeekend
    );
    //if (relevantTimes.length < 480) continue; TODO: ADD THIS BEFORE PUSHING
    // See if they're usually offline
    const messagesByHour = {};
    for (const time of relevantTimes) {
      const hour = new Date(time).get;
      if (!messagesByHour[hour]) messagesByHour[hour] = 0;
      messagesByHour[hour]++;
    }
  }
});
const graphMessageTimes = async (messageTimes, title, offset) => {
  const hours = {};
  for (let i = 0; i < 24; i++) {
    hours[i] = 0;
  }
  for (const messageTime of messageTimes) {
    const hour = new Date(messageTime).getUTCHours() + offset;
    hours[hour]++;
  }
  // Print it out
  const graphSpace = createCanvas(1080, 1080);
  const bgPlugin = {
    id: "custom_canvas_background_color",
    beforeDraw: (chart) => {
      const ctx = chart.canvas.getContext("2d");
      ctx.save();
      ctx.globalCompositeOperation = "destination-over";
      ctx.fillStyle = "rgb(0, 0, 0)";
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    },
  };
  Chart.defaults.color = "white";
  Chart.defaults.font.family = "system-ui, Roboto, sans-serif";
  Chart.defaults.font.size = 22;
  const chart = new Chart(graphSpace, {
    type: "radar",
    data: {
      labels: Object.keys(hours),
      datasets: [
        {
          label: "Messages",
          data: Object.values(hours),
          backgroundColor: "rgba(79, 240, 227, 0.2)",
          borderColor: "rgba(79, 240, 227, 0.5)",
        },
      ],
    },
    options: {
      scales: {
        r: {
          ticks: { backdropColor: "rgba(0, 0, 0, 0.2)" },
          pointLabels: { font: Chart.defaults.font },
          angleLines: { color: "rgba(255, 255, 255, 0.2)" },
          grid: { color: "rgba(255, 255, 255, 0.2)" },
        },
      },
      plugins: {
        title: {
          display: true,
          text: title,
        },
      },
    },
    plugins: [bgPlugin],
  });
  const buffer = graphSpace.toBuffer("image/png");
  return buffer;
};
if (process.env.FONT_PATH) {
  registerFont(process.env.FONT_PATH, { family: "Roboto" });
}
console.log("loaded");
client.login();

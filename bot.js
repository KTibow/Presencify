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
Array.prototype.remove = function (value) {
  const index = this.indexOf(value);
  if (index == -1) throw new Error("Value not found");
  this.splice(index, 1);
};
let cooldowns = {};
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const optOut = await fetchJson("data/optOut.json", []);
  // Let people opt out of the bot
  if (message.content == "p.opt") {
    if (optOut.includes(message.author.id)) {
      optOut.remove(message.author.id);
      await message.reply("You have opted in to the bot.");
    } else {
      optOut.push(message.author.id);
      await message.reply(
        "You have opted out of the bot.\n" +
          "Please consider opting in again if you change your mind (just run the command again). " +
          "After all, Presencify is [open source](https://github.com/KTibow/Presencify) and it collects a relatively small amount of data."
      );
    }
    await fs.writeFile("data/optOut.json", JSON.stringify(optOut));
  }
  if (message.content == "opt-presencify") {
    message.reply("it's p.opt now");
  }
  if (optOut.includes(message.author.id)) return;
  const usersData = await fetchJson("data/users.json", {});
  if (!usersData[message.author.id]) {
    usersData[message.author.id] = { messageTimes: [] };
  }
  usersData[message.author.id].messageTimes.push(message.createdAt.getTime());
  if (message.content.startsWith("p.graph")) {
    const id = message.content.match(/[0-9]+/g)?.at(0) || message.author.id;
    await message.reply({
      files: [
        {
          attachment: await graphMessageTimes(
            client.users.cache.get(id) || { id, username: "somebody" },
            usersData[id]
          ),
          name: "messageTimes.png",
          contentType: "image/png",
        },
      ],
    });
  }
  if (message.content.startsWith("graph-presencify")) {
    await message.reply("it's p.graph now (plus you can specify a user id if you want)");
  }
  for (const [id, user] of message.mentions.users) {
    const userData = usersData[id];
    if (!userData) continue;
    if (cooldowns[id] + 60 * 1000 > Date.now()) continue;
    const totalMessageCount = userData.messageTimes.length;
    if (totalMessageCount < 24 * 16) continue;
    const currentHour = new Date().getUTCHours();
    const messageCountForHour = userData.messageTimes.filter(
      (t) => new Date(t).getUTCHours() == currentHour
    ).length;
    const minutesSinceLastMessage = Math.floor(
      (new Date() - new Date(userData.messageTimes.at(-1))) / 60000
    );
    if (messageCountForHour < totalMessageCount / 48) {
      await message.reply({
        content:
          `${user.username} usually doesn't talk in this hour. ` +
          `(${totalMessageCount} total messages, ${messageCountForHour} total for this hour, ${minutesSinceLastMessage} minutes since last message)`,
        files: [
          {
            attachment: await graphMessageTimes(user, userData),
            name: "messageTimes.png",
            contentType: "image/png",
          },
        ],
      });
      cooldowns[id] = Date.now();
    }
  }
  await fs.writeFile("data/users.json", JSON.stringify(usersData));
});
const calculateRespProb = (
  timesResponded,
  totalTimesResponded,
  timesNotResponded,
  totalTimesNotResponded
) => {
  return (
    timesResponded /
    totalTimesResponded /
    (timesResponded / totalTimesResponded + timesNotResponded / totalTimesNotResponded)
  );
};
const graphMessageTimes = async (user, userData) => {
  const hours = {};
  for (let i = 0; i < 24; i++) {
    hours[i] = 0;
  }
  for (const messageTime of userData.messageTimes) {
    const hour = new Date(messageTime).getUTCHours();
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
          backgroundColor: "rgba(255, 99, 132, 0.2)",
          borderColor: "rgba(255, 99, 132, 1)",
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
          text: `${user.username}'s messages/hour (UTC)`,
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

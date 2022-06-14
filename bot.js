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

  const usersData = await fetchJson("data/users.json", {});
  if (!usersData[message.author.id]) {
    usersData[message.author.id] = { messageTimes: [] };
  }
  usersData[message.author.id].messageTimes.push(message.createdAt.getTime());
  const isWeekend = [0, 6].includes(new Date().getUTCDay());
  if (message.content.startsWith("p.graph")) {
    const id = message.content.match(/[0-9]+/g)?.at(0) || message.author.id;
    await message.channel.sendTyping();
    await message.reply({
      content: "overall, weekends, weekdays",
      files: [
        {
          attachment: await graphMessageTimes(
            client.users.cache.get(id) || { id, username: "somebody" },
            usersData[id].messageTimes
          ),
          name: "messageTimes.png",
          contentType: "image/png",
        },
        {
          attachment: await graphMessageTimes(
            client.users.cache.get(id) || { id, username: "somebody" },
            usersData[id].messageTimes.filter((d) => [0, 6].includes(new Date(d).getUTCDay()))
          ),
          name: "messageTimesWeekends.png",
          contentType: "image/png",
        },
        {
          attachment: await graphMessageTimes(
            client.users.cache.get(id) || { id, username: "somebody" },
            usersData[id].messageTimes.filter((d) => ![0, 6].includes(new Date(d).getUTCDay()))
          ),
          name: "messageTimesWeekdays.png",
          contentType: "image/png",
        },
      ],
    });
  }
  if (message.content.startsWith("graph-presencify")) {
    await message.reply("it's p.graph now (plus you can specify a user id if you want)");
  }
  if (message.content == "opt-presencify") {
    await message.reply("it's p.opt now");
  }
  if (optOut.includes(message.author.id)) return;
  for (const [id, user] of message.mentions.users) {
    if (cooldowns[id] + 60 * 1000 > Date.now()) continue;
    if (optOut.includes(id)) continue;
    const userData = usersData[id];
    if (!userData) continue;
    const currentHour = new Date().getUTCHours();
    const relevantMessages = userData.messageTimes.filter(
      (t) => [0, 6].includes(new Date(t).getDay()) == isWeekend
    );
    if (relevantMessages.length < 48 * 4) continue;
    const messageCountForHour = relevantMessages.filter(
      (t) => new Date(t).getUTCHours() == currentHour
    ).length;
    if (messageCountForHour < relevantMessages.length / 48) {
      const minutesSinceLastMessage = Math.floor(
        (new Date() - new Date(userData.messageTimes.at(-1))) / 60000
      );
      await message.reply({
        content:
          user.username +
          " usually doesn't talk in this hour on " +
          (isWeekend ? "weekends" : "weekdays") +
          ". (" +
          relevantMessages.length +
          " total messages on " +
          (isWeekend ? "weekends" : "weekdays") +
          ", " +
          messageCountForHour +
          " in this hour, " +
          minutesSinceLastMessage +
          " minutes since last message)",
        files: [
          {
            attachment: await graphMessageTimes(user, relevantMessages),
            name: "messageTimes.png",
            contentType: "image/png",
          },
        ],
        allowedMentions: {
          repliedUser: false,
        },
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
const graphMessageTimes = async (user, messageTimes) => {
  const hours = {};
  for (let i = 0; i < 24; i++) {
    hours[i] = 0;
  }
  for (const messageTime of messageTimes) {
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

import { Client, Intents, PresenceManager } from "discord.js";
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

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  const optOut = await fetchJson("data/optOut.json", []);
  // Let people opt out of the bot
  if (message.content == "opt-presencify") {
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
  if (optOut.includes(message.author.id)) return;
  const usersData = await fetchJson("data/users.json", {});
  if (!usersData[message.author.id]) {
    usersData[message.author.id] = { messageTimes: [] };
  }
  usersData[message.author.id].messageTimes.push(message.createdAt.getTime());

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
const calculateIfLikelyOnline = async (user) => {
  // TODO
};
console.log("loaded");
client.login();

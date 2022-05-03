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
  // Update anything currently tracking
  const currentlyTracking = await fetchJson("data/tracking.json", []);
  const usersData = await fetchJson("data/users.json", {});
  currentlyTracking.forEach((trackData) => {
    if (trackData.id == message.author.id) {
      const currentUserData = usersData[trackData.id] || [];
      if (Date.now() - trackData.startedAt > 10 * 60 * 1000) {
        currentUserData.push({
          userData: trackData.userData,
          responded: false,
        });
      } else {
        currentUserData.push({
          userData: trackData.userData,
          responded: true,
        });
      }
      currentlyTracking.remove(trackData);
      usersData[trackData.id] = currentUserData;
    }
  });
  // Record for any new mentions
  const lastMessages = await fetchJson("data/lastMessages.json", {});
  const mentions = Array.from(message.mentions.users.values());
  if (message.mentions.repliedUser) {
    mentions.push(message.mentions.repliedUser);
  }
  mentions.forEach((mention) => {
    if (optOut.includes(mention.id)) return;
    // Check if the user is already being tracked
    if (currentlyTracking.find((trackData) => trackData.id == mention.id)) return;
    // Fetch info about the mentioned user
    const guildMemberMentioned = client.guilds.cache
      .get(message.guild.id)
      .members.cache.get(mention.id);
    const userData = {
      presence: guildMemberMentioned.presence.status,
      sinceLastMessage:
        lastMessages[mention.id] && new Date() - lastMessages[mention.id],
      utcHour: new Date().getUTCHours(),
      utcDay: new Date().getUTCDay(),
    };
    // Add the user to the tracking list
    currentlyTracking.push({
      id: mention.id,
      userData,
      startedAt: Date.now(),
    });
  });
  // Record the last message sent by the user
  lastMessages[message.author.id] = Date.now();

  await fs.writeFile("data/users.json", JSON.stringify(usersData));
  await fs.writeFile("data/tracking.json", JSON.stringify(currentlyTracking));
  await fs.writeFile("data/lastMessages.json", JSON.stringify(lastMessages));
  await fs.writeFile("data/optOut.json", JSON.stringify(optOut));
});
/*const calculateIfLikelyOnline = async (user) => {
  const userDataList = await fetchJson("data/users.json", {});
  const userData = userDataList.find((user) => user.id == user.id);
  if (!user) return;
};*/
console.log("loaded");
client.login();

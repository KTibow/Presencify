import { Client, Intents, PresenceManager } from "discord.js";
import fs from "fs/promises";
import tokens from "./config.json" assert { type: "json" };
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
    // Check if the user is already being tracked
    if (currentlyTracking.find((trackData) => trackData.id == mention.id)) return;
    // Fetch info about the mentioned user
    const guildMemberMentioned = client.guilds.cache
      .get(message.guild.id)
      .members.cache.get(mention.id);
    const userData = {
      presence: guildMemberMentioned.presence.status,
      lastMessage: lastMessages[mention.id] || -1,
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
});
/*const calculateIfLikelyOnline = async (user) => {
  const userDataList = await fetchJson("data/users.json", {});
  const userData = userDataList.find((user) => user.id == user.id);
  if (!user) return;
};*/
console.log("loaded");
client.login(tokens.botToken);

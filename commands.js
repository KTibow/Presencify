import { Client } from "discord.js";
import "dotenv/config";
const client = new Client({
  intents: ["GUILDS"],
});
client.login(process.env.BOT_TOKEN);
client.once("ready", async () => {
  /** @type {Guild} */
  const guild = client.api.applications(client.user.id).guilds("962319226377474078");
  /*await guild.commands().post({
    data: {
      name: "settings",
      description:
        "Opt in/out of having Presencify tell others when you're offline and letting you know about others.",
      options: [
        {
          type: 4,
          name: "tell_me_about_others",
          description: "Know when others you ping are likely offline.",
          choices: [
            { name: "Yes", value: 2 },
            { name: "Mentions, not replies", value: 1 },
            { name: "No", value: 0 },
          ],
        },
        {
          type: 4,
          name: "inform_others_about_me",
          description: "Tell others when you're likely offline.",
          choices: [
            { name: "Yes", value: 1 },
            { name: "No", value: 0 },
          ],
        },
        {
          type: 4,
          name: "timezone",
          description: "The timezone you're in, as the distance from UTC.",
          choices: [
            { name: "UTC", value: 0 },
            { name: "UTC+1", value: 1 },
            { name: "UTC+2", value: 2 },
            { name: "UTC+3", value: 3 },
            { name: "UTC+4", value: 4 },
            { name: "UTC+5", value: 5 },
            { name: "UTC+6", value: 6 },
            { name: "UTC+7", value: 7 },
            { name: "UTC+8", value: 8 },
            { name: "UTC+9", value: 9 },
            { name: "UTC+10", value: 10 },
            { name: "UTC+11", value: 11 },
            { name: "UTC+12", value: 12 },
            { name: "UTC-1", value: -1 },
            { name: "UTC-2", value: -2 },
            { name: "UTC-3", value: -3 },
            { name: "UTC-4", value: -4 },
            { name: "UTC-5", value: -5 },
            { name: "UTC-6", value: -6 },
            { name: "UTC-7", value: -7 },
            { name: "UTC-8", value: -8 },
            { name: "UTC-9", value: -9 },
            { name: "UTC-10", value: -10 },
            { name: "UTC-11", value: -11 },
            { name: "UTC-12", value: -12 },
          ],
        },
      ],
    },
  });*/
  /*await guild.commands().post({
    data: {
      name: "graph",
      description: "View a graph of when people are online.",
      options: [
        {
          type: 6,
          name: "user",
          description: "The user to view the graph for.",
          required: true,
        },
        {
          type: 4,
          name: "days_filter",
          description: "Whether to show data from all time, weekdays, or weekends.",
          choices: [
            { name: "All time", value: 0 },
            { name: "Weekdays", value: 1 },
            { name: "Weekends", value: 2 },
          ],
          default: 0,
          required: true,
        },
      ],
    },
  });*/
});

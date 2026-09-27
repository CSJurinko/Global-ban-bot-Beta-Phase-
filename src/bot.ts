import {
  Client,
  Events,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";
import { config } from "./config.js";

const apiUrl = process.env.API_URL ?? "http://127.0.0.1:3000";
const commands = [
  new SlashCommandBuilder()
    .setName("globalban")
    .setDescription("Ban a Discord user across connected guilds and FiveM servers")
    .addUserOption(option => option.setName("user").setDescription("User to ban").setRequired(true))
    .addStringOption(option => option.setName("reason").setDescription("Reason for the ban").setMaxLength(500).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  new SlashCommandBuilder()
    .setName("globalunban")
    .setDescription("Remove a global ban and unban the user in connected guilds")
    .addStringOption(option => option.setName("user_id").setDescription("Discord user ID").setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
].map(command => command.toJSON());

async function apiRequest(path: string, method: string, body?: object): Promise<Response> {
  return fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.botApiToken}`,
      ...(body ? { "Content-Type": "application/json" } : {})
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
}

export async function startBot(): Promise<void> {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });
  const rest = new REST({ version: "10" }).setToken(config.botToken);

  client.once(Events.ClientReady, readyClient => {
    console.log(`Discord bot ready as ${readyClient.user.tag}`);
  });

  client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand() || !interaction.inGuild()) return;
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({ content: "You need the Ban Members permission to use this command.", ephemeral: true });
      return;
    }

    if (interaction.commandName === "globalban") {
      const user = interaction.options.getUser("user", true);
      const reason = interaction.options.getString("reason", true);
      if (user.id === interaction.user.id || user.bot) {
        await interaction.reply({ content: "That account cannot be globally banned with this command.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const result = await apiRequest("/v1/bans", "POST", {
          discordId: user.id,
          reason,
          actorId: interaction.user.id
        });
        if (!result.ok) throw new Error(`Ban service returned ${result.status}`);

        const outcomes = await Promise.allSettled(client.guilds.cache.map(guild =>
          guild.members.ban(user.id, { reason: `Global ban by ${interaction.user.tag}: ${reason}` })
        ));
        const banned = outcomes.filter(outcome => outcome.status === "fulfilled").length;
        const failed = outcomes.length - banned;
        await interaction.editReply(
          `Global ban recorded. Discord bans applied in ${banned}/${outcomes.length} connected guilds${failed ? `; ${failed} failed due to permissions or API errors` : ""}.`
        );
      } catch (error) {
        console.error("Global ban failed:", error);
        await interaction.editReply("The global ban could not be completed. Check the bot and ban service logs.");
      }
      return;
    }

    if (interaction.commandName === "globalunban") {
      const discordId = interaction.options.getString("user_id", true).trim();
      if (!/^\d{17,20}$/.test(discordId)) {
        await interaction.reply({ content: "Enter a valid Discord user ID.", ephemeral: true });
        return;
      }

      await interaction.deferReply({ ephemeral: true });
      try {
        const result = await apiRequest(`/v1/bans/${discordId}`, "DELETE");
        if (!result.ok) throw new Error(`Ban service returned ${result.status}`);

        const outcomes = await Promise.allSettled(client.guilds.cache.map(guild => guild.members.unban(discordId)));
        const unbanned = outcomes.filter(outcome => outcome.status === "fulfilled").length;
        await interaction.editReply(
          `Global ban removed. Discord unbans applied in ${unbanned}/${outcomes.length} connected guilds.`
        );
      } catch (error) {
        console.error("Global unban failed:", error);
        await interaction.editReply("The global unban could not be completed. Check the bot and ban service logs.");
      }
    }
  });

  await rest.put(Routes.applicationCommands(config.botClientId), { body: commands });
  await client.login(config.botToken);
}
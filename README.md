# FiveM Global Ban

A shared ban list for FiveM servers and Discord guilds. The TypeScript service stores bans in SQLite, the Discord bot applies them in guilds where it is installed and has Ban Members permission, and the FiveM resource checks players when they connect.

Discord does not provide a way to ban a person from arbitrary servers. A guild must invite this bot, grant it Ban Members permission, and place its role above the roles it needs to moderate. Every FiveM server must run this resource and use the same API.

## Requirements

- Node.js 20 or newer
- A Discord application and bot token
- FiveM server with the Discord identifier available for players

## Setup

1. Copy `.env.example` to `.env`, set the Discord bot token and application ID, and replace both API tokens with separate, long random secrets.
2. Install dependencies and build:

   ```sh
   npm install
   npm run build
   ```

3. Invite the bot to each participating guild with the `bot` and `applications.commands` scopes and the Ban Members permission. Start the service with `npm start` (or use `npm run dev` while developing). also incase you are slow if you have a bot server you DO NOT have to run the command everytime. (if you dont know that maybe dont own a server).
4. Add `ensure globalban` (or whatever you name the file) to the FiveM server configuration and set:

   ```cfg
   setr globalban_api_url "http://YOUR_API_HOST:3000"
   set globalban_api_key "same-value-as-FIVEM_API_TOKEN"
   ```

   Keep the API token private and use HTTPS when the API is reachable over an untrusted network. Do not expose the SQLite file or API credentials.

## Commands

- `/globalban user reason` records a shared ban, attempts Discord bans in every guild the bot is currently connected to, and blocks matching Discord identifiers from configured FiveM servers.
- `/globalunban user_id` removes the shared ban and attempts to unban the user in every connected guild.

Both commands require Discord's Ban Members permission. Discord guild failures are reported in the command response and do not erase the shared game ban. The FiveM integration currently fails open if the API is unavailable, if a player has no Discord identifier, or if the check response is invalid; monitor service availability accordingly.

## Network

The API listens on `0.0.0.0` at port `3000` by default. Restrict access with a firewall/reverse proxy; `/health` is public, while ban-management and ban-check routes require their separate bearer tokens.
import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  databasePath: process.env.DATABASE_PATH ?? "./data/bans.sqlite",
  botToken: required("BOT_TOKEN"),
  botClientId: required("BOT_CLIENT_ID"),
  botApiToken: required("BOT_API_TOKEN"),
  fivemApiToken: required("FIVEM_API_TOKEN")
};
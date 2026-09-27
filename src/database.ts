import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { config } from "./config.js";

mkdirSync(dirname(config.databasePath), { recursive: true });

export const database = new Database(config.databasePath);
database.pragma("journal_mode = WAL");
database.exec(`
  CREATE TABLE IF NOT EXISTS bans (
    discord_id TEXT PRIMARY KEY,
    reason TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

export type Ban = {
  discordId: string;
  reason: string;
  actorId: string;
  createdAt: string;
};

type BanRow = {
  discord_id: string;
  reason: string;
  actor_id: string;
  created_at: string;
};

function toBan(row: BanRow): Ban {
  return {
    discordId: row.discord_id,
    reason: row.reason,
    actorId: row.actor_id,
    createdAt: row.created_at
  };
}

export function createBan(discordId: string, reason: string, actorId: string): Ban {
  database.prepare(`
    INSERT INTO bans (discord_id, reason, actor_id)
    VALUES (?, ?, ?)
    ON CONFLICT(discord_id) DO UPDATE SET
      reason = excluded.reason,
      actor_id = excluded.actor_id,
      created_at = datetime('now')
  `).run(discordId, reason, actorId);

  return getBan(discordId)!;
}

export function getBan(discordId: string): Ban | undefined {
  const row = database.prepare("SELECT * FROM bans WHERE discord_id = ?")
    .get(discordId) as BanRow | undefined;
  return row ? toBan(row) : undefined;
}

export function removeBan(discordId: string): boolean {
  return database.prepare("DELETE FROM bans WHERE discord_id = ?")
    .run(discordId).changes > 0;
}
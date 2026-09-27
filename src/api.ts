import express from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "./config.js";
import { createBan, getBan, removeBan } from "./database.js";

export const app = express();
app.use(express.json({ limit: "16kb" }));

function hasToken(expected: string, actual: string | undefined): boolean {
  if (!actual) return false;
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}

function authorize(expected: string): express.RequestHandler {
  return (request, response, next) => {
    if (!hasToken(expected, request.header("authorization")?.replace(/^Bearer\s+/i, ""))) {
      response.status(401).json({ error: "Unauthorized" });
      return;
    }
    next();
  };
}

app.get("/health", (_request, response) => response.json({ ok: true }));

app.post("/v1/bans", authorize(config.botApiToken), (request, response) => {
  const { discordId, reason, actorId } = request.body ?? {};
  if (!/^\d{17,20}$/.test(discordId ?? "") || typeof reason !== "string" ||
      !reason.trim() || reason.length > 500 || !/^\d{17,20}$/.test(actorId ?? "")) {
    response.status(400).json({ error: "A valid Discord user, actor, and reason are required" });
    return;
  }

  response.status(201).json(createBan(discordId, reason.trim(), actorId));
});

app.delete("/v1/bans/:discordId", authorize(config.botApiToken), (request, response) => {
  const discordId = request.params.discordId;
  if (typeof discordId !== "string" || !/^\d{17,20}$/.test(discordId)) {
    response.status(400).json({ error: "Invalid Discord user ID" });
    return;
  }

  response.json({ removed: removeBan(discordId) });
});

app.post("/v1/bans/check", authorize(config.fivemApiToken), (request, response) => {
  const { discordId } = request.body ?? {};
  if (!/^\d{17,20}$/.test(discordId ?? "")) {
    response.status(400).json({ error: "Invalid Discord user ID" });
    return;
  }

  const ban = getBan(discordId);
  response.json(ban ? { banned: true, reason: ban.reason } : { banned: false });
});
import { app } from "./api.js";
import { config } from "./config.js";
import { startBot } from "./bot.js";

app.listen(config.port, "0.0.0.0", () => {
  console.log(`Ban API listening on port ${config.port}`);
});

startBot().catch(error => {
  console.error("Discord bot failed to start:", error);
  process.exitCode = 1;
});
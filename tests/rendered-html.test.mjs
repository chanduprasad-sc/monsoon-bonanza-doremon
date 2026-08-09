import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the Doremon Jump campaign", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Doremon Jump<\/title>/i);
  assert.match(html, /MONSOON BONANZA/);
  assert.match(html, /DOREMON JUMP/);
  assert.match(html, /PLAY NOW/);
  assert.match(html, /ELIGIBLE BASKETS/);
  assert.doesNotMatch(html, />SMC<|>HDFC</i);
});

test("includes progression, mission, gadget and result systems", async () => {
  const [game, styles, netlifyForm] = await Promise.all([
    readFile(new URL("../app/MonsoonGame.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../static/index.html", import.meta.url), "utf8"),
  ]);

  assert.match(game, /nextBossScore:\s*50000/);
  assert.match(game, /BASKET MAGNET/);
  assert.match(game, /RESCUE CLOUD/);
  assert.match(game, /BOSS INCOMING/);
  assert.match(game, /doremon-jump-achievements/);
  assert.match(game, /const doremonColors/);
  assert.match(game, /lastHudUpdate/);
  assert.match(game, /multiplier === 5 \? 0 : multiplier/);
  assert.match(game, /platform\.magnetX/);
  assert.match(game, /GADGET_VISUALS/);
  assert.match(game, /game\.worldStage = targetWorldStage/);
  assert.match(game, /if \(colorPhase === 0\)/);
  assert.doesNotMatch(game, /nextWorldChangeAt/);
  assert.doesNotMatch(game, /shieldCharges|powerUp === "shield"/);
  assert.match(game, /Tilt calibrated/);
  assert.match(styles, /\.mission-panel/);
  assert.match(styles, /\.celebration-toast/);
  assert.match(netlifyForm, /name="bestCombo"/);
  assert.match(netlifyForm, /name="missionsCompleted"/);
  assert.match(netlifyForm, /name="achievementsUnlocked"/);
});

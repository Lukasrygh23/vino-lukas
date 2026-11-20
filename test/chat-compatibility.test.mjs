import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const state = {
  restricted: true,
  queue: { onscreen: [], leftScreen: {}, rightScreen: {} },
  settings: {
    get: async (key) => key === "restrictVinoToSameScene" && state.restricted,
    synchronousGetDisplayableDefaultMoods: () => ["happy"],
  },
  logger: { log() {}, logObject() {} },
};
globalThis.vinoChatTest = state;
globalThis.game = { version: "13.351", user: { viewedScene: "scene-a" } };
globalThis.foundry = {
  utils: {
    setProperty(object, path, value) {
      const keys = path.split(".");
      const last = keys.pop();
      for (const key of keys) object = object[key] ??= {};
      object[last] = value;
    },
  },
};

async function loadWithMocks(path) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  const mocks = {
    "./gsap.mjs": "export const gsap = {};",
    "./Settings.mjs": "export default globalThis.vinoChatTest.settings;",
    "./Logger.mjs": "export default globalThis.vinoChatTest.logger;",
    "./QueueHandler.mjs": "export default globalThis.vinoChatTest.queue;",
    "./ChatHandler.mjs": "export default {};",
  };
  for (const [module, mock] of Object.entries(mocks)) {
    source = source.replaceAll(`"${module}"`, JSON.stringify(`data:text/javascript,${encodeURIComponent(mock)}`));
  }
  return import(`data:text/javascript,${encodeURIComponent(source)}`);
}

const { default: LayoutDrawer } = await loadWithMocks("../scripts/LayoutDrawer.mjs");
const { default: ChatHandler } = await loadWithMocks("../scripts/ChatHandler.mjs");
const reachedRendering = new Error("reached rendering");
globalThis.$ = () => ({ append() { throw reachedRendering; } });

for (const generation of [11, 12, 13]) {
  test(`V${generation} scene restriction uses the message author and preserves filtering`, async () => {
    game.version = `${generation}.1`;
    state.restricted = true;
    const user = { viewedScene: "scene-b" };
    const message = generation === 11
      ? { user, get author() { throw new Error("V11 author accessed"); } }
      : { author: user, get user() { throw new Error("deprecated user accessed"); } };
    const data = { name: "Speaker", message };
    state.queue.onscreen = [];
    state.queue.leftScreen = {};

    await LayoutDrawer.addSpeakingActor(data);
    assert.deepEqual(state.queue.onscreen, []);

    user.viewedScene = "scene-a";
    await assert.rejects(LayoutDrawer.addSpeakingActor(data), reachedRendering);
    assert.deepEqual(state.queue.onscreen, ["Speaker"]);
  });
}

test("disabled scene restriction does not inspect the message author", async () => {
  game.version = "13.351";
  state.restricted = false;
  state.queue.onscreen = [];
  state.queue.leftScreen = {};
  const message = { get author() { throw new Error("author unexpectedly accessed"); } };
  await assert.rejects(LayoutDrawer.addSpeakingActor({ name: "Speaker", message }), reachedRendering);
});

test("mood command uses the namespaced helper and retains other flags", () => {
  game.version = "13.351";
  Object.defineProperty(globalThis, "setProperty", {
    configurable: true,
    get() { throw new Error("deprecated global setProperty accessed"); },
  });
  let created;
  globalThis.ChatMessage = { create: (data) => { created = structuredClone(data); } };
  const data = { flags: { other: { retained: true }, vino: { other: "value" } } };

  assert.equal(ChatHandler.handleChatMessage(null, "/happy Hello!", data), false);
  assert.deepEqual(created, {
    content: "Hello!",
    style: 2,
    flags: { other: { retained: true }, vino: { other: "value", mood: "happy" } },
  });
});

test("mood image lookup falls back when no images or path are configured", () => {
  const actor = { flags: {}, img: "portrait.webp" };
  assert.equal(ChatHandler._getMoodImage(actor, "happy"), "portrait.webp");
  actor.flags.vino = { images: null, altdefault: "alternate.webp" };
  assert.equal(ChatHandler._getMoodImage(actor, "happy"), "alternate.webp");
  actor.flags.vino.images = [{ name: "Happy" }];
  assert.equal(ChatHandler._getMoodImage(actor, "happy"), "alternate.webp");
  actor.flags.vino.images[0].path = "happy.webp";
  assert.equal(ChatHandler._getMoodImage(actor, "HAPPY"), "happy.webp");
});

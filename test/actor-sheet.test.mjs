import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const hooks = new Map();
globalThis.Hooks = {
  on: (name, callback) => hooks.set(name, callback),
  once() {},
};
globalThis.vinoSheetTest = { opened: [] };
const mocks = {
  "./scripts/gsap.mjs": "export const gsap = {}, ScrollToPlugin = {}, TextPlugin = {};",
  "./apps/VNOverlay.mjs": "export default class {};",
  "./apps/ActorConfiguration.mjs": `
    export default class {
      constructor(actor) { this.actor = actor; }
      render(force) { globalThis.vinoSheetTest.opened.push({actor: this.actor, force}); }
    }`,
  "./scripts/Settings.mjs": "export default {};",
  "./scripts/ChatHandler.mjs": "export default {};",
  "./scripts/LayoutDrawer.mjs": "export default {};",
  "./scripts/QueueHandler.mjs": "export default {};",
  "./scripts/Logger.mjs": "export default {};",
};
let source = await readFile(new URL("../module.js", import.meta.url), "utf8");
for (const [module, mock] of Object.entries(mocks)) {
  source = source.replaceAll(`"${module}"`, JSON.stringify(`data:text/javascript,${encodeURIComponent(mock)}`));
}
await import(`data:text/javascript,${encodeURIComponent(source)}`);

for (const [hook, handler] of [
  ["getActorSheetHeaderButtons", "onclick"],
  ["getHeaderControlsActorSheetV2", "onClick"],
]) {
  test(`${hook} opens the configuration for the sheet actor`, () => {
    const actor = { name: "Test actor" };
    const controls = [];
    hooks.get(hook)({ actor }, controls);

    assert.equal(controls.length, 1);
    assert.equal(controls[0].label, "ViNo");
    controls[0][handler]();
    assert.deepEqual(vinoSheetTest.opened.pop(), { actor, force: true });
  });
}

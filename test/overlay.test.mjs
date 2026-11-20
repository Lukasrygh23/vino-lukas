import assert from "node:assert/strict";
import { test } from "node:test";

class LegacyApplication {
  static get defaultOptions() {
    return { legacy: true };
  }

  render(force) {
    this.force = force;
    return this;
  }
}

class ApplicationV2 {
  render(force) {
    this.force = force;
    return Promise.resolve(this);
  }
}

const mergeObject = (base, options) => ({ ...base, ...options });

test("V13 overlay uses the frameless V2 application without accessing V1", async () => {
  globalThis.game = { view: "game" };
  globalThis.ui = {};
  globalThis.foundry = {
    utils: { mergeObject },
    appv1: { api: { Application: LegacyApplication } },
    applications: { api: { ApplicationV2, HandlebarsApplicationMixin: (base) => class extends base {} } },
  };
  Object.defineProperty(globalThis, "Application", {
    configurable: true,
    get() { throw new Error("V1 Application was accessed"); },
  });

  const { default: VNOverlay } = await import("../apps/VNOverlay.mjs?v13");
  VNOverlay.init();

  assert.ok(ui.vinoOverlay instanceof ApplicationV2);
  assert.equal(ui.vinoOverlay.force, true);
  assert.equal(VNOverlay.DEFAULT_OPTIONS.id, "vino-overlay");
  assert.deepEqual(VNOverlay.DEFAULT_OPTIONS.window, { frame: false, positioned: false });
  assert.deepEqual(VNOverlay.PARTS.overlay, {
    template: "modules/vino/templates/vino-frame.html",
    root: true,
  });
});

for (const generation of [11, 12]) {
  test(`V${generation} overlay retains the legacy non-popout application`, async () => {
    globalThis.game = { view: "game" };
    globalThis.ui = {};
    globalThis.foundry = { utils: { mergeObject } };
    Object.defineProperty(globalThis, "Application", {
      configurable: true,
      value: LegacyApplication,
    });

    const { default: VNOverlay } = await import(`../apps/VNOverlay.mjs?v${generation}`);
    VNOverlay.init();

    assert.ok(ui.vinoOverlay instanceof LegacyApplication);
    assert.equal(ui.vinoOverlay.force, true);
    assert.deepEqual(VNOverlay.defaultOptions, {
      legacy: true,
      id: "vino-overlay",
      template: "modules/vino/templates/vino-frame.html",
      popOut: false,
    });
  });
}

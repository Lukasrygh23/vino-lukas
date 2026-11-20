import assert from "node:assert/strict";
import { test } from "node:test";

class LegacyFormApplication {
  static get defaultOptions() {
    return {};
  }
}

class ApplicationV2 {
  async _preClose() {}
}

class FormDataExtended {
  constructor(form) {
    this.object = { ...form.data };
  }
}

let picker;
class V2Picker {
  constructor(options) {
    this.options = options;
    picker = this;
  }

  async browse(target) {
    this.target = target;
  }
}

globalThis.game = { view: "game" };
globalThis.ui = { notifications: { error() {} } };
globalThis.foundry = {
  utils: {
    mergeObject: (base, options) => ({ ...base, ...options }),
    getProperty: (object, path) => path.split(".").reduce((value, key) => value?.[key], object),
  },
  appv1: { api: { Application: LegacyFormApplication } },
  applications: {
    api: { ApplicationV2, HandlebarsApplicationMixin: (base) => class extends base {} },
    apps: { FilePicker: { implementation: V2Picker } },
    ux: { FormDataExtended },
  },
};
Object.defineProperty(globalThis, "FormApplication", {
  configurable: true,
  get() { throw new Error("V1 FormApplication was accessed on V13"); },
});
Object.defineProperty(globalThis, "FilePicker", {
  configurable: true,
  get() { throw new Error("V1 FilePicker was accessed on V13"); },
});

const { default: ActorConfiguration } = await import("../apps/ActorConfiguration.mjs?v13");
const { default: SettingsForm } = await import("../scripts/SettingsForm.mjs?v13");
const { default: Settings } = await import("../scripts/Settings.mjs");

test("V13 actor form saves submitted fields and closes only once", async () => {
  const updates = [];
  const actor = { update: async (data) => updates.push(data) };
  const app = new ActorConfiguration(actor);
  Settings.getDisplayableDefaultMoods = async () => ["Happy"];
  const data = { "flags.vino.enabled": false, "flags.vino.images.0.path": "happy.webp" };

  await ActorConfiguration.DEFAULT_OPTIONS.form.handler.call(app, {}, {}, { object: data });

  assert.ok(app instanceof ApplicationV2);
  assert.deepEqual(updates, [{
    "flags.vino.enabled": false,
    "flags.vino.images.0.path": "happy.webp",
    "flags.vino.images.0.name": "happy",
  }]);

  let submissions = 0;
  app.form = {};
  app.submit = async () => { submissions++; };
  await app._preClose({ submitted: true });
  assert.equal(submissions, 0);
  await app._preClose({});
  assert.equal(submissions, 1);
});

test("closing the actor form reports a failed save and does not proceed", async () => {
  const app = new ActorConfiguration({});
  const failure = new Error("save failed");
  let reported;
  app.form = {};
  app.submit = async () => { throw failure; };
  ui.notifications.error = (error) => { reported = error; };

  await assert.rejects(app._preClose({}), failure);
  assert.equal(reported, failure);
});

test("V13 image picker saves the selected image without closing the form", async () => {
  const app = new ActorConfiguration({ flags: { vino: { altdefault: "old.webp" } } });
  app.position = { top: 10, left: 20 };
  let submissions = 0;
  app.submit = async () => { submissions++; };
  const image = { dataset: { edit: "flags.vino.altdefault" }, src: "old.webp" };

  app._onEditImage({ currentTarget: image });
  assert.equal(picker.target, "old.webp");
  assert.deepEqual(picker.options.position, { top: 50, left: 30 });
  picker.options.callback("new.webp");
  assert.equal(image.src, "new.webp");
  assert.equal(submissions, 1);
});

test("mood add and delete persist unsaved edits and select the correct row", async () => {
  const app = new SettingsForm();
  const writes = [];
  let refreshes = 0;
  let renders = 0;
  Settings.set = async (key, moods) => { writes.push([key, moods]); };
  Settings._scheduleRefresh = () => { refreshes++; };
  app.render = async () => { renders++; };
  app.form = { data: { defaultmood1: "edited", defaultmood2: "sad" }, querySelectorAll: () => [] };

  await app._changeMoods();
  app.form.data = { defaultmood1: "edited", defaultmood2: "sad", defaultmood3: "blank" };
  await app._changeMoods(1);

  assert.ok(app instanceof ApplicationV2);
  assert.deepEqual(writes, [
    ["defaultMoods", ["edited", "sad", "blank"]],
    ["defaultMoods", ["edited", "blank"]],
  ]);
  assert.equal(refreshes, 2);
  assert.equal(renders, 2);
});

test("mood write failure restores controls without refreshing", async () => {
  const app = new SettingsForm();
  const failure = new Error("setting write failed");
  const control = { disabled: false };
  app.form = { data: { defaultmood1: "edited" }, querySelectorAll: () => [control] };
  Settings.set = async () => { throw failure; };
  Settings._scheduleRefresh = () => { throw new Error("unexpected refresh"); };
  app.render = async () => { throw new Error("unexpected render"); };

  await assert.rejects(app._changeMoods(), failure);
  assert.equal(control.disabled, false);
});

for (const generation of [11, 12]) {
  test(`V${generation} forms retain legacy applications and file picker`, async () => {
    game.version = `${generation}.315`;
    delete foundry.appv1;
    Object.defineProperty(globalThis, "FormApplication", {
      configurable: true,
      value: LegacyFormApplication,
    });
    Object.defineProperty(globalThis, "FilePicker", {
      configurable: true,
      value: V2Picker,
    });
    const { default: LegacyActor } = await import(`../apps/ActorConfiguration.mjs?v${generation}`);
    const { default: LegacySettings } = await import(`../scripts/SettingsForm.mjs?v${generation}`);
    const app = new LegacyActor({ img: "old.webp" });
    app.position = { top: 10, left: 20 };
    app._onSubmit = async () => {};
    app._onEditImage({ currentTarget: { dataset: { edit: "img" } } });

    assert.ok(app instanceof LegacyFormApplication);
    assert.ok(new LegacySettings() instanceof LegacyFormApplication);
    assert.equal(picker.target, "old.webp");
    assert.equal(picker.options.top, 50);
    assert.equal(picker.options.left, 30);
  });
}

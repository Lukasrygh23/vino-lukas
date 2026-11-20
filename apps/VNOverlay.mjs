import constants from "../scripts/Constants.mjs";

const OverlayApplication = Number.parseInt(game.version, 10) >= 13
  ? foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
  : Application;

export default class VNOverlay extends OverlayApplication {
  /* const app = ;
    static app; */

  static DEFAULT_OPTIONS = {
    id: "vino-overlay",
    window: { frame: false, positioned: false },
  };

  static PARTS = {
    overlay: { template: `${constants.modulePath}/templates/vino-frame.html`, root: true },
  };

  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "vino-overlay",
      template: `${constants.modulePath}/templates/vino-frame.html`,
      popOut: false,
    });
  }

  getData(options = {}) {
    options = super.getData(options);
    return options;
  }

  static init() {
    const instance = new this();
    ui.vinoOverlay = instance;

    instance.render(true);
  }

  activateListeners(html) {
    super.activateListeners(html);
  }
}

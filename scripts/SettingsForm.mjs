import Settings from "./Settings.mjs";
import Logger from "./Logger.mjs";

const usesApplicationV2 = Number.parseInt(game.version, 10) >= 13;
const SettingsFormBase = usesApplicationV2
  ? foundry.applications.api.HandlebarsApplicationMixin(foundry.applications.api.ApplicationV2)
  : FormApplication;

export default class SettingsForm extends SettingsFormBase {
  static DEFAULT_OPTIONS = {
    id: "defaultmoods-settings-form",
    tag: "form",
    classes: ["sheet", "vinoDefaultMooodSettings"],
    window: { title: "ViNo Default Moods" },
    position: { width: 500 },
    form: {
      closeOnSubmit: true,
      handler: async function (event, form, formData) {
        await this._updateObject(event, formData.object);
      },
    },
  };

  static PARTS = {
    moods: { template: "./modules/vino/templates/mood-settings.html", root: true },
  };

  /**
   * Default Options for this FormApplication
   */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      id: "defaultmoods-settings-form",
      title: "ViNo Default Moods",
      template: "./modules/vino/templates/mood-settings.html",
      classes: ["sheet"],
      width: 500,
      closeOnSubmit: true,
    });
  }

  async getData() {
    let storedMoods = await Settings.getAllDefaultMoods();

    const data = {
      moods: this._getIndexValueList(storedMoods),
      cantRemove: storedMoods.length == 0,
    };

    Logger.log(data);

    return data;
  }

  async _prepareContext(options) {
    return this.getData(options);
  }

  _onRender(context, options) {
    super._onRender(context, options);
    this.element.querySelector(".mood-add").addEventListener("click", (event) => this._onMoodChange(event));
    this.element.querySelectorAll(".mood-delete").forEach((button) => {
      button.addEventListener("click", (event) => this._onMoodChange(event, Number(button.dataset.moodid) - 1));
    });
  }

  /**
   * Executes on form submission.
   * @param {Object} e - the form submission event
   * @param {Object} d - the form data
   */
  async _updateObject(e, d) {
    Logger.logObject(d);
    let values = Object.values(d);
    Logger.logObject(values);
    await Settings.set("defaultMoods", values);
  }

  _onMoodChange(event, index) {
    event.preventDefault();
    if (this._changingMoods) return;
    this._changingMoods = true;
    this._changeMoods(index)
      .catch((error) => ui.notifications.error(error, { console: true }))
      .finally(() => { this._changingMoods = false; });
  }

  async _changeMoods(index) {
    const data = usesApplicationV2
      ? new foundry.applications.ux.FormDataExtended(this.form).object
      : this._getSubmitData();
    const moods = Object.values(data);
    if (index === undefined) moods.push("blank");
    else moods.splice(index, 1);
    const controls = Array.from(this.form.querySelectorAll("input, button"), (control) => [control, control.disabled]);
    controls.forEach(([control]) => { control.disabled = true; });
    try {
      await Settings.set("defaultMoods", moods);
      Settings._scheduleRefresh();
      await this.render();
    } finally {
      controls.forEach(([control, disabled]) => { control.disabled = disabled; });
    }
  }

  activateListeners(html) {
    super.activateListeners(html);

    html.find(".mood-add").click((event) => {
      this._onMoodChange(event);
    });
    html.find(".mood-delete").click((event) => {
      this._onMoodChange(event, Number(event.currentTarget.dataset.moodid) - 1);
    });
  }

  _getIndexValueList(array) {
    let options = [];
    array.forEach((x, i) => {
      options.push({ value: x, index: i + 1 });
    });
    return options;
  }
}

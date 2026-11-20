import { gsap, ScrollToPlugin, TextPlugin } from "./scripts/gsap.mjs";
import VNOverlay from "./apps/VNOverlay.mjs";
import ActorConfiguration from "./apps/ActorConfiguration.mjs";
import Settings from "./scripts/Settings.mjs";
import ChatHandler from "./scripts/ChatHandler.mjs";
import LayoutHandler from "./scripts/LayoutDrawer.mjs";
import QueueHandler from "./scripts/QueueHandler.mjs";
import Logger from "./scripts/Logger.mjs";

Hooks.on("getActorSheetHeaderButtons", function (sheet, buttons) {
  buttons.unshift({
    label: "ViNo",
    class: "configure-vino",
    icon: "fas fa-address-book",
    onclick: () => new ActorConfiguration(sheet.actor).render(true),
  });
});

Hooks.on("getHeaderControlsActorSheetV2", function (sheet, controls) {
  controls.unshift({
    action: "configureVino",
    label: "ViNo",
    icon: "fas fa-address-book",
    onClick: () => new ActorConfiguration(sheet.actor).render(true),
  });
});

Hooks.once("ready", async function () {
  await Settings.registerSettings();

  gsap.registerPlugin(ScrollToPlugin, TextPlugin);

  Logger.DEBUG = await Settings.get("debugMode");

  ChatHandler.commandKey = await Settings.get("commandKey");

  LayoutHandler.secondsPerWord = await Settings.get("secondsPerWord");
  LayoutHandler.animatedSecondsPerWord = await Settings.get("animatedSecondsPerWord");
  LayoutHandler.minimumTimeOnscreen = await Settings.get("minimumTimeOnScreen");
  LayoutHandler.timeBetweenScrolling = await Settings.get("timeBetweenScrolling");

  if (!Logger.DEBUG) {
    LayoutHandler.DEBUGGING_LAYOUT = false;
  }

  //QueueHandler.maxOnscreen = await Settings.get("maxOnScreen");

  Handlebars.registerHelper("isdefined", function (value) {
    return value !== undefined && value !== null;
  });

  Settings._scheduleRefresh();
});

Hooks.once("canvasReady", async () => {
  ui.vinoOverlay = new VNOverlay();

  await ui.vinoOverlay.render(true);
  $("#vino-overlay").fadeOut();
});

Hooks.on("createChatMessage", ChatHandler.handleCreateChatMessage);
Hooks.on("chatMessage", ChatHandler.handleChatMessage);

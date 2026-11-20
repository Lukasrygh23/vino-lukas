const usesApplicationV2 = Number.parseInt(game.version, 10) >= 13;
const core = await import(usesApplicationV2
  ? "/scripts/greensock/esm/index.js"
  : "/scripts/greensock/esm/all.js");
const scroll = usesApplicationV2 ? await import("/scripts/greensock/esm/ScrollToPlugin.js") : core;
const text = usesApplicationV2 ? await import("/scripts/greensock/esm/TextPlugin.js") : core;

export const { gsap } = core;
export const { ScrollToPlugin } = scroll;
export const { TextPlugin } = text;

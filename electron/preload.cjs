// Preload bridge. Kept minimal and safe (contextIsolation on).
//
// Steam integration hook point: when you wire up steamworks.js, expose a
// narrow API here, e.g.:
//
//   const { contextBridge } = require("electron");
//   const steam = require("steamworks.js").init(YOUR_APP_ID);
//   contextBridge.exposeInMainWorld("steam", {
//     unlockAchievement: (id) => steam.achievement.activate(id),
//   });
//
// The game can then call window.steam.unlockAchievement("REACHED_EXIT").

window.addEventListener("DOMContentLoaded", () => {
  // no-op for now
});

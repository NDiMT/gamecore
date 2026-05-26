const { app, BrowserWindow } = require("electron");
const path = require("path");

const isDev = process.env.NOCLIP_DEV === "1";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 854,
    minHeight: 480,
    fullscreen: !isDev,
    backgroundColor: "#000000",
    title: "NOCLIP — Level 0",
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
    },
  });

  win.setMenuBarVisibility(false);

  if (isDev) {
    win.loadURL("http://localhost:5173/horror.html");
  } else {
    win.loadFile(path.join(__dirname, "..", "dist", "horror.html"));
  }

  win.once("ready-to-show", () => win.show());

  win.webContents.on("before-input-event", (event, input) => {
    if (input.type !== "keyDown") return;
    if (input.key === "F11") {
      win.setFullScreen(!win.isFullScreen());
    }
    if (input.key === "F12" && isDev) {
      win.webContents.toggleDevTools();
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

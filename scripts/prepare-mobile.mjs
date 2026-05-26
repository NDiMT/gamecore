// Capacitor serves dist/index.html as the app entry. On mobile we want the
// horror game, not the Chronos landing page, so promote horror.html to be the
// index. Relative asset paths (vite base "./") keep resolving from dist root.
import { copyFileSync, existsSync } from "node:fs";

const src = "dist/horror.html";
const dst = "dist/index.html";

if (!existsSync(src)) {
  console.error(`prepare-mobile: ${src} not found — run "vite build" first.`);
  process.exit(1);
}
copyFileSync(src, dst);
console.log(`prepare-mobile: ${dst} <- ${src}`);

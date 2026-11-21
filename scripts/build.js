/**
 * production build → dist/
 *   dist/index.js …      compiled server (tsconfig.build.json)
 *   dist/public/css/     minified Tailwind CSS
 *   dist/public/js/      client ES modules (copied as-is, no bundling)
 *   dist/public/images/  logo and icons/*.svg
 * run with `pnpm build`, then `pnpm start`.
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";

const run = (command) => {
  execSync(command, { stdio: "inherit" });
};

async function build() {
  try {
    console.log("Building application...");

    // start clean so files deleted from src/ don't survive in dist/
    await rm("dist", { recursive: true, force: true });

    run("tsc -p tsconfig.build.json");

    await mkdir("dist/public/css", { recursive: true });

    run("tailwindcss -i ./src/global.css -o ./dist/public/css/styles.css --minify");

    // client modules, images (logo + icon .svg files, read by the Icon component at start-up) and favicon.
    // All three are required at runtime, so a missing folder fails the build with a clear message.
    const publicDirs = ["js", "images", "favicon"];
    const missing = publicDirs.filter((dir) => !existsSync(`public/${dir}`));
    if (missing.length) {
      throw new Error(`missing required folder(s): ${missing.map((dir) => `public/${dir}`).join(", ")}`);
    }
    for (const dir of publicDirs) {
      await cp(`public/${dir}`, `dist/public/${dir}`, { recursive: true });
    }

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();

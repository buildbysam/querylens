import { execSync } from "node:child_process";
import { mkdir } from "node:fs/promises";

const run = (command) => {
  execSync(command, { stdio: "inherit" });
};

async function build() {
  try {
    console.log("Building application...");

    run("tsc");

    await mkdir("dist/public/css", { recursive: true });
    await mkdir("dist/public/images", { recursive: true });

    run("tailwindcss -i ./src/global.css -o ./dist/public/css/styles.css --minify");

    // await cp("public/images", "dist/public/images", { recursive: true });

    console.log("Build completed successfully!");
  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

build();

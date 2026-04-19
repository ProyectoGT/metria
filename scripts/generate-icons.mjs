import sharp from "sharp";
import { mkdirSync } from "fs";

const SOURCE = "public/favicon-master.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

mkdirSync("public/icons", { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "contain", background: TRANSPARENT })
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.png`);
}

await sharp(SOURCE)
  .resize(180, 180, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile("public/apple-touch-icon.png");
console.log("Generated apple-touch-icon.png");

await sharp(SOURCE)
  .resize(32, 32, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile("public/favicon-32x32.png");
console.log("Generated favicon-32x32.png");

await sharp(SOURCE)
  .resize(16, 16, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile("public/favicon-16x16.png");
console.log("Generated favicon-16x16.png");

// Next app favicon uses PNG data with .ico extension, matching the existing project setup.
await sharp(SOURCE)
  .resize(32, 32, { fit: "contain", background: TRANSPARENT })
  .png()
  .toFile("src/app/favicon.ico");
console.log("Generated src/app/favicon.ico");

console.log("\nIconos generados correctamente.");

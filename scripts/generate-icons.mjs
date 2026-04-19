import sharp from "sharp";
import { mkdirSync } from "fs";

const SOURCE = "public/favicon-master.png";
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

mkdirSync("public/icons", { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

function roundedMask(size) {
  const radius = Math.round(size * 0.34);
  return Buffer.from(
    `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="white"/></svg>`
  );
}

async function generateRoundedIcon(size, output) {
  await sharp(SOURCE)
    .resize(size, size, { fit: "cover", background: TRANSPARENT })
    .composite([{ input: roundedMask(size), blend: "dest-in" }])
    .png()
    .toFile(output);
}

for (const size of sizes) {
  await generateRoundedIcon(size, `public/icons/icon-${size}x${size}.png`);
  console.log(`Generated icon-${size}x${size}.png`);
}

await generateRoundedIcon(180, "public/apple-touch-icon.png");
console.log("Generated apple-touch-icon.png");

await generateRoundedIcon(32, "public/favicon-32x32.png");
console.log("Generated favicon-32x32.png");

await generateRoundedIcon(16, "public/favicon-16x16.png");
console.log("Generated favicon-16x16.png");

// Next app favicon uses PNG data with .ico extension, matching the existing project setup.
await generateRoundedIcon(32, "src/app/favicon.ico");
console.log("Generated src/app/favicon.ico");

console.log("\nIconos generados correctamente.");

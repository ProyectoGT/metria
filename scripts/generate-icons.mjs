import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp("public/logo-metria-crm.png")
    .resize(size, size, { fit: "contain", background: { r: 26, g: 86, b: 219, alpha: 1 } })
    .png()
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`✓ icon-${size}x${size}.png`);
}

// Apple touch icon (180x180, fondo sólido)
await sharp("public/logo-metria-crm.png")
  .resize(180, 180, { fit: "contain", background: { r: 26, g: 86, b: 219, alpha: 1 } })
  .png()
  .toFile("public/apple-touch-icon.png");
console.log("✓ apple-touch-icon.png");

// Favicon 32x32
await sharp("public/logo-metria-crm.png")
  .resize(32, 32, { fit: "contain", background: { r: 26, g: 86, b: 219, alpha: 1 } })
  .png()
  .toFile("public/favicon-32x32.png");
console.log("✓ favicon-32x32.png");

console.log("\nIconos generados correctamente.");

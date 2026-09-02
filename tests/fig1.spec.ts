import { test, expect } from "@playwright/test";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 720 },
  { name: "tablet", width: 768, height: 900 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const vp of VIEWPORTS) {
  test(`Fig.01 renders and stays visible on ${vp.name}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });

    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto("http://localhost:8080/");

    const svg = page.getByTestId("fig1-svg");
    await expect(svg).toBeVisible();

    // No fallback shown = real diagram rendered.
    await expect(page.getByTestId("fig1-fallback")).toHaveCount(0);

    // Fits inside its figure container (no clipping).
    const box = await svg.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);
    expect(box!.width).toBeLessThanOrEqual(vp.width);

    // Visual regression baseline.
    await expect(svg).toHaveScreenshot(`fig1-${vp.name}.png`, { maxDiffPixelRatio: 0.02 });

    expect(errors, `page errors on ${vp.name}: ${errors.join("\n")}`).toEqual([]);
  });
}

import { expect, test } from "@playwright/test";
import path from "node:path";

const routes = ["/", "/feed", "/requests", "/requests/new", "/inbox", "/sessions", "/sessions/d9fd0d36-e844-4133-a0a1-74488992ae98", "/requests/8af9710e-0cb1-419a-85ce-a90dc5fcdf20", "/profile", "/account", "/alerts", "/explore", "/explore/requests/8af9710e-0cb1-419a-85ce-a90dc5fcdf20", "/auth/reset-password", "/auth/error", "/safety/reporting", "/legal/privacy", "/legal/terms", "/legal/community", "/unknown-audit-page"];

for (const width of [360, 1440]) {
  test(`automated accessibility checks at ${width}px`, async ({ page }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height: 1000 });
    const findings: Array<{ route: string; violations: unknown[] }> = [];
    for (const route of routes) {
      await page.goto(route);
      // Wait for hydration so scans do not capture controls mid-enable transition.
      if (route === "/") await expect(page.getByRole("group", { name: "Account access mode" }).getByRole("button", { name: "Sign In" })).toBeEnabled();
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.addScriptTag({ path: path.resolve("node_modules/axe-core/axe.min.js") });
      const violations = await page.evaluate(async () => {
        const axe = (window as unknown as { axe: { run: (context: Document, options: unknown) => Promise<{ violations: Array<{ id: string; impact: string; nodes: Array<{ target: string[]; failureSummary: string }> }> }> } }).axe;
        const result = await axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } });
        return result.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => ({ target: node.target, failure: node.failureSummary })) }));
      });
      if (violations.length) findings.push({ route, violations });
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `Overflow: ${route}`).toBe(true);
      await expect.soft(page.getByRole("heading", { level: 1 }), `One main heading: ${route}`).toHaveCount(1);
    }
    await test.info().attach(`accessibility-${width}.json`, { body: JSON.stringify(findings, null, 2), contentType: "application/json" });
    expect(findings.length, JSON.stringify(findings)).toBe(0);
  });
}

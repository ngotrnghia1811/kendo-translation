// Owner-only browser check. It never starts a server and mocks every API write.
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
const u = await fs.realpath(path.resolve(import.meta.dirname, "../.."));
assert.equal(process.env.VW77D_UNIT, u, "Use scripts/dev/cleanenv.sh");
const base = new URL(process.argv[2] ?? "http://127.0.0.1:3217");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(base.hostname));
assert.equal(base.port, "3217", "Only the owner's fixture port 3217 is allowed");
const fixture = (await fs.readFile(path.join(u, "logs/latest-fixture.txt"), "utf8")).trim();
assert.ok((await fs.realpath(fixture)).startsWith(u + "/tmp/contracts-"));
const cfg = JSON.parse(await fs.readFile(path.join(fixture, "viewer.config.json"), "utf8"));
for (const dir of [cfg.translatorDataDir, cfg.translatorConfigDir]) assert.ok((await fs.realpath(dir)).startsWith(fixture + "/"));
const artifacts = path.join(u, "logs/browser"); await fs.mkdir(artifacts, { recursive: true });
function cli(...args) {
  const r = spawnSync("playwright-cli", ["-s=VW77d", ...args], { cwd: artifacts, env: process.env, encoding: "utf8" });
  process.stdout.write(r.stdout ?? ""); process.stderr.write(r.stderr ?? "");
  if (r.status !== 0 || /### Error/.test(r.stdout)) throw new Error("playwright-cli failed: " + args[0]);
}
cli("open", "--browser=chrome");
try {
  cli("resize", "1440", "900"); cli("tracing-start");
  cli("run-code", `async (page) => {
    await page.route('**/api/**', async route => {
      if (!['GET','HEAD'].includes(route.request().method())) return route.fulfill({status:403,contentType:'application/json',body:JSON.stringify({error:'Fixture browser mock: no API writes.'})});
      return route.continue();
    });
    await page.goto(${JSON.stringify(base.href + "settings/run")});
    await page.getByRole('heading',{name:'Run settings',exact:true}).waitFor();
    if (await page.locator('input,select').count() < 22) throw new Error('Missing settings fields');
    await page.locator('[id="update.N"]').fill('6');
    await page.getByRole('button',{name:'Review changes',exact:true}).click();
    if (await page.evaluate(() => document.activeElement?.textContent) !== 'Cancel') throw new Error('Cancel lacks focus');
    await page.keyboard.press('Escape');
    if (await page.getByRole('dialog').count() !== 0) throw new Error('Escape did not close the dialog');
    await page.getByRole('button',{name:'Reset N',exact:true}).click();
    if (await page.locator('[id="update.N"]').inputValue() !== '') throw new Error('N reset wrote a number');
    await page.locator('[id="memory.memory_k"]').fill('11');
    await page.locator('[id="memory.memory_k"]').press('Tab');
    if (!await page.getByText(/not a whole number from 1 to 10/).count()) throw new Error('No range error');
    await page.getByRole('button',{name:'Discard',exact:true}).click();
    for (const theme of ['light','dark']) {
      await page.evaluate(t => document.documentElement.dataset.theme = t, theme);
      await page.evaluate(() => scrollTo(0,0));
      await page.screenshot({path:${JSON.stringify(artifacts)} + '/settings-' + theme + '.png'});
      await page.locator('[id="update.N"]').focus();
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => { const el=document.activeElement; const s=getComputedStyle(el); return {tag:el?.tagName,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth}; });
      if (focus.outlineStyle === 'none' || parseFloat(focus.outlineWidth) < 1) throw new Error('No visible keyboard focus');
      await page.screenshot({path:${JSON.stringify(artifacts)} + '/focus-' + theme + '.png'});
    }
    await page.context().storageState({path:${JSON.stringify(path.join(u, "tmp/VW77d-browser-state.json"))}});
  }`);
  cli("tracing-stop"); console.log("VW77d Chrome fixture PASS");
} finally { cli("close"); }

import { test, expect } from "@playwright/test";

const password = "a browser test passphrase";

test("voice-first private reflection syncs across devices and can be shared then revoked", async ({
  page,
  browser,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      webkitSpeechRecognition: unknown;
      __voiceStarts: number;
    };
    state.__voiceStarts = 0;
    state.webkitSpeechRecognition = class {
      onresult: ((event: unknown) => void) | null = null;
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        state.__voiceStarts++;
        setTimeout(
          () =>
            this.onresult?.({
              results: [{ isFinal: false, 0: { transcript: "I noticed" } }],
            }),
          10,
        );
        const result = {
          results: [
            {
              isFinal: true,
              0: { transcript: "I noticed a different way to see the world." },
            },
          ],
        };
        setTimeout(() => this.onresult?.(result), 30);
        setTimeout(() => this.onresult?.(result), 50); // Repeated browser results must not duplicate words.
        setTimeout(() => this.onend?.(), 70);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: state.webkitSpeechRecognition,
    });
  });
  const username = `journal_${crypto.randomUUID().slice(0, 8)}`;
  await page.goto("/account");
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create my private journal" }).click();
  await expect(page).toHaveURL(/\/journal$/);
  await page.goto("/d/test-discovery-0");
  const composer = page.locator(".reflection-composer");
  await expect(
    composer.getByLabel("Your reflection", { exact: true }),
  ).not.toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as { __voiceStarts: number }).__voiceStarts,
    ),
  ).toBe(0);
  await composer.getByRole("button", { name: "Speak your reflection" }).click();
  await expect(composer.locator(".transcript-preview")).toContainText(
    "I noticed a different way to see the world.",
  );
  await expect(
    composer.getByRole("button", { name: "Save privately", exact: true }),
  ).toBeEnabled();
  await composer
    .getByRole("button", { name: "Save privately", exact: true })
    .click();
  await expect(composer.getByRole("status")).toContainText("Saved privately");
  await page.goto("/journal");
  const entry = page.locator(".journal-entry").first();
  await expect(entry.locator(".reflection-body")).toHaveText(
    "I noticed a different way to see the world.",
  );
  await expect(entry.getByText("Only you", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/journal-${test.info().project.name}.png`,
    fullPage: true,
  });
  const secondDevice = await browser.newContext();
  const other = await secondDevice.newPage();
  await other.goto("http://127.0.0.1:3100/journal");
  await expect(other.locator(".reflection-body")).toHaveCount(0);
  page.once("dialog", (dialog) => dialog.accept());
  await entry
    .getByRole("button", { name: "Share publicly", exact: true })
    .click();
  await expect(
    entry.getByText("Shared by link", { exact: true }),
  ).toBeVisible();
  const shareUrl = await entry
    .getByLabel("Share link", { exact: true })
    .inputValue();
  await other.goto(shareUrl);
  await expect(other.locator(".reflection-body")).toHaveText(
    "I noticed a different way to see the world.",
  );
  await expect(
    other.getByRole("heading", { name: `What stayed with ${username}.` }),
  ).toBeVisible();
  await entry
    .getByRole("button", { name: "Make private", exact: true })
    .click();
  await expect(entry.getByText("Only you", { exact: true })).toBeVisible();
  await other.reload();
  await expect(
    other.getByRole("heading", { name: "This reflection isn’t shared." }),
  ).toBeVisible();
  await expect(other.locator(".reflection-body")).toHaveCount(0);
  await other.goto("http://127.0.0.1:3100/account");
  await other.getByLabel("Username", { exact: true }).fill(username);
  await other.getByLabel("Password", { exact: true }).fill(password);
  await other
    .getByRole("button", { name: "Sign in to my journal", exact: true })
    .click();
  await expect(other).toHaveURL(/\/journal$/);
  await expect(other.locator(".reflection-body")).toHaveText(
    "I noticed a different way to see the world.",
  );
  const cookies = await secondDevice.cookies();
  expect(
    cookies.find((cookie) => cookie.name === "elsewhere_session")?.httpOnly,
  ).toBe(true);
  await secondDevice.close();
});

test("microphone denial preserves the text alternative and existing words", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const browser = window as unknown as { webkitSpeechRecognition: unknown };
    browser.webkitSpeechRecognition = class {
      onerror: ((event: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      start() {
        setTimeout(() => {
          this.onerror?.({ error: "not-allowed" });
          this.onend?.();
        }, 20);
      }
      stop() {
        this.onend?.();
      }
      abort() {}
    };
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: browser.webkitSpeechRecognition,
    });
  });
  await page.goto("/d/test-discovery-0");
  const composer = page.locator(".reflection-composer");
  await composer.getByRole("button", { name: "Speak your reflection" }).click();
  await expect(composer.locator(".voice-status")).toContainText(
    "Microphone access wasn’t granted",
  );
  await composer
    .getByText("Edit transcript or type instead", { exact: true })
    .click();
  await composer
    .getByLabel("Your reflection", { exact: true })
    .fill("A thought I can still type.");
  await expect(
    composer.getByRole("button", { name: "Save privately", exact: true }),
  ).toBeEnabled();
  await page.reload();
  await expect(composer.locator(".transcript-preview")).toContainText(
    "A thought I can still type.",
  );
});

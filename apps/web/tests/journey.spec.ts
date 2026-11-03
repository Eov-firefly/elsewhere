import { test, expect } from "@playwright/test";

test("finite daily edition, save, feedback, report and privacy reset", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator(".discovery-card")).toHaveCount(3);
  await expect(
    page.getByRole("heading", { name: /That’s all for today/ }),
  ).toBeVisible();
  await expect(page.locator("iframe,video")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: `test-results/edition-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", {
      name: "A different way to see the stars",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "A different way to see the stars",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "+ Save for another moment", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "✓ In your collection" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Yes, worth it", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Thank you");
  await page.getByRole("button", { name: "Report a problem" }).click();
  await page
    .getByLabel("What went wrong?")
    .fill("Synthetic browser test report");
  await page.getByRole("button", { name: "Send report" }).click();
  await expect(page.getByRole("status")).toContainText("Report received");
  await page
    .getByRole("link", { name: /Your collection/ })
    .first()
    .click();
  await expect(
    page.getByRole("link", { name: "A different way to see the stars ↗" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("link", { name: "A different way to see the stars ↗" }),
  ).toBeVisible();
  await page.goto("/preferences");
  await expect(page.getByRole("checkbox")).not.toBeChecked();
  await page.getByRole("checkbox").check();
  await expect(page.getByRole("status")).toContainText("Preference saved");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete my data" }).click();
  await expect(page.getByRole("status")).toContainText("cleared");
  await page.goto("/saved");
  await expect(
    page.getByText("A little space for what stays with you."),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("editor desk authenticates and shows real audit/report data", async ({
  page,
}) => {
  await page.goto("/admin");
  await page
    .getByLabel("Editor access token")
    .fill("e2e-test-token-xxxxxxxxxxxxxxxxxxxxxxxx");
  await page.getByRole("button", { name: "Unlock desk" }).click();
  await expect(
    page.getByRole("heading", { name: "1. Source library" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Reports awaiting review" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Lock desk" }).click();
  await expect(page.getByLabel("Editor access token")).toHaveValue("");
});

test("a removed or missing saved URL never renders a player", async ({
  page,
}) => {
  await page.goto("/d/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This window is closed for now." }),
  ).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("official player requires an explicit choice and never autoplays", async ({
  page,
}) => {
  // Exercise consent and iframe construction without accessing any real video.
  await page.route("https://www.youtube-nocookie.com/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<p>Synthetic player test</p>",
    }),
  );
  await page.goto("/d/test-discovery-1");
  await expect(page.locator("iframe")).toHaveCount(0);
  await page.getByRole("button", { name: "Load YouTube player" }).click();
  await expect(page.locator("iframe")).toHaveAttribute(
    "src",
    "https://www.youtube-nocookie.com/embed/TESTVIDEO01?autoplay=0",
  );
  await expect(
    page.getByRole("link", { name: "Open the original source ↗" }),
  ).toHaveAttribute("target", "_blank");
});

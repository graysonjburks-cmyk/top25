import { test, expect } from "@playwright/test";
test("public editorial preview, data hub, museums and all playoff formats render", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every Saturday. A new pecking order." }),
  ).toBeVisible();
  await expect(page.getByText("SAMPLE DATA · NOT LIVE RANKINGS")).toBeVisible();
  await page.screenshot({
    path: "/tmp/saturday-poll-desktop.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "CFP 4", exact: true }).click();
  await page
    .getByRole("button", { name: "Playoff", exact: false })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "The final 4." }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "CFP 24*", exact: true }).click();
  await expect(
    page.getByText("HYPOTHETICAL FORMAT · NOT THE OFFICIAL CFP"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Data center", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The numbers behind the noise." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search statistics teams" })
    .fill("Georgia");
  await page.getByRole("button", { name: "Georgia", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Football history", exact: true })
    .click();
  await expect(
    page.getByText("This cabinet is awaiting its collection."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close team museum" }).click();
  expect(errors).toEqual([]);
});
test("mobile group creation, ballot controls, draft save and commissioner settings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Build your ballot", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Group name" })
    .fill("Browser test club");
  await page
    .getByRole("textbox", { name: "Your name" })
    .fill("Browser commissioner");
  await page.getByRole("button", { name: "Create private group" }).click();
  await expect(
    page.getByRole("heading", { name: "Trust your gut." }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search teams" }).fill("Georgia");
  await page
    .locator("button.directory-team")
    .filter({ hasText: /^GGeorgiaSEC/ })
    .click();
  await expect(page.getByText("1 / 25 selected")).toBeVisible();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved.", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My ballot", exact: true }).click();
  await expect(page.getByText("1 / 25 selected")).toBeVisible();
  await page
    .getByRole("button", { name: "Fill remaining alphabetically" })
    .click();
  await expect(page.getByText("25 / 25 selected")).toBeVisible();
  await page.getByRole("button", { name: "Submit final ballot" }).click();
  await expect(
    page.getByText("Ballot submitted. You can edit it until voting closes."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Group settings", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Polling controls" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close voting", exact: true }).click();
  await page
    .getByRole("button", { name: "Publish results", exact: true })
    .click();
  await expect(page.getByText("The official poll is published.")).toBeVisible();
  await page.getByRole("button", { name: "The Top 25", exact: true }).click();
  await expect(page.locator("table.rankings-table tbody tr")).toHaveCount(25);
  await page.screenshot({
    path: "/tmp/saturday-poll-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  expect(overflow).toBe(false);
});

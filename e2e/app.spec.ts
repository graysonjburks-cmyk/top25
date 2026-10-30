import { test, expect } from "@playwright/test";
const fixture = {
  season: 2026,
  week: 9,
  checkedAt: "2026-10-30T12:00:00Z",
  teams: [
    {
      id: "georgia",
      name: "Georgia",
      conference: "SEC",
      initials: "UGA",
      color: "#b71936",
    },
  ],
  records: {
    georgia: {
      overall: "7-1",
      conference: "5-0",
      season: 2026,
      source: "https://example.invalid/synthetic-test-fixture",
      updatedAt: "2026-10-30T12:00:00Z",
    },
  },
  polls: [
    {
      id: "ap",
      name: "AP Top 25",
      season: 2026,
      week: 9,
      publishedAt: "2026-10-25T17:00:00Z",
      source: "https://example.invalid/synthetic-test-fixture",
      ranks: [
        {
          id: "georgia",
          rank: 1,
          previous: 2,
          points: 100,
          firsts: 4,
          record: "7-1",
        },
      ],
      status: "available",
    },
    {
      id: "coaches",
      name: "Coaches Poll",
      season: 2026,
      week: 9,
      publishedAt: null,
      source: "https://example.invalid/synthetic-test-fixture",
      ranks: [],
      status: "unavailable",
    },
    {
      id: "bcs",
      name: "BCS (historical)",
      season: 2013,
      week: null,
      publishedAt: null,
      source: "https://example.invalid/synthetic-test-fixture",
      ranks: [],
      status: "historical",
    },
  ],
  errors: [],
  source: "https://example.invalid/synthetic-test-fixture",
  directoryVerified: false,
};
test.beforeEach(async ({ page }) => {
  await page.route("**/api/national", (route) =>
    route.fulfill({ json: fixture }),
  );
});
test("national and friends tabs, sourced records, historical BCS and museums", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Every Saturday. A new pecking order." }),
  ).toBeVisible();
  await expect(page.locator(".national-table .team-record")).toHaveText(
    "7-1 (5-0)",
  );
  await page.getByRole("tab", { name: /BCS Archive/ }).click();
  await expect(
    page.getByRole("heading", { name: "The BCS belongs in the archive." }),
  ).toBeVisible();
  await page.getByRole("tab", { name: /Friends poll/ }).click();
  await expect(page.getByText("SAMPLE DATA · NOT LIVE RANKINGS")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inside the ballot box." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "CFP 4", exact: true }).click();
  await page.getByRole("button", { name: "Playoff", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "The final 4." }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Data center", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search statistics teams" })
    .fill("Georgia");
  await page.getByRole("button", { name: "Georgia", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("rank before identity, save local draft, submit name plus code and customize live group", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Build your ballot", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("textbox", { name: "Search teams" }).fill("Georgia");
  await page
    .locator("button.directory-team")
    .filter({ hasText: "Georgia" })
    .filter({ hasNotText: "Georgia State" })
    .filter({ hasNotText: "Georgia Southern" })
    .filter({ hasNotText: "Georgia Tech" })
    .click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved on this browser.")).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "My ballot", exact: true }).click();
  await expect(page.getByText("1 / 25 selected")).toBeVisible();
  await page
    .getByRole("button", { name: "Fill remaining alphabetically" })
    .click();
  await expect(page.getByText("25 / 25 selected")).toBeVisible();
  await page.getByRole("button", { name: "Submit final ballot" }).click();
  await expect(
    page.getByRole("heading", { name: "Put it on the record." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Your name", exact: true })
    .fill("John");
  await page
    .getByRole("textbox", { name: "Private group code", exact: true })
    .fill(`BROWSER-${Date.now()}`);
  await page
    .getByRole("button", { name: "Submit to friends poll", exact: true })
    .click();
  await expect(page.getByText(/Ballot submitted to John/)).toBeVisible();
  await expect(page.getByText("LIVE CONSENSUS", { exact: true })).toBeVisible();
  await expect(page.locator("table.rankings-table tbody tr")).toHaveCount(25);
  await expect(
    page.getByRole("button", { name: "Copy private group code" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Group settings", exact: true })
    .click();
  await page.getByLabel("Editorial theme").selectOption("scoreboard");
  await page.getByRole("button", { name: "Save your look" }).click();
  await expect(page.locator(".poll-shell")).toHaveClass(/theme-scoreboard/);
  await page.getByRole("button", { name: "Friends poll", exact: true }).click();
  await page.screenshot({
    path: "/tmp/saturday-poll-updated-mobile.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
});

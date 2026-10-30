import { db } from "../lib/db";
async function main() {
  await db();
  console.log("Database migrations applied.");
  process.exit(0);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});

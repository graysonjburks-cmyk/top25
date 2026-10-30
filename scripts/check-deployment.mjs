// Vercel builds must have persistent PostgreSQL before any schema or app build.
const value = process.env.DATABASE_URL;
if (!value) {
  console.error('Set DATABASE_URL in the Vercel project environment settings before deploying. Local PGlite storage is not durable on Vercel.');
  process.exit(1);
}
try {
  const url = new URL(value);
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname) throw new Error();
} catch {
  console.error('DATABASE_URL must be a PostgreSQL connection string. Configure it securely in Vercel; do not paste it into chat.');
  process.exit(1);
}
console.log('Production PostgreSQL configuration is present. Migration will verify the connection.');

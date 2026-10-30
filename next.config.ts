import type { NextConfig } from "next";
const config: NextConfig = {
  outputFileTracingIncludes: { "/*": ["./migrations/*.sql"] },
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;

// CI builds may not provide DATABASE_URL; fall back to a local default there so
// the config can still be loaded. Non-CI environments must supply it.
const databaseUrl =
    process.env.DATABASE_URL ??
    (process.env.CI ? "postgresql://postgres:password@localhost:5432/kb?schema=public" : undefined);

if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
}

const config = {
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: databaseUrl,
    },
};

export default config;

import 'dotenv/config';

function resolveDatabaseUrl(env: NodeJS.ProcessEnv): string {
    if (env.DATABASE_URL) {
        return env.DATABASE_URL;
    }
    const type = env.DB_TYPE ?? "postgresql";
    const host = env.DB_HOST;
    const user = env.DB_USER;
    const name = env.DB_NAME;
    const port = env.DB_PORT;
    const pass = env.DB_PASS ?? "";
    const schema = env.DB_SCHEMA;

    if (!host || !user || !name) {
        throw new Error("Database config missing: set DATABASE_URL or DB_HOST, DB_USER, DB_NAME (optional: DB_PASS, DB_PORT, DB_TYPE, DB_SCHEMA).");
    }

    const url = new URL(`${type}://placeholder`);
    url.hostname = host;
    url.username = user;
    if (pass) {
        url.password = pass;
    }
    url.pathname = `/${name}`;
    if (port) {
        url.port = port;
    }
    if (schema) {
        url.searchParams.set("schema", schema);
    }

    return url.toString();
}

const DATABASE_URL = resolveDatabaseUrl(process.env);

const config = {
    schema: "prisma/schema.prisma",
    migrations: {
        path: "prisma/migrations",
    },
    datasource: {
        url: DATABASE_URL,
    },
};

export default config;

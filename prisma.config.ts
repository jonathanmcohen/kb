import 'dotenv/config';
import { resolveDatabaseUrl } from "./lib/database-url";

const DATABASE_URL = resolveDatabaseUrl();

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

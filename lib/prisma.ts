import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { resolveDatabaseUrl } from "./database-url";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
    prismaAdapter: PrismaPg | undefined;
};

const databaseUrl = resolveDatabaseUrl();

const adapter =
    globalForPrisma.prismaAdapter ?? new PrismaPg(new Pool({ connectionString: databaseUrl }));

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.prismaAdapter = adapter;
}

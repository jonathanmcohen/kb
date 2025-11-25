import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// During build time, we don't want to instantiate Prisma
export const prisma =
    globalForPrisma.prisma ??
    (typeof window === "undefined" && process.env.NODE_ENV !== "production"
        ? new PrismaClient()
        : new PrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

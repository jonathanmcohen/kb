# Customization & Development Guide

This document outlines the standards and workflows for modifying and extending the **kb** project.

## Tech Stack

-   **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
-   **Language**: [TypeScript](https://www.typescriptlang.org/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (based on Radix UI)
-   **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
-   **Authentication**: [NextAuth.js v5](https://authjs.dev/) (Beta)
-   **State Management**: [Zustand](https://github.com/pmndrs/zustand) (Client), React Server Components (Server)
-   **Validation**: [Zod](https://zod.dev/)
-   **Icons**: [Lucide React](https://lucide.dev/)

## Project Structure

-   `src/app`: Next.js App Router pages and layouts.
    -   `(admin)`: Admin-specific routes (protected).
    -   `(auth)`: Authentication routes (login, register).
    -   `(main)`: Main application routes.
    -   `api`: Route Handlers (REST API).
    -   `actions`: Server Actions for mutations.
-   `src/components`: React components.
    -   `ui`: Reusable UI components (shadcn/ui).
    -   `admin`: Admin-specific components.
-   `src/lib`: Utility functions, database clients, and auth configuration.
-   `prisma`: Database schema and migrations.

## Development Standards

### 1. Components & Styling
-   **UI Library**: Use `shadcn/ui` components located in `src/components/ui` whenever possible.
-   **Styling**: Use Tailwind CSS utility classes. Avoid creating new CSS files.
-   **Icons**: Use `lucide-react` for icons.
-   **Client vs. Server**: Default to Server Components. Add `"use client"` at the top of the file only when interactivity (hooks, event listeners) is needed.

### 2. Data Fetching & Mutations
-   **Fetching**: Fetch data directly in Server Components using `prisma`.
    ```typescript
    const users = await prisma.user.findMany();
    ```
-   **Mutations**: Use **Server Actions** for form submissions and data updates.
    -   Define actions in `src/app/actions`.
    -   Validate inputs using `zod`.
    -   Use `revalidatePath` to update the UI after a mutation.
    ```typescript
    "use server";
    export async function updateProfile(formData: FormData) { ... }
    ```

### 3. Authentication
-   **Protection**: Use `auth()` from `@/lib/auth` to check session status in Server Components and Server Actions.
-   **Client-Side**: Use `useSession` hook if absolutely necessary, but prefer passing user data from Server Components.

### 4. Database Changes
1.  **Modify Schema**: Edit `prisma/schema.prisma`.
2.  **Generate Client**: Run `npx prisma generate` to update the TypeScript client.
3.  **Push Changes**:
    -   Development: `npx prisma db push` (quick sync).
    -   Production: `npx prisma migrate dev` (create migration history).

### 5. Naming Conventions
-   **Files**: Use kebab-case (e.g., `user-profile.tsx`, `auth.ts`).
-   **Components**: Use PascalCase (e.g., `UserProfile`).
-   **Functions**: Use camelCase (e.g., `updateUserProfile`).

## Adding New Features
1.  **Plan**: Define the data model and UI requirements.
2.  **Database**: Update `schema.prisma` if needed.
3.  **Server Action**: Create a server action to handle the business logic and DB writes.
4.  **UI**: Create the necessary components and pages. Use `zod` for form validation and `sonner` for toast notifications.

## Common Patterns

### Server Component with Data Fetching
```typescript
// src/app/(main)/documents/page.tsx
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

export default async function DocumentsPage() {
    const session = await auth();
    
    if (!session?.user?.id) {
        redirect("/login");
    }

    const documents = await prisma.document.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
    });

    return <div>{/* Render documents */}</div>;
}
```

### Server Action with Validation
```typescript
// src/app/actions/documents.ts
"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createDocumentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    content: z.any().optional(),
});

export async function createDocument(formData: FormData) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return { error: "Unauthorized" };
        }

        const rawData = {
            title: formData.get("title"),
            content: formData.get("content"),
        };

        const validatedData = createDocumentSchema.parse(rawData);

        const document = await prisma.document.create({
            data: {
                ...validatedData,
                userId: session.user.id,
            },
        });

        revalidatePath("/documents");
        return { success: true, data: document };
    } catch (error) {
        console.error("Failed to create document:", error);
        return { error: "Failed to create document" };
    }
}
```

### Client Component with Server Action
```typescript
// src/components/document-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createDocument } from "@/app/actions/documents";
import { toast } from "sonner";

export function DocumentForm() {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    async function handleSubmit(formData: FormData) {
        setIsLoading(true);
        const result = await createDocument(formData);
        setIsLoading(false);

        if (result.error) {
            toast.error(result.error);
        } else {
            toast.success("Document created");
            router.push(`/documents/${result.data.id}`);
        }
    }

    return (
        <form action={handleSubmit} className="space-y-4">
            <Input name="title" placeholder="Document title" required />
            <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Document"}
            </Button>
        </form>
    );
}
```

### Protected Route Pattern
```typescript
// src/app/(admin)/admin/page.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function AdminPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect("/login");
    }

    // Check admin status
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { isAdmin: true },
    });

    if (!user?.isAdmin) {
        redirect("/");
    }

    // Admin content...
}
```

## Error Handling

### Server Actions
-   Always wrap in `try-catch` blocks.
-   Return `{ error: string }` or `{ success: true, data: T }`.
-   Log errors to console for debugging.

### Client Components
-   Use `sonner` for user-facing error messages.
-   Handle loading states to prevent double submissions.

## Form Handling

### Best Practices
1.  Use native HTML forms with `action` prop.
2.  Validate on the server using `zod`.
3.  Provide immediate feedback with `toast`.
4.  Disable submit buttons during loading.
5.  Use `revalidatePath` to refresh data after mutations.

## Testing

### Type Checking
```bash
npx tsc --noEmit
```

### Linting
```bash
npm run lint
```

### Prisma Studio (DB Inspection)
```bash
npx prisma studio
```

## Deployment

### Environment Variables (Production)
-   `DATABASE_URL`: PostgreSQL connection string
-   `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
-   `NEXTAUTH_URL`: Your production URL
-   OAuth credentials (if using Google/GitHub)

### Docker Build
```bash
docker build -t kb-app .
docker run -p 3000:3000 --env-file .env kb-app
```

### Database Migrations
```bash
# Development
npx prisma db push

# Production (recommended)
npx prisma migrate deploy
```

## Tips

-   **Prisma Client**: Import from `@/lib/prisma`, not directly from `@prisma/client`.
-   **Session**: Always check `session?.user?.id` before accessing user data.
-   **Path Aliases**: Use `@/` for imports (configured in `tsconfig.json`).
-   **Dynamic Routes**: Use `force-dynamic` export for pages that need fresh data on every request.
-   **Toasts**: Import `toast` from `sonner` for notifications.

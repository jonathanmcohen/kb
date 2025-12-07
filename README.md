# Knowledge Base Application

A Notion-like knowledge base with block-based editing, real-time collaboration, and robust authentication.

## Features

- ✅ **Block-Based Editor**: Powered by BlockNote with support for various block types
- ✅ **Hierarchical Documents**: Nested pages with sidebar navigation
- ✅ **Authentication**: Local (email/password) and OIDC (Google, GitHub)
- ✅ **Light/Dark Mode**: System-aware theme support
- ✅ **Document Management**: Create, edit, delete, and archive documents
- ✅ **Search**: Global search across all documents
- ✅ **Admin Portal**: Dashboard with metrics and user management
- 🚧 **S3 Uploads**: Image and file upload support (API ready)
- 🚧 **External API**: REST API with token authentication (structure ready)
- ✅ **Version History**: Automatic snapshots with restore
- ✅ **Exports & Sharing**: Markdown/PDF export and time-limited share links
- ✅ **Docker**: Containerized deployment with GitHub Actions CI/CD

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL
- **ORM**: Prisma
- **Authentication**: NextAuth.js v5
- **Editor**: BlockNote
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: TanStack Query + Zustand

## Prerequisites

- Node.js 20+
- PostgreSQL (or Docker to run it)
- npm

## Setup Instructions

### 1. Clone and Install

```bash
cd kb
npm install
```

### 2. Environment Variables

The `.env` file has been created with default values. Update the following for production:

```env
# Use a full URL, or set DB_* parts instead
DATABASE_URL="postgresql://postgres:password@localhost:5432/kb?schema=public"
# DB_TYPE=postgresql
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASS=password
# DB_NAME=kb
# DB_SCHEMA=public

NEXTAUTH_SECRET="<generate-a-secure-random-string>"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Add OAuth providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GITHUB_ID="your-github-id"
GITHUB_SECRET="your-github-secret"
```

### 3. Start Database

#### Option A: Using Docker
```bash
docker compose up -d
```

#### Option B: Local PostgreSQL
Ensure PostgreSQL is running and create a database named `kb`.

### 4. Run Migrations

For a fresh install or production-like environment, apply committed migrations:

```bash
npx prisma migrate deploy
```

During local development (when you’re evolving the schema), use:

```bash
npx prisma migrate dev
```

### 5. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## Docker Deployment

### Build Image

```bash
docker build -t kb-app .
```

### Run with Docker Compose

```bash
docker compose up
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) automatically:
- Builds the Docker image on push to `main`
- Pushes to GitHub Container Registry (ghcr.io)

To use:
1. Enable GitHub Actions in your repository
2. The workflow will run automatically on push

## Project Structure

```
kb/
├── app/
│   ├── (auth)/                 # Authentication pages
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                 # Main application
│   │   ├── documents/          # Document pages
│   │   └── admin/              # Admin dashboard
│   └── api/                    # API routes
│       ├── auth/
│       ├── documents/
│       └── search/
├── components/
│   ├── editor/                 # BlockNote editor
│   ├── sidebar/                # Navigation sidebar
│   ├── ui/                     # shadcn components
│   └── providers/              # Theme & Query providers
├── lib/
│   ├── auth.ts                 # NextAuth config
│   ├── auth.config.ts          # Auth middleware config
│   └── prisma.ts               # Prisma client
├── prisma/
│   └── schema.prisma           # Database schema
├── docker-compose.yml
├── Dockerfile
└── .github/workflows/ci.yml
```

## Database Schema

- **User**: User accounts with local and OAuth support
- **Account**: OAuth account linking
- **Session**: User sessions
- **Document**: Documents with hierarchy support
- **Comment**: Comments on documents

## API Routes

### Documents
- `GET /api/documents` - List all documents
- `POST /api/documents` - Create document
- `GET /api/documents/[id]` - Get document
- `PATCH /api/documents/[id]` - Update document
- `DELETE /api/documents/[id]` - Delete document

### Search
- `GET /api/search?q=query` - Search documents

### Authentication
- `POST /api/auth/signup` - Create account
- NextAuth.js handles `/api/auth/*` routes

## Development Notes

### OAuth Setup

To enable Google/GitHub login:

1. **Google**: [Create OAuth credentials](https://console.cloud.google.com/apis/credentials)
2. **GitHub**: [Create OAuth app](https://github.com/settings/developers)
3. Add environment variables to `.env`

### Prisma Commands

```bash
# Generate client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Open Prisma Studio
npx prisma studio

# Reset database
npx prisma migrate reset
```

### Full-Text Search

The search API now uses PostgreSQL full-text search. Add the GIN index to keep it fast:

```sql
CREATE INDEX IF NOT EXISTS document_search_idx ON "Document"
USING GIN (
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce(("content"::text), '')), 'B')
);
```

### Version History

Document edits now create snapshots you can browse and restore. Run a migration or apply the table manually:

```sql
CREATE TABLE IF NOT EXISTS "DocumentVersion" (
  "id" text PRIMARY KEY,
  "documentId" text NOT NULL REFERENCES "Document"("id") ON DELETE CASCADE,
  "userId" text NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "content" jsonb,
  "createdAt" timestamp with time zone NOT NULL DEFAULT now(),
  "label" text
);

CREATE INDEX IF NOT EXISTS "DocumentVersion_documentId_idx" ON "DocumentVersion" ("documentId");
CREATE INDEX IF NOT EXISTS "DocumentVersion_userId_idx" ON "DocumentVersion" ("userId");
```

### Share Links & Export

Document share links and exports rely on new columns on `Document`. Apply via Prisma migration or run:

```sql
ALTER TABLE "Document"
    ADD COLUMN IF NOT EXISTS "shareToken" text UNIQUE,
    ADD COLUMN IF NOT EXISTS "shareExpiresAt" timestamp with time zone;
```

Exports:
- `GET /api/documents/:id/export?format=markdown|pdf` (auth required) downloads Markdown or PDF.
- UI: open a document → Export button → choose Markdown/PDF.

Share links:
- `POST /api/documents/:id/share` with `{ "expiresInHours": 24 }` generates a link; UI button available on document page.
- Public view: `/share/:token` (read-only).

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Verify credentials and database exists

### Build Errors
- Clear `.next` folder: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Regenerate Prisma client: `npx prisma generate`

## Roadmap

- [x] Full-text search with PostgreSQL
- [ ] Real-time collaboration with WebSockets
- [ ] S3 integration for file uploads
- [ ] External API with token authentication
- [x] Page history and versioning
- [x] Export to Markdown/PDF
- [ ] Mobile responsive improvements

## License

MIT

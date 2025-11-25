# Project Requirements: Knowledge Base Application

## Overview
Build a web-based knowledge base application similar to Notion, featuring a block-based editor, hierarchical document structure, and robust authentication.

## Core Features

### 1. Content Editing
- **Block-Based Editor**:
  - Support for various block types: Paragraph, Heading (1-3), List (Bullet, Numbered), Checklist, Code, Quote, Divider.
  - Drag-and-drop reordering of blocks.
  - Slash commands (`/`) to insert blocks.
  - Markdown support.
  - **Media & Attachments**:
    - Image uploads, Video embedding, and File attachments.
    - **Storage**: Uploads stored in S3-compatible object storage (AWS S3, MinIO, etc.).
  - **Internal Linking**:
    - Wiki-style linking (`[[`) to other pages.
- **Live Collaboration**:
  - Real-time updates (live editing) using WebSockets or similar technology.
  - Presence indicators (optional for MVP, but good for "live").

### 2. Document Management
- **Hierarchy**: Nested pages/documents.
- **Navigation**: Sidebar navigation tree.
- **Search**: Global search across all documents (title and content).
- **CRUD**: Create, Read, Update, Delete pages.
- **Organization**:
  - Trash/Archive functionality with restore capability.
  - Page History: View and restore previous versions.
  - Export: Export pages to Markdown or PDF.

### 3. Authentication & Authorization
- **Methods**:
  - **Local Auth**: Email/Password registration and login.
  - **OIDC**: Integration with providers (e.g., Google, GitHub, Keycloak).
- **Session Management**: Secure session handling (JWT or Session cookies).

### 4. User Interface
  - **Theming**:
    - Native Light and Dark mode support.
    - System preference detection.
    - Manual toggle.
  - **Visuals**:
    - Page Icons (Emojis) and Cover Images.
  - **Design**:
  - Clean, minimal interface inspired by Notion.
  - Responsive layout for desktop and mobile.

### 5. External API
- **Parity**: Full REST/GraphQL API parity with web interface capabilities.
- **Authentication**: API Keys / Personal Access Tokens for programmatic access.
- **Documentation**: Swagger/OpenAPI documentation.

### 6. Admin Portal
- **User Management**: View, edit, suspend, and delete users.
- **Metrics/Analytics**:
  - Dashboard showing active users, storage usage, document counts, etc.
- **System Configuration**: Manage global settings (e.g., S3 config, OIDC providers) via UI.

## Technical Stack Requirements

### Backend
- **Language/Framework**: Node.js (Next.js API routes or separate Express/NestJS) or Python (FastAPI/Django). *Recommendation: Next.js for full stack.*
- **Database**: PostgreSQL.
- **ORM**: Prisma or Drizzle.

### Frontend
- **Framework**: React (via Next.js).
- **Styling**: Tailwind CSS (for easy theming and responsiveness).
- **State Management**: React Query / Zustand.
- **Editor Framework**: Tiptap, Slate.js, or BlockNote. *Recommendation: BlockNote or Tiptap.*

### Infrastructure
- **Containerization**: Docker support for easy deployment (Postgres + App).
  - *Requirement*: Use minimal base images (e.g., Alpine or Slim variants) to keep container size optimized.
- **CI/CD**: GitHub Actions for automated building and testing.
  - *Requirement*: Build Docker image and push to GitHub Packages (GHCR).
- **Deployment**: Docker Compose for local development and easy deployment.

## Non-Functional Requirements
- **Performance**: Fast load times and low-latency typing experience.
- **Security**: Secure password hashing, input sanitization, protected API endpoints.

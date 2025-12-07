-- Add sharing fields to documents
ALTER TABLE "Document"
ADD COLUMN "shareToken" TEXT,
ADD COLUMN "shareExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "Document_shareToken_key" ON "Document"("shareToken");

-- Create table for document version history
CREATE TABLE "DocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT,

    CONSTRAINT "DocumentVersion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DocumentVersion_documentId_idx" ON "DocumentVersion"("documentId");
CREATE INDEX "DocumentVersion_userId_idx" ON "DocumentVersion"("userId");

ALTER TABLE "DocumentVersion"
ADD CONSTRAINT "DocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentVersion"
ADD CONSTRAINT "DocumentVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

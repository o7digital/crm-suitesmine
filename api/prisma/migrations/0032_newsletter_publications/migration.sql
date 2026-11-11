CREATE TABLE IF NOT EXISTS "NewsletterPublication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "monthKey" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NewsletterPublication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "NewsletterPublication_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "NewsletterPublication_tenantId_campaignId_key" ON "NewsletterPublication"("tenantId", "campaignId");

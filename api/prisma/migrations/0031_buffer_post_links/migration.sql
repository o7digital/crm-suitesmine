CREATE TABLE "BufferPostLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "crmHash" TEXT NOT NULL,
    "remoteHash" TEXT NOT NULL,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BufferPostLink_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BufferPostLink_tenantId_organizationId_eventId_channelId_key" ON "BufferPostLink"("tenantId", "organizationId", "eventId", "channelId");
CREATE UNIQUE INDEX "BufferPostLink_tenantId_organizationId_postId_key" ON "BufferPostLink"("tenantId", "organizationId", "postId");
ALTER TABLE "BufferPostLink" ADD CONSTRAINT "BufferPostLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

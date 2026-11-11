CREATE TABLE IF NOT EXISTS "WebsiteAgenda" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "siteKey" TEXT NOT NULL UNIQUE
);
CREATE TABLE IF NOT EXISTS "WebsiteAgendaMonth" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "agendaId" TEXT NOT NULL REFERENCES "WebsiteAgenda"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "monthKey" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "draft" JSONB NOT NULL,
  "approved" JSONB,
  "approvedAt" TIMESTAMP(3),
  "approvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "WebsiteAgendaMonth_agendaId_monthKey_key" ON "WebsiteAgendaMonth"("agendaId", "monthKey");

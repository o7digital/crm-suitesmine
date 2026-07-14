import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_TENANT_ID = 'demo-suites-mine-hotel';
const DEMO_OWNER_ID = 'demo-suites-mine-owner';
const DEMO_EMAIL = 'demo@suitesmine.local';
const DEMO_PASSWORD = 'DemoHotel2026!';

const stages = [
  { name: 'Newsletter capture', position: 1, probability: 0.1, status: 'OPEN' as const },
  { name: 'Segmented guest', position: 2, probability: 0.25, status: 'OPEN' as const },
  { name: 'Campaign planned', position: 3, probability: 0.45, status: 'OPEN' as const },
  { name: 'Stay follow-up', position: 4, probability: 0.65, status: 'OPEN' as const },
  { name: 'Return booked', position: 5, probability: 1.0, status: 'WON' as const },
  { name: 'No response', position: 6, probability: 0.0, status: 'LOST' as const },
];

const products = [
  { name: 'Weekend Spa Retreat', price: 780, description: 'Two-night wellness package with spa credit.' },
  { name: 'Romantic Suite Upgrade', price: 320, description: 'Suite upgrade, welcome amenity and late checkout.' },
  { name: 'Family Summer Stay', price: 1150, description: 'Three-night family offer with breakfast included.' },
  { name: 'Corporate Long Stay', price: 2400, description: 'Monthly negotiated rate for repeat corporate guests.' },
  { name: 'Return Guest Dinner', price: 140, description: 'Restaurant credit for loyalty reactivation campaigns.' },
];

const clients = [
  {
    firstName: 'Camille',
    name: 'Durand',
    email: 'camille.durand@example.com',
    phone: '+33 6 22 45 10 18',
    company: 'Repeat leisure guest',
    companySector: 'Leisure',
    clientStatus: 'CLIENT',
    notes: 'Visited twice in 2025. Interested in wellness weekends and quiet rooms.',
    deal: 'Spa weekend reactivation',
    value: 1240,
    stage: 'Campaign planned',
    product: 'Weekend Spa Retreat',
    task: 'Send personalized spa weekend newsletter',
  },
  {
    firstName: 'Mateo',
    name: 'Rodriguez',
    email: 'mateo.rodriguez@example.com',
    phone: '+52 55 3488 9021',
    company: 'Corporate traveler',
    companySector: 'Consulting',
    clientStatus: 'PROSPECT',
    notes: 'Monthly business trips, prefers invoice-ready reservations and airport transfer.',
    deal: 'Q4 corporate long-stay package',
    value: 4800,
    stage: 'Segmented guest',
    product: 'Corporate Long Stay',
    task: 'Qualify corporate rate and billing needs',
  },
  {
    firstName: 'Sofia',
    name: 'Mendes',
    email: 'sofia.mendes@example.com',
    phone: '+351 91 224 5710',
    company: 'Family guest',
    companySector: 'Family travel',
    clientStatus: 'CLIENT',
    notes: 'Booked family room last summer. Target with school holiday package.',
    deal: 'Family summer return booking',
    value: 1850,
    stage: 'Stay follow-up',
    product: 'Family Summer Stay',
    task: 'Follow up after family package email open',
  },
  {
    firstName: 'Nadia',
    name: 'Benali',
    email: 'nadia.benali@example.com',
    phone: '+212 6 41 02 67 90',
    company: 'Couple getaway',
    companySector: 'Leisure',
    clientStatus: 'PROSPECT',
    notes: 'Downloaded romantic weekend offer from public landing page.',
    deal: 'Romantic suite upsell',
    value: 960,
    stage: 'Newsletter capture',
    product: 'Romantic Suite Upgrade',
    task: 'Call to confirm preferred dates',
  },
  {
    firstName: 'Jonas',
    name: 'Weber',
    email: 'jonas.weber@example.com',
    phone: '+49 151 4471 8802',
    company: 'Loyalty guest',
    companySector: 'Food and beverage',
    clientStatus: 'CLIENT',
    notes: 'Restaurant-focused guest. High likelihood for dinner credit campaign.',
    deal: 'Return dinner loyalty campaign',
    value: 420,
    stage: 'Return booked',
    product: 'Return Guest Dinner',
    task: 'Prepare welcome-back note for arrival',
  },
];

async function main() {
  await prisma.dealStageHistory.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.dealItem.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.task.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.invoice.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.postSalesCase.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.deal.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.clientCollaborator.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.client.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.product.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.stage.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.pipeline.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.userInvite.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.legalAcceptance.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.googleCalendarConnection.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.subscription.deleteMany({
    where: { OR: [{ tenantId: DEMO_TENANT_ID }, { customerTenantId: DEMO_TENANT_ID }] },
  });
  await prisma.user.deleteMany({ where: { tenantId: DEMO_TENANT_ID } });
  await prisma.tenant.deleteMany({ where: { id: DEMO_TENANT_ID } });

  const tenant = await prisma.tenant.create({
    data: {
      id: DEMO_TENANT_ID,
      name: 'Suites Mine Hotel Demo',
      crmMode: 'B2C',
      industry: 'HOTEL',
      crmDisplayCurrency: 'USD',
      backgroundColor: '#0f172a',
      surfaceColor: '#111827',
      cardColor: '#1f2937',
      foregroundColor: '#f8fafc',
      mutedColor: '#94a3b8',
      accentColor: '#14b8a6',
      accentColor2: '#f59e0b',
    },
  });

  const owner = await prisma.user.create({
    data: {
      id: DEMO_OWNER_ID,
      tenantId: tenant.id,
      email: DEMO_EMAIL,
      name: 'Suites Mine Demo',
      password: await bcrypt.hash(DEMO_PASSWORD, 10),
      role: 'OWNER',
    },
  });

  const pipeline = await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Guest Lifecycle',
      isDefault: true,
      stages: { create: stages.map((stage) => ({ ...stage, tenantId: tenant.id })) },
    },
    include: { stages: true },
  });

  const stageByName = new Map(pipeline.stages.map((stage) => [stage.name, stage]));
  const productByName = new Map<string, { id: string; price: Prisma.Decimal | null }>();

  for (const product of products) {
    const created = await prisma.product.create({
      data: { ...product, tenantId: tenant.id, currency: 'USD', isActive: true },
      select: { id: true, name: true, price: true },
    });
    productByName.set(created.name, created);
  }

  for (const entry of clients) {
    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        ownerUserId: owner.id,
        firstName: entry.firstName,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        company: entry.company,
        companySector: entry.companySector,
        clientStatus: entry.clientStatus,
        notes: entry.notes,
      },
    });

    const stage = stageByName.get(entry.stage);
    if (!stage) throw new Error(`Missing stage ${entry.stage}`);
    const product = productByName.get(entry.product);
    if (!product) throw new Error(`Missing product ${entry.product}`);

    const deal = await prisma.deal.create({
      data: {
        tenantId: tenant.id,
        ownerId: owner.id,
        clientId: client.id,
        pipelineId: pipeline.id,
        stageId: stage.id,
        title: entry.deal,
        value: entry.value,
        currency: 'USD',
        probability: stage.probability,
        expectedCloseDate: new Date('2026-08-15T12:00:00.000Z'),
      },
    });

    await prisma.dealItem.create({
      data: {
        tenantId: tenant.id,
        dealId: deal.id,
        productId: product.id,
        quantity: 1,
        unitPrice: product.price,
      },
    });

    await prisma.task.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        title: entry.task,
        status: entry.stage === 'Return booked' ? 'DONE' : 'PENDING',
        dueDate: new Date('2026-07-21T15:00:00.000Z'),
        amount: entry.value,
        currency: 'USD',
      },
    });
  }

  await prisma.pipeline.create({
    data: {
      tenantId: tenant.id,
      name: 'Post Sales',
      isDefault: false,
      stages: {
        create: [
          { tenantId: tenant.id, name: 'INVOICE Customer', position: 1, probability: 1, status: 'OPEN' },
          { tenantId: tenant.id, name: 'TRANSFER PAYMENT', position: 2, probability: 1, status: 'OPEN' },
        ],
      },
    },
  });

  console.log(`Demo tenant ready: ${tenant.name}`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

const DEMO_TENANT_ID = 'demo-suites-mine-hotel';
const DEMO_OWNER_ID = 'demo-suites-mine-owner';
const DEMO_EMAIL = 'demo@suitesmine.local';
const DEMO_PASSWORD = 'DemoHotel2026!';

const demoStages = [
  { name: 'Newsletter capture', position: 1, probability: 0.1, status: 'OPEN' as const },
  { name: 'Segmented guest', position: 2, probability: 0.25, status: 'OPEN' as const },
  { name: 'Campaign planned', position: 3, probability: 0.45, status: 'OPEN' as const },
  { name: 'Stay follow-up', position: 4, probability: 0.65, status: 'OPEN' as const },
  { name: 'Return booked', position: 5, probability: 1.0, status: 'WON' as const },
  { name: 'No response', position: 6, probability: 0.0, status: 'LOST' as const },
];

const demoClients = [
  ['Camille', 'Durand', 'camille.durand@example.com', 'Spa weekend reactivation', 1240, 'Campaign planned'],
  ['Mateo', 'Rodriguez', 'mateo.rodriguez@example.com', 'Q4 corporate long-stay package', 4800, 'Segmented guest'],
  ['Sofia', 'Mendes', 'sofia.mendes@example.com', 'Family summer return booking', 1850, 'Stay follow-up'],
  ['Nadia', 'Benali', 'nadia.benali@example.com', 'Romantic suite upsell', 960, 'Newsletter capture'],
  ['Jonas', 'Weber', 'jonas.weber@example.com', 'Return dinner loyalty campaign', 420, 'Return booked'],
] as const;

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(data: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new BadRequestException('Email already registered');
    }

    const tenant = await this.prisma.tenant.create({
      data: {
        name: data.tenantName,
        users: {
          create: {
            email: data.email,
            name: data.name,
            password: await this.hashPassword(data.password),
          },
        },
      },
      include: { users: true },
    });

    const user = tenant.users[0];
    const token = this.signUser(user.id, user.tenantId, user.email);
    return { token, user: this.exposeUser(user) };
  }

  async login(data: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(data.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.signUser(user.id, user.tenantId, user.email);
    return { token, user: this.exposeUser(user) };
  }

  async demo() {
    await this.ensureDemoWorkspace();
    const user = await this.prisma.user.findUniqueOrThrow({ where: { email: DEMO_EMAIL } });
    const token = this.signUser(user.id, user.tenantId, user.email);
    return { token, user: this.exposeUser(user) };
  }

  private async ensureDemoWorkspace() {
    await this.prisma.tenant.upsert({
      where: { id: DEMO_TENANT_ID },
      update: {
        name: 'Suites Mine Hotel Demo',
        crmMode: 'B2C',
        industry: 'HOTEL',
        crmDisplayCurrency: 'USD',
      },
      create: {
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

    const owner = await this.prisma.user.upsert({
      where: { email: DEMO_EMAIL },
      update: {
        tenantId: DEMO_TENANT_ID,
        name: 'Suites Mine Demo',
        role: 'OWNER',
      },
      create: {
        id: DEMO_OWNER_ID,
        tenantId: DEMO_TENANT_ID,
        email: DEMO_EMAIL,
        name: 'Suites Mine Demo',
        password: await this.hashPassword(DEMO_PASSWORD),
        role: 'OWNER',
      },
      select: { id: true },
    });

    let pipeline = await this.prisma.pipeline.findFirst({
      where: { tenantId: DEMO_TENANT_ID, name: 'Guest Lifecycle' },
      include: { stages: true },
    });

    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          name: 'Guest Lifecycle',
          isDefault: true,
          stages: { create: demoStages.map((stage) => ({ ...stage, tenantId: DEMO_TENANT_ID })) },
        },
        include: { stages: true },
      });
    } else if (!pipeline.isDefault) {
      await this.prisma.pipeline.updateMany({ where: { tenantId: DEMO_TENANT_ID }, data: { isDefault: false } });
      pipeline = await this.prisma.pipeline.update({
        where: { id: pipeline.id },
        data: { isDefault: true },
        include: { stages: true },
      });
    }

    const stageByName = new Map(pipeline.stages.map((stage) => [stage.name, stage]));
    for (const stage of demoStages) {
      if (!stageByName.has(stage.name)) {
        const created = await this.prisma.stage.create({
          data: { ...stage, tenantId: DEMO_TENANT_ID, pipelineId: pipeline.id },
        });
        stageByName.set(created.name, created);
      }
    }

    const existingDeals = await this.prisma.deal.count({ where: { tenantId: DEMO_TENANT_ID } });
    if (existingDeals > 0) return;

    for (const [firstName, name, email, title, value, stageName] of demoClients) {
      const client = await this.prisma.client.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          ownerUserId: owner.id,
          firstName,
          name,
          email,
          company: 'Hotel guest',
          companySector: 'Hospitality',
          clientStatus: 'CLIENT',
          notes: 'Demo B2C hotel guest record.',
        },
      });
      const stage = stageByName.get(stageName) ?? stageByName.get('Newsletter capture');
      if (!stage) continue;
      await this.prisma.deal.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          ownerId: owner.id,
          clientId: client.id,
          pipelineId: pipeline.id,
          stageId: stage.id,
          title,
          value,
          currency: 'USD',
          probability: stage.probability,
          expectedCloseDate: new Date('2026-08-15T12:00:00.000Z'),
        },
      });
      await this.prisma.task.create({
        data: {
          tenantId: DEMO_TENANT_ID,
          clientId: client.id,
          title: `Follow up ${firstName}`,
          status: stage.status === 'WON' ? 'DONE' : 'PENDING',
          dueDate: new Date('2026-07-21T15:00:00.000Z'),
          amount: value,
          currency: 'USD',
        },
      });
    }
  }

  private signUser(userId: string, tenantId: string, email: string) {
    return this.jwtService.sign({ sub: userId, tenantId, email });
  }

  private async hashPassword(raw: string) {
    const saltRounds = 10;
    return bcrypt.hash(raw, saltRounds);
  }

  private exposeUser(user: { id: string; email: string; name: string; tenantId: string }) {
    const { id, email, name, tenantId } = user;
    return { id, email, name, tenantId };
  }
}

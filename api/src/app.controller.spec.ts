import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  let query: jest.Mock;

  beforeEach(async () => {
    query = jest.fn();
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: {
            $queryRaw: query,
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reports readiness only after querying the CRM schema', async () => {
    query.mockResolvedValue([]);
    await expect(appController.ready()).resolves.toEqual({ ok: true });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('returns 503 without exposing database credentials or errors', async () => {
    query.mockRejectedValue(new Error('private database connection details'));
    await expect(appController.ready()).rejects.toMatchObject({ status: 503, message: 'Database schema is not ready' });
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});

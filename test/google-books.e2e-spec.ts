import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('GoogleBooks (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );

    await app.init();
    dataSource = moduleFixture.get<DataSource>(DataSource);
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await app.close();
  });

  beforeEach(async () => {
    await request(app.getHttpServer()).post('/api/seed');
  });

  it('/api/google-books/search should return 503 or 200 depending on env', async () => {
    const res = await request(app.getHttpServer()).get('/api/google-books/search?q=clean+code');
    expect([200, 503]).toContain(res.status);
  });

  it('/api/google-books/isbn/:isbn should return 503 or 200 depending on env', async () => {
    const res = await request(app.getHttpServer()).get('/api/google-books/isbn/9780132350884');
    expect([200, 503]).toContain(res.status);
  });

  it('/api/google-books/volume/:id should return 503 or 200 depending on env', async () => {
    const res = await request(app.getHttpServer()).get('/api/google-books/volume/any-id');
    expect([200, 503]).toContain(res.status);
  });
});

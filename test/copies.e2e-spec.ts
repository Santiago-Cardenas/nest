import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Copies (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let librarianToken: string;

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

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@icesi.edu.co', password: 'Admin123!' });
    adminToken = adminLogin.body.access_token;

    const librarianLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'librarian@icesi.edu.co', password: 'Librarian123!' });
    librarianToken = librarianLogin.body.access_token;
  });

  describe('/api/copies (GET|POST)', () => {
    it('should list copies', async () => {
      const res = await request(app.getHttpServer()).get('/api/copies').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should list available copies', async () => {
      const res = await request(app.getHttpServer()).get('/api/copies/available').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('should create a copy (librarian)', async () => {
      // get a book id to attach
      const books = await request(app.getHttpServer()).get('/api/books').expect(200);
      const bookId = books.body[0].id;

  const payload = { code: 'COPY-999-1', bookId, status: 'available' };

      const res = await request(app.getHttpServer())
        .post('/api/copies')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send(payload)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.code).toBe(payload.code);
    });

    it('should fail to create copy without auth', () => {
      return request(app.getHttpServer()).post('/api/copies').send({ code: 'NO-AUTH', bookId: 'x' }).expect(401);
    });
  });

  describe('copy lifecycle (GET/:id, PATCH, PATCH status, DELETE)', () => {
    let copyId: string;

    beforeEach(async () => {
      const copies = await request(app.getHttpServer()).get('/api/copies').expect(200);
      copyId = copies.body[0].id;
    });

    it('should get copy by id and check availability endpoint', async () => {
      const res = await request(app.getHttpServer()).get(`/api/copies/${copyId}`).expect(200);
      expect(res.body.id).toBe(copyId);

      const avail = await request(app.getHttpServer()).get(`/api/copies/${copyId}/availability`).expect(200);
      expect(avail.body).toHaveProperty('copyId', copyId);
      expect(avail.body).toHaveProperty('isAvailable');
    });

    it('should update copy (admin)', async () => {
      const update = { code: 'UPDATED-CODE' };
      const res = await request(app.getHttpServer())
        .patch(`/api/copies/${copyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(200);
      expect(res.body.code).toBe(update.code);
    });

    it('should update copy status (librarian)', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/copies/${copyId}/status`)
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({ status: 'maintenance' })
        .expect(200);
      expect(res.body.status).toBe('maintenance');
    });

    it('should delete copy (admin)', async () => {
      await request(app.getHttpServer())
        .delete(`/api/copies/${copyId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      return request(app.getHttpServer()).get(`/api/copies/${copyId}`).expect(404);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Loans (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let studentToken: string;
  let adminToken: string;
  let copyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] }).compile();

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

    const studentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'student@icesi.edu.co', password: 'Student123!' });
    studentToken = studentLogin.body.access_token;

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'admin@icesi.edu.co', password: 'Admin123!' });
    adminToken = adminLogin.body.access_token;

    const copies = await request(app.getHttpServer()).get('/api/copies/available').expect(200);
    copyId = copies.body[0].id;
  });

  describe('/api/loans (POST)', () => {
    it('should create a loan for available copy', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/loans')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.copyId).toBe(copyId);
      expect(res.body.status).toBe('active');
    });

    it('should not allow creating loan for non-available copy', async () => {
      // First loan to make copy borrowed
      await request(app.getHttpServer())
        .post('/api/loans')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId })
        .expect(201);

      // Another user tries to borrow same copy
      const librarianLogin = await request(app.getHttpServer()).post('/api/auth/login').send({ email: 'librarian@icesi.edu.co', password: 'Librarian123!' });
      const librarianToken = librarianLogin.body.access_token;

      return request(app.getHttpServer())
        .post('/api/loans')
        .set('Authorization', `Bearer ${librarianToken}`)
        .send({ copyId })
        .expect(400);
    });

    it('should enforce max 3 active loans per user', async () => {
      // Get three different copies
      const copies = await request(app.getHttpServer()).get('/api/copies/available').expect(200);
      const c1 = copies.body[0].id;
      const c2 = copies.body[1].id;
      const c3 = copies.body[2].id;
      const c4 = copies.body[3].id;

      await request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId: c1 }).expect(201);
      await request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId: c2 }).expect(201);
      await request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId: c3 }).expect(201);

      // Fourth should fail
      return request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId: c4 }).expect(400);
    });
  });

  describe('/api/loans/:id/return (PATCH)', () => {
    it('should return a loan (admin)', async () => {
      const loan = await request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId }).expect(201);

      const res = await request(app.getHttpServer())
        .patch(`/api/loans/${loan.body.id}/return`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.status).toBe('returned');
    });
  });

  describe('/api/loans (GET) admin stats', () => {
    it('should allow admin to list all loans', async () => {
      await request(app.getHttpServer()).post('/api/loans').set('Authorization', `Bearer ${studentToken}`).send({ copyId }).expect(201);
      const res = await request(app.getHttpServer()).get('/api/loans').set('Authorization', `Bearer ${adminToken}`).expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

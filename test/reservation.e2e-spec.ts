import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Reservations (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let studentToken: string;
  let adminToken: string;
  let copyId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
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
    // Seed database
    await request(app.getHttpServer()).post('/api/seed');

    // Login as student
    const studentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'student@icesi.edu.co',
        password: 'Student123!',
      });
    studentToken = studentLogin.body.access_token;

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@icesi.edu.co',
        password: 'Admin123!',
      });
    adminToken = adminLogin.body.access_token;

    // Get an available copy
    const copies = await request(app.getHttpServer())
      .get('/api/copies/available')
      .expect(200);
    copyId = copies.body[0].id;
  });

  describe('/api/reservations (POST)', () => {
    it('should create a new reservation', () => {
      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          copyId,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.status).toBe('pending');
          expect(res.body.copyId).toBe(copyId);
        });
    });

    it('should fail without authentication', () => {
      return request(app.getHttpServer())
        .post('/api/reservations')
        .send({
          copyId,
        })
        .expect(401);
    });

    it('should fail with invalid copyId', () => {
      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          copyId: 'invalid-uuid',
        })
        .expect(400);
    });

    it('should fail when copy already reserved', async () => {
      // Create first reservation
      await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId })
        .expect(201);

      // Try to create second reservation for same copy
      return request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ copyId })
        .expect(400);
    });
  });

  describe('/api/reservations/my (GET)', () => {
    it('should get current user reservations', async () => {
      // Create a reservation
      await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId });

      return request(app.getHttpServer())
        .get('/api/reservations/my')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });
  });

  describe('/api/reservations/:id/cancel (PATCH)', () => {
    it('should cancel own reservation', async () => {
      // Create reservation
      const reservation = await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId });

      // Cancel it
      return request(app.getHttpServer())
        .patch(`/api/reservations/${reservation.body.id}/cancel`)
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('cancelled');
        });
    });

    it('admin should cancel any reservation', async () => {
      // Student creates reservation
      const reservation = await request(app.getHttpServer())
        .post('/api/reservations')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ copyId });

      // Admin cancels it
      return request(app.getHttpServer())
        .patch(`/api/reservations/${reservation.body.id}/cancel`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  describe('/api/reservations/stats (GET)', () => {
    it('should get reservation statistics (admin)', async () => {
      return request(app.getHttpServer())
        .get('/api/reservations/stats')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('total');
          expect(res.body).toHaveProperty('pending');
          expect(res.body).toHaveProperty('fulfilled');
          expect(res.body).toHaveProperty('cancelled');
          expect(res.body).toHaveProperty('expired');
        });
    });

    it('should fail for student', () => {
      return request(app.getHttpServer())
        .get('/api/reservations/stats')
        .set('Authorization', `Bearer ${studentToken}`)
        .expect(403);
    });
  });
});
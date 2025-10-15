import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';

describe('Books (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;

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

    // Login as admin
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        email: 'admin@icesi.edu.co',
        password: 'Admin123!',
      });
    adminToken = adminLogin.body.access_token;
  });

  describe('/api/books (POST)', () => {
    it('should create a new book (admin)', () => {
      const payload = {
        isbn: '9999999999999',
        title: 'Test Driven Development',
        author: 'Kent Beck',
        publisher: 'Addison-Wesley',
        publishedDate: '2003-05-17',
        description: 'TDD book',
        pageCount: 220,
        categories: ['Programming'],
        language: 'en',
      };

      return request(app.getHttpServer())
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.isbn).toBe(payload.isbn);
          expect(res.body.title).toBe(payload.title);
          expect(res.body).not.toHaveProperty('someNonexistentField');
        });
    });

    it('should fail when creating a book with existing ISBN', async () => {
      const payload = {
        isbn: '9780134685991', // exists in seed
        title: 'Duplicate ISBN',
        author: 'Author',
      };

      return request(app.getHttpServer())
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(409);
    });

    it('should fail without authentication', () => {
      const payload = {
        isbn: '1111111111111',
        title: 'No Auth Book',
        author: 'Someone',
      };

      return request(app.getHttpServer()).post('/api/books').send(payload).expect(401);
    });
  });

  describe('/api/books (GET)', () => {
    it('should return a list of books', async () => {
      const res = await request(app.getHttpServer()).get('/api/books').expect(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });
  });

  describe('/api/books/:id (GET|PATCH|DELETE)', () => {
    let bookId: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer()).get('/api/books').expect(200);
      bookId = res.body[0].id;
    });

    it('should get a book by id', () => {
      return request(app.getHttpServer()).get(`/api/books/${bookId}`).expect(200).expect((res) => {
        expect(res.body.id).toBe(bookId);
      });
    });

    it('should return 404 for non-existent book id', () => {
      const fakeId = '123e4567-e89b-12d3-a456-426614174999';
      return request(app.getHttpServer()).get(`/api/books/${fakeId}`).expect(404);
    });

    it('should update a book (admin)', () => {
      const update = { title: 'Updated Title' };
      return request(app.getHttpServer())
        .patch(`/api/books/${bookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(update)
        .expect(200)
        .expect((res) => {
          expect(res.body.title).toBe(update.title);
        });
    });

    it('should delete a book (admin)', async () => {
      // create a fresh book without copies
      const isbn = `${String(Date.now()).slice(0, 13).padEnd(13, '0')}`;
      const payload = {
        isbn,
        title: 'To be deleted',
        author: 'Test',
      };

      const created = await request(app.getHttpServer())
        .post('/api/books')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(payload)
        .expect(201);

      const idToDelete = created.body.id;

      await request(app.getHttpServer())
        .delete(`/api/books/${idToDelete}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      return request(app.getHttpServer()).get(`/api/books/${idToDelete}`).expect(404);
    });
  });
});

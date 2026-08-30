import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../src/schemas/user.schema';

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface CreateUserResponse {
  id: string;
  email: string;
  role: string;
}

describe('Authentication & Authorization Security (e2e)', () => {
  let app: INestApplication<App>;
  let userModel: Model<User>;
  let adminToken: string;
  let cashierToken: string;
  let createdCashierId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    userModel = moduleFixture.get<Model<User>>(getModelToken(User.name));

    // Clean up users collection BEFORE NestJS starts.
    // This allows the automatic AuthController.onModuleInit to execute and seed the database cleanly.
    await userModel.deleteMany({});

    await app.init();
  });

  afterAll(async () => {
    // Clean up test users and close connection
    await userModel.deleteMany({});
    await app.close();
  });

  describe('Unauthenticated Request Rules', () => {
    it('should block unauthenticated access to GET /users', () => {
      return request(app.getHttpServer()).get('/users').expect(401);
    });

    it('should block unauthenticated access to POST /users', () => {
      return request(app.getHttpServer())
        .post('/users')
        .send({
          name: 'Guest',
          email: 'guest@shop.com',
          password: 'password',
          role: 'CASHIER',
        })
        .expect(401);
    });
  });

  describe('Authentication Flow (Login)', () => {
    it('should fail login with invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@jewelryshop.com', password: 'WrongPassword' })
        .expect(401);
    });

    it('should succeed login for seeded Admin user and return JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'admin@jewelryshop.com', password: 'Admin@1234' })
        .expect(201);

      const body = res.body as LoginResponse;
      expect(body.token).toBeDefined();
      expect(body.user.role).toBe('ADMIN');
      adminToken = body.token;
    });
  });

  describe('Admin Authorization Rules (Full Access)', () => {
    it('should allow Admin to list users (GET /users)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should allow Admin to create a new Cashier operator account (POST /users)', async () => {
      const res = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Cashier Operator',
          email: 'cashier@jewelryshop.com',
          password: 'Cashier@1234',
          role: 'CASHIER',
        })
        .expect(201);

      const body = res.body as CreateUserResponse;
      expect(body.id).toBeDefined();
      expect(body.email).toBe('cashier@jewelryshop.com');
      expect(body.role).toBe('CASHIER');
      createdCashierId = body.id;
    });
  });

  describe('Cashier Authorization Rules (Restricted Access)', () => {
    beforeAll(async () => {
      // Log in as the newly created Cashier to retrieve their token
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'cashier@jewelryshop.com', password: 'Cashier@1234' })
        .expect(201);

      const body = res.body as LoginResponse;
      cashierToken = body.token;
    });

    it('should block Cashier from listing user accounts (GET /users)', () => {
      return request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${cashierToken}`)
        .expect(403); // Forbidden
    });

    it('should block Cashier from creating users (POST /users)', () => {
      return request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({
          name: 'Another Cashier',
          email: 'another@jewelryshop.com',
          password: 'Password@123',
          role: 'CASHIER',
        })
        .expect(403);
    });

    it('should block Cashier from editing operator accounts (PUT /users/:id)', () => {
      return request(app.getHttpServer())
        .put(`/users/${createdCashierId}`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ name: 'Hacked Name' })
        .expect(403);
    });
  });
});

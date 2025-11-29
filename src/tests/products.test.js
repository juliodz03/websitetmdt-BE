import request from 'supertest';
import mongoose from 'mongoose';
import { app } from '../server.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

let adminToken;

describe('Product API', () => {
  beforeAll(async () => {
    const mongoUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/ecommerce-test';
    await mongoose.connect(mongoUri);

    // Create admin user
    const admin = await User.create({
      email: 'admin@test.com',
      fullName: 'Admin',
      password: 'Admin@123',
      role: 'admin'
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@test.com',
        password: 'Admin@123'
      });

    adminToken = res.body.token;
  });

  afterAll(async () => {
    await Product.deleteMany({});
    await User.deleteMany({});
    await mongoose.connection.close();
  });

  describe('POST /api/products', () => {
    it('should create a product as admin', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Test Laptop',
          shortDescription: 'A great laptop for testing purposes. High performance and reliable. Perfect for developers. Long battery life. Lightweight design. Modern aesthetics.',
          brand: 'TestBrand',
          category: 'Laptops',
          basePrice: 10000000,
          variants: [
            {
              sku: 'TEST-001',
              name: '8GB RAM / 256GB SSD',
              price: 10000000,
              inventory: 50,
              attributes: { ram: '8GB', storage: '256GB' }
            },
            {
              sku: 'TEST-002',
              name: '16GB RAM / 512GB SSD',
              price: 13000000,
              inventory: 30,
              attributes: { ram: '16GB', storage: '512GB' }
            }
          ],
          images: [
            { url: 'https://example.com/image1.jpg', alt: 'Image 1' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.product.name).toBe('Test Laptop');
    });
  });

  describe('GET /api/products', () => {
    it('should get all products with pagination', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ page: 1, limit: 10 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products).toBeDefined();
      expect(res.body.pagination).toBeDefined();
    });

    it('should filter products by brand', async () => {
      const res = await request(app)
        .get('/api/products')
        .query({ brand: 'TestBrand' });

      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].brand).toBe('TestBrand');
    });
  });
});

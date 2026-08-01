const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../src/data/test-expenses.json');
process.env.EXPENSE_DATA_FILE = DATA_FILE;

const request = require('supertest');
const app = require('../src/server');
const { specs } = require('../src/swagger');

describe('Expense API', () => {
  beforeEach(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify({ expenses: [], categories: [{ id: 'food', name: 'food' }, { id: 'transport', name: 'transport' }] }));
  });

  afterAll(() => {
    if (fs.existsSync(DATA_FILE)) {
      fs.unlinkSync(DATA_FILE);
    }
  });

  describe('POST /api/expenses', () => {
    test('should create an expense with valid data', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(response.body).toHaveProperty('created_at');
      expect(response.body.title).toBe('Lunch');
      expect(response.body.amount).toBe(500);
    });

    test('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ amount: 500, category_id: 'food', date: '01-08-2026' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing field');
    });

    test('should return 400 if amount is invalid', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: -100, category_id: 'food', date: '01-08-2026' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('positive number');
    });

    test('should accept slash dates and store them in dash format', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Coffee', amount: 200, category_id: 'food', date: '02/08/2026' });

      expect(response.statusCode).toBe(201);
      expect(response.body.date).toBe('02-08-2026');
    });

    test('should return 400 if date format is invalid', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Coffee', amount: 200, category_id: 'food', date: '2026/08/02' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('YYYY-MM-DD');
    });

    test('should reject empty, oversized, and overly precise values', async () => {
      const emptyTitle = await request(app).post('/api/expenses').send({
        title: '   ', amount: 10, category_id: 'food', date: '01-08-2026',
      });
      const longTitle = await request(app).post('/api/expenses').send({
        title: 'x'.repeat(101), amount: 10, category_id: 'food', date: '01-08-2026',
      });
      const preciseAmount = await request(app).post('/api/expenses').send({
        title: 'Coffee', amount: 10.123, category_id: 'food', date: '01-08-2026',
      });

      expect(emptyTitle.statusCode).toBe(400);
      expect(longTitle.statusCode).toBe(400);
      expect(preciseAmount.statusCode).toBe(400);
    });

    test('should support the original assignment payload', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Legacy Lunch', amount: 500, category: 'legacy-food', date: '2026-08-01' });

      expect(response.statusCode).toBe(201);
      expect(response.body.category).toBe('legacy-food');
      expect(response.body.date).toBe('2026-08-01');
    });
  });

  describe('PUT /api/expenses/:id', () => {
    test('should update an expense and preserve created_at', async () => {
      const createResponse = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });
      const originalCreatedAt = createResponse.body.created_at;

      const updateResponse = await request(app)
        .put(`/api/expenses/${createResponse.body.id}`)
        .send({ title: 'Dinner', amount: 800, category_id: 'food', date: '02/08/2026' });

      expect(updateResponse.statusCode).toBe(200);
      expect(updateResponse.body.title).toBe('Dinner');
      expect(updateResponse.body.amount).toBe(800);
      expect(updateResponse.body.date).toBe('02-08-2026');
      expect(updateResponse.body.created_at).toBe(originalCreatedAt);
    });

    test('should return 400 for invalid update data', async () => {
      const createResponse = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });

      const response = await request(app)
        .put(`/api/expenses/${createResponse.body.id}`)
        .send({ title: 'Lunch', amount: 0, category_id: 'food', date: '01-08-2026' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('positive number');
    });

    test('should return 404 for an unknown expense', async () => {
      const response = await request(app)
        .put('/api/expenses/nonexistent-id')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('GET /api/expenses', () => {
    test('should return empty array when no expenses exist', async () => {
      const response = await request(app).get('/api/expenses');

      expect(response.statusCode).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    test('should return all expenses', async () => {
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category_id: 'transport', date: '01-08-2026' });

      const response = await request(app).get('/api/expenses');

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });

    test('should support combined search, date, and amount filters', async () => {
      await request(app).post('/api/expenses').send({
        title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026',
      });
      await request(app).post('/api/expenses').send({
        title: 'Dinner', amount: 800, category_id: 'food', date: '15-08-2026',
      });

      const response = await request(app).get(
        '/api/expenses?category_id=food&search=lunch&from_date=01-08-2026&to_date=10-08-2026&min_amount=400&max_amount=600',
      );

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Lunch');
    });

    test('should reject invalid filter ranges', async () => {
      const response = await request(app).get('/api/expenses?min_amount=500&max_amount=100');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('min_amount');
    });

    test('should support the original category query filter', async () => {
      await request(app).post('/api/expenses').send({
        title: 'Legacy Lunch', amount: 500, category: 'legacy-food', date: '2026-08-01',
      });

      const response = await request(app).get('/api/expenses?category=legacy-food');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveLength(1);
    });
  });

  describe('GET /health', () => {
    test('should report healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.statusCode).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('Category API', () => {
    test('should create and list a category', async () => {
      const createResponse = await request(app)
        .post('/api/categories')
        .send({ name: 'Entertainment' });

      expect(createResponse.statusCode).toBe(201);
      expect(createResponse.body.name).toBe('Entertainment');

      const listResponse = await request(app).get('/api/categories');
      expect(listResponse.body).toHaveLength(3);
    });

    test('should update a category', async () => {
      const response = await request(app)
        .put('/api/categories/food')
        .send({ name: 'Meals' });

      expect(response.statusCode).toBe(200);
      expect(response.body.name).toBe('Meals');
    });

    test('should update category names on linked expenses', async () => {
      const expenseResponse = await request(app).post('/api/expenses').send({
        title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026',
      });

      await request(app).put('/api/categories/food').send({ name: 'Meals' });
      const response = await request(app).get('/api/expenses');

      expect(response.statusCode).toBe(200);
      expect(response.body.find((expense) => expense.id === expenseResponse.body.id).category).toBe('Meals');
    });

    test('should reject duplicate category names', async () => {
      const response = await request(app)
        .post('/api/categories')
        .send({ name: ' FOOD ' });

      expect(response.statusCode).toBe(409);
    });

    test('should reject deleting a category used by an expense', async () => {
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });

      const response = await request(app).delete('/api/categories/food');
      expect(response.statusCode).toBe(409);
    });

    test('should delete an unused category', async () => {
      const response = await request(app).delete('/api/categories/transport');

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toContain('deleted');
    });
  });

  describe('Error handling and Swagger', () => {
    test('should reject malformed JSON', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .set('Content-Type', 'application/json')
        .send('{ invalid json');

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe('Invalid JSON request body');
    });

    test('should expose Swagger UI and documented paths', async () => {
      const response = await request(app).get('/api-docs/');

      expect(response.statusCode).toBe(200);
      expect(response.text).toContain('swagger-ui');
      expect(specs.paths).toHaveProperty('/api/categories');
      expect(specs.paths).toHaveProperty('/api/expenses');
      expect(specs.paths).toHaveProperty('/health');
    });
  });

  describe('GET /api/expenses?category=X', () => {
    test('should filter expenses by category', async () => {
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Dinner', amount: 800, category_id: 'food', date: '01-08-2026' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category_id: 'transport', date: '01-08-2026' });

      const response = await request(app).get('/api/expenses?category_id=food');

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every((expense) => expense.category_id === 'food')).toBe(true);
    });

    test('should return empty array if no expenses match category', async () => {
      const response = await request(app).get('/api/expenses?category=nonexistent');

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/expenses/totals', () => {
    test('should return zero totals when no expenses exist', async () => {
      const response = await request(app).get('/api/expenses/totals');

      expect(response.statusCode).toBe(200);
      expect(response.body.totalOverall).toBe(0);
      expect(Object.keys(response.body.byCategory).length).toBe(0);
    });

    test('should calculate totals correctly', async () => {
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Dinner', amount: 800, category_id: 'food', date: '01-08-2026' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category_id: 'transport', date: '01-08-2026' });

      const response = await request(app).get('/api/expenses/totals');

      expect(response.statusCode).toBe(200);
      expect(response.body.totalOverall).toBe(1600);
      expect(response.body.byCategory.food).toBe(1300);
      expect(response.body.byCategory.transport).toBe(300);
    });

    test('should calculate totals using legacy category names', async () => {
      await request(app).post('/api/expenses').send({
        title: 'Legacy Lunch', amount: 500, category: 'food', date: '2026-08-01',
      });

      const response = await request(app).get('/api/expenses/totals');

      expect(response.body.byCategory.food).toBe(500);
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    test('should delete an expense by id', async () => {
      const createResponse = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category_id: 'food', date: '01-08-2026' });

      const deleteResponse = await request(app)
        .delete(`/api/expenses/${createResponse.body.id}`);

      expect(deleteResponse.statusCode).toBe(200);
      expect(deleteResponse.body.message).toContain('deleted');

      const getResponse = await request(app).get('/api/expenses');
      expect(getResponse.body.length).toBe(0);
    });

    test('should return 404 if expense not found', async () => {
      const response = await request(app).delete('/api/expenses/nonexistent-id');

      expect(response.statusCode).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});



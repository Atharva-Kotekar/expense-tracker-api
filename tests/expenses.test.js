const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/test-expenses.json');
process.env.EXPENSE_DATA_FILE = DATA_FILE;

const request = require('supertest');
const app = require('../src/server');

describe('Expense API', () => {
  beforeEach(() => {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
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
        .send({ title: 'Lunch', amount: 500, category: 'food', date: '2026-08-01' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Lunch');
      expect(response.body.amount).toBe(500);
    });

    test('should return 400 if title is missing', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ amount: 500, category: 'food', date: '2026-08-01' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('Missing field');
    });

    test('should return 400 if amount is invalid', async () => {
      const response = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: -100, category: 'food', date: '2026-08-01' });

      expect(response.statusCode).toBe(400);
      expect(response.body.error).toContain('positive number');
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
        .send({ title: 'Lunch', amount: 500, category: 'food', date: '2026-08-01' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category: 'transport', date: '2026-08-01' });

      const response = await request(app).get('/api/expenses');

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
    });
  });

  describe('GET /api/expenses?category=X', () => {
    test('should filter expenses by category', async () => {
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category: 'food', date: '2026-08-01' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Dinner', amount: 800, category: 'food', date: '2026-08-01' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category: 'transport', date: '2026-08-01' });

      const response = await request(app).get('/api/expenses?category=food');

      expect(response.statusCode).toBe(200);
      expect(response.body.length).toBe(2);
      expect(response.body.every((expense) => expense.category === 'food')).toBe(true);
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
        .send({ title: 'Lunch', amount: 500, category: 'food', date: '2026-08-01' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Dinner', amount: 800, category: 'food', date: '2026-08-01' });
      await request(app)
        .post('/api/expenses')
        .send({ title: 'Uber', amount: 300, category: 'transport', date: '2026-08-01' });

      const response = await request(app).get('/api/expenses/totals');

      expect(response.statusCode).toBe(200);
      expect(response.body.totalOverall).toBe(1600);
      expect(response.body.byCategory.food).toBe(1300);
      expect(response.body.byCategory.transport).toBe(300);
    });
  });

  describe('DELETE /api/expenses/:id', () => {
    test('should delete an expense by id', async () => {
      const createResponse = await request(app)
        .post('/api/expenses')
        .send({ title: 'Lunch', amount: 500, category: 'food', date: '2026-08-01' });

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

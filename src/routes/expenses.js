const express = require('express');
const router = express.Router();
const {
  generateExpenseId,
  normalizeDate,
  validateExpense,
  readExpenses,
  writeExpenses,
  readCategories,
} = require('../models/expense');

/**
 * @swagger
 * /api/expenses:
 *   post:
 *     summary: Create a new expense
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount, category_id, date]
 *             properties:
 *               title: { type: string, example: Lunch }
 *               amount: { type: number, example: 500 }
 *               category_id: { type: string, example: abc123 }
 *               date: { type: string, example: '01-08-2026' }
 *     responses:
 *       201: { description: Expense created successfully }
 *       400: { description: Invalid input }
 */
router.post('/', (req, res) => {
  const { title, amount, category_id, date } = req.body;
  const expenseData = { title, amount, category_id, date };
  const validation = validateExpense(expenseData);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (!readCategories().some((category) => category.id === category_id)) {
    return res.status(400).json({ error: 'Category not found' });
  }

  const newExpense = {
    id: generateExpenseId(),
    title,
    amount,
    category_id,
    date: normalizeDate(date),
    created_at: new Date().toISOString(),
  };

  const expenses = readExpenses();
  expenses.push(newExpense);
  writeExpenses(expenses);

  res.status(201).json(newExpense);
});

/**
 * @swagger
 * /api/expenses:
 *   get:
 *     summary: Get all expenses
 *     parameters:
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *         required: false
 *         description: Filter expenses by category ID
 *     responses:
 *       200: { description: List of expenses }
 */
router.get('/', (req, res) => {
  const expenses = readExpenses();
  const categoryId = req.query.category_id;

  if (categoryId) {
    return res.json(expenses.filter((expense) => expense.category_id === categoryId));
  }

  res.json(expenses);
});

/**
 * @swagger
 * /api/expenses/totals:
 *   get:
 *     summary: Calculate expense totals
 *     responses:
 *       200: { description: Totals calculated successfully }
 */
router.get('/totals', (req, res) => {
  const expenses = readExpenses();
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = {};

  expenses.forEach((expense) => {
    if (!byCategory[expense.category_id]) {
      byCategory[expense.category_id] = 0;
    }
    byCategory[expense.category_id] += expense.amount;
  });

res.json({ totalOverall: total, byCategory });
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   put:
 *     summary: Update an expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount, category_id, date]
 *             properties:
 *               title: { type: string, example: Dinner }
 *               amount: { type: number, example: 800 }
 *               category_id: { type: string, example: abc123 }
 *               date: { type: string, example: '02/08/2026' }
 *     responses:
 *       200: { description: Expense updated successfully }
 *       400: { description: Invalid input }
 *       404: { description: Expense not found }
 */
router.put('/:id', (req, res) => {
  const expenses = readExpenses();
  const index = expenses.findIndex((expense) => expense.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  const { title, amount, category_id, date } = req.body;
  const expenseData = { title, amount, category_id, date };
  const validation = validateExpense(expenseData);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  if (!readCategories().some((category) => category.id === category_id)) {
    return res.status(400).json({ error: 'Category not found' });
  }

  const updatedExpense = {
    ...expenses[index],
    title,
    amount,
    category_id,
    date: normalizeDate(date),
    created_at: expenses[index].created_at || new Date().toISOString(),
  };

  expenses[index] = updatedExpense;
  writeExpenses(expenses);

  res.json(updatedExpense);
});

/**
 * @swagger
 * /api/expenses/{id}:
 *   delete:
 *     summary: Delete an expense
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Expense deleted successfully }
 *       404: { description: Expense not found }
 */
router.delete('/:id', (req, res) => {
  const expenses = readExpenses();
  const index = expenses.findIndex((expense) => expense.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Expense not found' });
  }

  expenses.splice(index, 1);
  writeExpenses(expenses);

  res.json({ message: 'Expense deleted successfully' });
});

module.exports = router;

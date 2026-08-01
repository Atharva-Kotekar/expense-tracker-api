const express = require('express');
const router = express.Router();
const {
  generateExpenseId,
  normalizeDate,
  dateToComparable,
  validateExpense,
  readExpenses,
  writeExpenses,
  readCategories,
  writeCategories,
} = require('../models/expense');

function resolveCategory(categoryName, categoryId) {
  const categories = readCategories();

  if (categoryId) {
    const category = categories.find((item) => item.id === categoryId);
    return category ? { category, categories } : null;
  }

  const name = categoryName.trim();
  let category = categories.find((item) => item.name.toLowerCase() === name.toLowerCase());

  if (!category) {
    category = { id: generateExpenseId(), name };
    categories.push(category);
    writeCategories(categories);
  }

  return { category, categories };
}

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
 *             required: [title, amount, category, date]
 *             properties:
 *               title: { type: string, example: Lunch }
 *               amount: { type: number, example: 500 }
 *               category: { type: string, example: food }
 *               category_id: { type: string, description: Optional category identifier }
 *               date: { type: string, example: '01-08-2026' }
 *     responses:
 *       201: { description: Expense created successfully }
 *       400: { description: Invalid input }
 */
router.post('/', (req, res) => {
  const { title, amount, category, category_id, date } = req.body;
  const expenseData = { title, amount, category, category_id, date };
  const validation = validateExpense(expenseData);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const categoryResult = resolveCategory(category, category_id);
  if (!categoryResult) {
    return res.status(400).json({ error: 'Category not found' });
  }

  const newExpense = {
    id: generateExpenseId(),
    title,
    amount,
    category_id: categoryResult.category.id,
    category: category !== undefined ? category.trim() : categoryResult.category.name,
    date: normalizeDate(date),
    created_at: new Date().toISOString(),
  };

  if (category !== undefined) newExpense.category = category.trim();

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
 *         name: category
 *         schema: { type: string }
 *         required: false
 *         description: Filter expenses by category name
 *       - in: query
 *         name: category_id
 *         schema: { type: string }
 *         description: Filter expenses by category ID
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search expense titles
 *       - in: query
 *         name: from_date
 *         schema: { type: string, example: '01-08-2026' }
 *       - in: query
 *         name: to_date
 *         schema: { type: string, example: '31-08-2026' }
 *       - in: query
 *         name: min_amount
 *         schema: { type: number, example: 100 }
 *       - in: query
 *         name: max_amount
 *         schema: { type: number, example: 1000 }
 *     responses:
 *       200: { description: List of expenses }
 */
router.get('/', (req, res) => {
  const expenses = readExpenses();
  const { category_id: categoryId, category: categoryName, search, from_date: fromDate, to_date: toDate } = req.query;
  const minAmount = req.query.min_amount === undefined ? null : Number(req.query.min_amount);
  const maxAmount = req.query.max_amount === undefined ? null : Number(req.query.max_amount);
  const fromComparable = fromDate ? dateToComparable(fromDate) : null;
  const toComparable = toDate ? dateToComparable(toDate) : null;

  if ((fromDate && !fromComparable) || (toDate && !toComparable)) {
    return res.status(400).json({ error: 'Date filters must use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY format' });
  }
  if ((minAmount !== null && (!Number.isFinite(minAmount) || minAmount < 0)) ||
      (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < 0))) {
    return res.status(400).json({ error: 'Amount filters must be non-negative numbers' });
  }
  if (minAmount !== null && maxAmount !== null && minAmount > maxAmount) {
    return res.status(400).json({ error: 'min_amount cannot exceed max_amount' });
  }

  const filtered = expenses.filter((expense) => {
    const expenseDate = dateToComparable(expense.date);
    return (!categoryId || expense.category_id === categoryId) &&
      (!categoryName || expense.category?.toLowerCase() === categoryName.toLowerCase() ||
        expense.category_id === categoryName) &&
      (!search || expense.title.toLowerCase().includes(search.toLowerCase())) &&
      (!fromComparable || expenseDate >= fromComparable) &&
      (!toComparable || expenseDate <= toComparable) &&
      (minAmount === null || expense.amount >= minAmount) &&
      (maxAmount === null || expense.amount <= maxAmount);
  });

  res.json(filtered);
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
    const categoryKey = expense.category || expense.category_id;
    if (!byCategory[categoryKey]) {
      byCategory[categoryKey] = 0;
    }
    byCategory[categoryKey] += expense.amount;
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
 *             required: [title, amount, category, date]
 *             properties:
 *               title: { type: string, example: Dinner }
 *               amount: { type: number, example: 800 }
 *               category: { type: string, example: food }
 *               category_id: { type: string, description: Optional category identifier }
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

  const { title, amount, category, category_id, date } = req.body;
  const expenseData = { title, amount, category, category_id, date };
  const validation = validateExpense(expenseData);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const categoryResult = resolveCategory(category, category_id);
  if (!categoryResult) {
    return res.status(400).json({ error: 'Category not found' });
  }

  const updatedExpense = {
    ...expenses[index],
    title,
    amount,
    category_id: categoryResult.category.id,
    category: category !== undefined ? category.trim() : categoryResult.category.name,
    date: normalizeDate(date),
    created_at: expenses[index].created_at || new Date().toISOString(),
  };

  if (category !== undefined) {
    updatedExpense.category = category.trim();
  } else {
    delete updatedExpense.category;
  }

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

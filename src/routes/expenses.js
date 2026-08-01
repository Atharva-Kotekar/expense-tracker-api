const express = require('express');
const router = express.Router();
const {
  generateExpenseId,
  validateExpense,
  readExpenses,
  writeExpenses,
} = require('../models/expense');

router.post('/', (req, res) => {
  const { title, amount, category, date } = req.body;
  const expenseData = { title, amount, category, date };
  const validation = validateExpense(expenseData);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const newExpense = {
    id: generateExpenseId(),
    title,
    amount,
    category,
    date,
  };

  const expenses = readExpenses();
  expenses.push(newExpense);
  writeExpenses(expenses);

  res.status(201).json(newExpense);
});

router.get('/', (req, res) => {
  const expenses = readExpenses();
  const category = req.query.category;

  if (category) {
    return res.json(expenses.filter((expense) => expense.category === category));
  }

  res.json(expenses);
});

router.get('/totals', (req, res) => {
  const expenses = readExpenses();
  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const byCategory = {};

  expenses.forEach((expense) => {
    if (!byCategory[expense.category]) {
      byCategory[expense.category] = 0;
    }
    byCategory[expense.category] += expense.amount;
  });

  res.json({ totalOverall: total, byCategory });
});

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

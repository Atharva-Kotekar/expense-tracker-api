const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_FILE = process.env.EXPENSE_DATA_FILE || path.join(__dirname, '../data/expenses.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify([]));
  }
}

function generateExpenseId() {
  return crypto.randomUUID();
}

function normalizeDate(date) {
  const match = /^(\d{2})([-/])(\d{2})\2(\d{4})$/.exec(date);

  if (!match) {
    return null;
  }

  const [, day, , month, year] = match;
  const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));

  if (
    parsedDate.getUTCFullYear() !== Number(year) ||
    parsedDate.getUTCMonth() !== Number(month) - 1 ||
    parsedDate.getUTCDate() !== Number(day)
  ) {
    return null;
  }

  return `${day}-${month}-${year}`;
}

function validateExpense(expense) {
  const required = ['title', 'amount', 'category_id', 'date'];

  for (const field of required) {
    if (expense[field] === undefined || expense[field] === null || expense[field] === '') {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  if (typeof expense.amount !== 'number' || expense.amount <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }

  if (!normalizeDate(expense.date)) {
    return { valid: false, error: 'Date must use DD-MM-YYYY or DD/MM/YYYY format' };
  }

  return { valid: true };
}

function readExpenses() {
  return readStore().expenses;
}

function writeExpenses(expenses) {
  const store = readStore();
  store.expenses = expenses;
  writeStore(store);
}

function readStore() {
  ensureDataFile();
  const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));

  if (Array.isArray(data)) {
    return { expenses: data, categories: [] };
  }

  return {
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    categories: Array.isArray(data.categories) ? data.categories : [],
  };
}

function writeStore(store) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

function readCategories() {
  return readStore().categories;
}

function writeCategories(categories) {
  const store = readStore();
  store.categories = categories;
  writeStore(store);
}

function validateCategory(category) {
  if (!category || typeof category.name !== 'string' || !category.name.trim()) {
    return { valid: false, error: 'Category name is required' };
  }

  return { valid: true };
}

module.exports = {
  generateExpenseId,
  normalizeDate,
  validateExpense,
  readExpenses,
  writeExpenses,
  readStore,
  writeStore,
  readCategories,
  writeCategories,
  validateCategory,
};

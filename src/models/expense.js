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
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    const parsedDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
    if (
      parsedDate.getUTCFullYear() === Number(year) &&
      parsedDate.getUTCMonth() === Number(month) - 1 &&
      parsedDate.getUTCDate() === Number(day)
    ) {
      return date;
    }
    return null;
  }

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

function dateToComparable(date) {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (isoMatch) return `${isoMatch[1]}${isoMatch[2]}${isoMatch[3]}`;

  const normalized = normalizeDate(date);
  if (!normalized) return null;

  const [day, month, year] = normalized.split('-');
  return `${year}${month}${day}`;
}

function validateExpense(expense) {
  const required = ['title', 'amount', 'date'];

  for (const field of required) {
    if (expense[field] === undefined || expense[field] === null || expense[field] === '') {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  if (typeof expense.amount !== 'number' || expense.amount <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }

  if (Math.round(expense.amount * 100) !== expense.amount * 100) {
    return { valid: false, error: 'Amount must have at most two decimal places' };
  }

  if (typeof expense.title !== 'string' || !expense.title.trim()) {
    return { valid: false, error: 'Title cannot be empty' };
  }

  if ((!expense.category_id || typeof expense.category_id !== 'string') &&
      (!expense.category || typeof expense.category !== 'string' || !expense.category.trim())) {
    return { valid: false, error: 'Missing field: category' };
  }

  if (expense.title.trim().length > 100) {
    return { valid: false, error: 'Title must be 100 characters or fewer' };
  }

  if (!normalizeDate(expense.date)) {
    return { valid: false, error: 'Date must use YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY format' };
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

  if (category.name.trim().length > 50) {
    return { valid: false, error: 'Category name must be 50 characters or fewer' };
  }

  return { valid: true };
}

module.exports = {
  generateExpenseId,
  normalizeDate,
  dateToComparable,
  validateExpense,
  readExpenses,
  writeExpenses,
  readStore,
  writeStore,
  readCategories,
  writeCategories,
  validateCategory,
};

const fs = require('fs');
const path = require('path');

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
  return Date.now().toString();
}

function validateExpense(expense) {
  const required = ['title', 'amount', 'category', 'date'];

  for (const field of required) {
    if (!expense[field]) {
      return { valid: false, error: `Missing field: ${field}` };
    }
  }

  if (typeof expense.amount !== 'number' || expense.amount <= 0) {
    return { valid: false, error: 'Amount must be a positive number' };
  }

  return { valid: true };
}

function readExpenses() {
  ensureDataFile();
  const data = fs.readFileSync(DATA_FILE, 'utf-8');
  return JSON.parse(data);
}

function writeExpenses(expenses) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(expenses, null, 2));
}

module.exports = {
  generateExpenseId,
  validateExpense,
  readExpenses,
  writeExpenses,
};

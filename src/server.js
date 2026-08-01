const express = require('express');
const cors = require('cors');
const expensesRouter = require('./routes/expenses');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.use('/api/expenses', expensesRouter);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });

  // Keep the CLI process attached while the server is running.
  process.stdin.resume();

  server.on('error', (error) => {
    console.error('Server failed to start:', error.message);
    process.exitCode = 1;
  });
}

module.exports = app;

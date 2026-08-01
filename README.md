# Expense Tracker API

A file-backed Express REST API for managing personal expenses. It implements the assignment requirements and adds category management, search/filtering, validation, timestamps, and Swagger documentation.

## Setup

Requirements: Node.js 14+ and npm.

```bash
npm install
npm start
```

The server runs at `http://localhost:3000`.

Run the test suite:

```bash
npm test
```

Interactive API documentation is available at:

`http://localhost:3000/api-docs/`

## Data storage

Data is stored in `src/data/expenses.json`:

```json
{
  "expenses": [],
  "categories": []
}
```

The original assignment field names are used by the primary expense API: `id`, `title`, `amount`, `category`, and `date`.

The optional `category_id` field links an expense to the separate categories collection. The API accepts both `category` and `category_id` for backward compatibility and includes `category` in expense responses.

When you rename a category, all linked expenses automatically reflect the new name.

## Date formats

The API accepts:

- `YYYY-MM-DD`, such as `2026-08-01` (assignment-compatible format)
- `DD-MM-YYYY`, such as `01-08-2026`
- `DD/MM/YYYY`, such as `01/08/2026`

Dates submitted in the DD formats are stored as `DD-MM-YYYY`. ISO dates are preserved for compatibility with the original assignment format.

## Required assignment endpoints

## Quick Start Example

With the server running, try the original assignment workflow:

```bash
# Create an expense
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"title":"Lunch","amount":500,"category":"food","date":"2026-08-01"}'

# View all expenses
curl http://localhost:3000/api/expenses

# Get totals
curl http://localhost:3000/api/expenses/totals

# Filter by category
curl "http://localhost:3000/api/expenses?category=food"
```

### Create an expense

```http
POST /api/expenses
Content-Type: application/json
```

```json
{
  "title": "Lunch",
  "amount": 500,
  "category": "food",
  "date": "2026-08-01"
}
```

Returns `201 Created` with the created expense, UUID, and `created_at` timestamp.

### List expenses

```http
GET /api/expenses
```

### Filter by category

```http
GET /api/expenses?category=food
```

You can also use the dedicated category endpoint:

```http
GET /api/expenses/category/food
```

### Calculate totals

```http
GET /api/expenses/totals
```

Example:

```json
{
  "totalOverall": 800,
  "byCategory": {
    "food": 500,
    "transport": 300
  }
}
```

### Delete an expense

```http
DELETE /api/expenses/:id
```

## Additional endpoints

### Health check

```http
GET /health
```

Returns:

```json
{
  "status": "ok"
}
```

### Update an expense

```http
PUT /api/expenses/:id
Content-Type: application/json
```

```json
{
  "title": "Dinner",
  "amount": 800,
  "category": "food",
  "date": "01-08-2026"
}
```

`created_at` is preserved during updates.

### Category management

```http
POST /api/categories
GET /api/categories
PUT /api/categories/:id
DELETE /api/categories/:id
```

Create a category:

```json
{
  "name": "food"
}
```

Category names are required, limited to 50 characters, and unique case-insensitively. A category used by an expense cannot be deleted.

## Search and filtering

Filters can be combined:

```http
GET /api/expenses?category=food&search=lunch&from_date=01-08-2026&to_date=31-08-2026&min_amount=100&max_amount=1000
```

Supported query parameters:

- `category` — filter by the assignment-compatible category name
- `category_id` — filter by category ID
- `search` — case-insensitive title search
- `from_date` and `to_date` — inclusive date range
- `min_amount` and `max_amount` — inclusive amount range

Pagination is intentionally not included because it was outside the assignment scope.

## Validation and errors

All errors use this format:

```json
{
  "error": "Error message"
}
```

Validation includes:

- Non-empty titles, maximum 100 characters
- Positive amounts with at most two decimal places
- Required category and valid category IDs when `category_id` is used
- Valid supported date formats
- Duplicate category prevention

Malformed JSON returns `400 Bad Request` with a consistent error response. Unexpected file or server errors return `500 Internal Server Error`.

## Project structure

```text
expense-tracker-api/
├── src/
│   ├── server.js
│   ├── swagger.js
│   ├── models/expense.js
│   ├── routes/expenses.js
│   ├── routes/categories.js
│   └── data/expenses.json
├── tests/expenses.test.js
├── README.md
├── AI_NOTES.md
├── package.json
└── package-lock.json
```

## Testing

The Jest suite contains 32 tests covering the core API, categories, CRUD operations, filtering, date and amount validation, error handling, Swagger, category rename synchronization, the dedicated category endpoint, and the original assignment payload format. Tests use an isolated JSON file and do not modify production data.

```bash
npm test
```

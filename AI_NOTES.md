# AI Notes

## AI tools used

### Claude 

Claude was used for planning and review guidance. It helped break the work into phases, suggested API and testing refinements, and highlighted risks around the assignment's automated evaluation requirements.

### Codex(VScode Extension)

Codex was used to inspect the repository, generate and edit Express/Jest/Swagger code, diagnose failures, and run local checks. It also helped turn the original JSON-array implementation into a two-collection format while retaining compatibility with the assignment API.

## AI-generated work versus my contribution

AI generated or substantially assisted with:

- Express route and model scaffolding
- JSON storage helpers and validation patterns
- Jest/Supertest test structure and test cases
- Swagger/OpenAPI configuration and JSDoc templates
- README and API example drafts
- Debugging suggestions for test data isolation, date parsing, and route compatibility

My role was to build the initial structure for the project(baseline), direct the feature set, review the generated changes, decide which suggestions fit the assignment, and validate the resulting API. In particular, I chose to keep the original assignment payload as the primary API contract:

```json
{
  "title": "Lunch",
  "amount": 500,
  "category": "food",
  "date": "2026-08-01"
}
```

while also supporting the optional `category_id` relationship and additional category endpoints.

## How AI assistance was used in the implementation

### Initial API and storage design

The initial API was generated around the assignment's required expense operations: create, list, category filtering, totals, and deletion. The file-storage model was built with synchronous JSON reads and writes because the assignment permits local JSON storage and does not require a database.

As the project grew, AI-assisted changes introduced a two-collection JSON structure:

```json
{
  "expenses": [],
  "categories": []
}
```

The storage layer still reads the original array-only format, so existing expense data can be interpreted without breaking the API.

### Backward compatibility decision

Adding a category collection initially introduced `category_id`, but the assignment explicitly specifies `category`. AI review identified that an automated evaluator could submit the original payload and fail if only `category_id` were accepted.

The resulting compatibility design is:

- `category` is the primary assignment-compatible field.
- `category_id` is optional and supports the category relationship.
- An expense submitted with `category` creates or reuses a matching category record.
- Both `?category=food` and `?category_id=<id>` filters work.
- ISO dates (`YYYY-MM-DD`) and both day-first formats are accepted.
- Totals retain category-name keys such as `byCategory.food` for the original API contract.

### File-level AI assistance

| File or area | AI-assisted work | Review and adjustment performed |
| --- | --- | --- |
| `src/models/expense.js` | JSON storage, UUID generation, date parsing, validation helpers | Added support for three date formats, validation limits, category compatibility, and legacy array reads. |
| `src/routes/expenses.js` | Express route structure, CRUD handlers, filtering logic | Preserved the original assignment payload, added category resolution, combined filters, timestamps, and consistent error responses. |
| `src/routes/categories.js` | Category CRUD structure | Added duplicate prevention, protection against deleting referenced categories, and synchronization of renamed categories to linked expenses. |
| `src/server.js` | Express middleware and route mounting | Added malformed-JSON handling, health endpoint, Swagger wiring, and a server-start error listener. |
| `src/swagger.js` | Swagger configuration template | Corrected Windows path handling and verified generated OpenAPI paths. |
| `tests/expenses.test.js` | Jest/Supertest patterns and test-case scaffolding | Added compatibility, validation, filtering, Swagger, malformed JSON, category integrity, and isolated-test-data coverage. |
| `README.md` and this file | Documentation drafts and organization | Checked examples against actual request/response behavior and retained the assignment API as the primary documented interface. |

## What I validated and changed

I validated the initial required endpoints manually in Postman: creating an expense, listing expenses, filtering by category, calculating totals, deleting an expense, and rejecting invalid amounts.

I also used the Jest/Supertest suite to validate:

- The original assignment payload and `?category=food` filter
- The optional `category_id` format
- Create, list, update, totals, and delete operations
- Category create, read, update, and delete operations
- Date, title, amount, and duplicate-category validation
- Search and combined filters
- Malformed JSON handling
- Health and Swagger endpoints
- Category rename synchronization

The final local suite contains 31 passing tests. The exact command documented for the project is:

```bash
npm test
```

The local automated checks also verified that `/health` and `/api-docs/` return successful responses and that the generated Swagger specification contains the expected route paths.

## Corrections made after AI-generated changes

I changed several AI suggestions after testing and review:

- Restored backward compatibility after category IDs were introduced, because an automated evaluator may send the original `category` string and ISO date.
- Isolated Jest data in `src/data/test-expenses.json` so tests do not modify the development data file.
- Updated validation messages so the documented ISO date format is also mentioned in errors.
- Updated linked expense category names when a category is renamed.
- Corrected Swagger and README content to describe both the original API contract and optional extensions accurately.

Additional corrections included:

- Replaced timestamp-based expense IDs with `crypto.randomUUID()` to avoid collisions.
- Changed zero-amount handling so `0` reaches amount validation rather than being reported as a missing field.
- Made date comparison independent of whether an expense uses ISO or day-first formatting.
- Ensured Jest uses `src/data/test-expenses.json` and deletes that file after tests, leaving `src/data/expenses.json` untouched.
- Removed generated manual-test data after compatibility checks.

## Scope and trade-offs

The implementation intentionally includes a few useful extensions—categories, update endpoints, search/filtering, health checks, timestamps, Swagger, and stronger validation—but keeps the core assignment behavior available. This was a deliberate trade-off: the extra work demonstrates engineering judgment without replacing the required public API.

The project still uses synchronous local JSON storage. That is appropriate for the stated assignment scope but would not be the right approach for a multi-user production system.

## AI suggestions I chose not to use

- **Pagination:** not needed for the assignment's small JSON-file scope.
- **Maximum amount limit:** no business limit was specified, so I retained positive-number and two-decimal validation only.
- **Database migration:** the assignment explicitly permits local JSON storage.
- **Authentication, rate limiting, and deployment infrastructure:** useful in production, but outside the assignment requirements.
- **`updated_at` timestamps:** only `created_at` was added because update timestamps were not required.
- **Nested category objects in expense responses:** I kept the assignment-compatible `category` string as the primary response field.


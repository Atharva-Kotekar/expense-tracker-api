const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const {
  readCategories,
  writeCategories,
  readExpenses,
  writeExpenses,
  validateCategory,
} = require('../models/expense');

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Create a category
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [name], properties: { name: { type: string, example: food } } }
 *     responses:
 *       201: { description: Category created successfully }
 *       400: { description: Invalid category }
 *       409: { description: Category already exists }
 */
router.post('/', (req, res) => {
  const validation = validateCategory(req.body);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const categories = readCategories();
  const name = req.body.name.trim();

  if (categories.some((category) => category.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Category already exists' });
  }

  const newCategory = { id: crypto.randomUUID(), name };
  categories.push(newCategory);
  writeCategories(categories);

  res.status(201).json(newCategory);
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: List categories
 *     responses:
 *       200: { description: List of categories }
 */
router.get('/', (req, res) => {
  res.json(readCategories());
});

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Update a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Category updated successfully }
 *       400: { description: Invalid category }
 *       404: { description: Category not found }
 */
router.put('/:id', (req, res) => {
  const categories = readCategories();
  const index = categories.findIndex((category) => category.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const validation = validateCategory(req.body);
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const name = req.body.name.trim();
  if (categories.some((category, categoryIndex) =>
    categoryIndex !== index && category.name.toLowerCase() === name.toLowerCase())) {
    return res.status(409).json({ error: 'Category already exists' });
  }

  categories[index] = { ...categories[index], name };
  writeCategories(categories);

  const updatedExpenses = readExpenses().map((expense) => (
    expense.category_id === req.params.id
      ? { ...expense, category: name }
      : expense
  ));
  writeExpenses(updatedExpenses);

  res.json(categories[index]);
});

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Delete a category
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Category deleted successfully }
 *       404: { description: Category not found }
 *       409: { description: Category is used by an expense }
 */
router.delete('/:id', (req, res) => {
  const categories = readCategories();
  const index = categories.findIndex((category) => category.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: 'Category not found' });
  }

  if (readExpenses().some((expense) => expense.category_id === req.params.id)) {
    return res.status(409).json({ error: 'Cannot delete a category used by an expense' });
  }

  categories.splice(index, 1);
  writeCategories(categories);
  res.json({ message: 'Category deleted successfully' });
});

module.exports = router;

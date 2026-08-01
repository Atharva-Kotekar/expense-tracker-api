const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expense Tracker API',
      version: '1.0.0',
      description: 'A simple REST API to manage personal expenses with filtering and totals',
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server',
      },
    ],
  },
  apis: [
    path.join(__dirname, 'routes', '*.js').replace(/\\/g, '/'),
    path.join(__dirname, 'server.js').replace(/\\/g, '/'),
  ],
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };

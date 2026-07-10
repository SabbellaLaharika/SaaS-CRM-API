const express = require('express');
const { initDatabase } = require('./models/db');
const authController = require('./controllers/authController');
const orgController = require('./controllers/orgController');
const crmController = require('./controllers/crmController');
require('dotenv').config();

const path = require('path');

const app = express();

// Parse request bodies
app.use(express.json());

// Serve Swagger specification
app.get('/swagger.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, '../swagger.yaml'));
});

// Serve interactive API Docs
app.get('/api-docs', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Multi-Tenant SaaS CRM API - Swagger Docs</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui.css" />
      <style>
        html { box-sizing: border-box; overflow: -y-scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin: 0; background: #fafafa; }
      </style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.5.0/swagger-ui-bundle.js"></script>
      <script>
        window.onload = () => {
          window.ui = SwaggerUIBundle({
            url: '/swagger.yaml',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
              SwaggerUIBundle.presets.apis
            ],
            layout: "BaseLayout"
          });
        };
      </script>
    </body>
    </html>
  `);
});

// Mount routers
app.use('/api/auth', authController);
app.use('/api/organizations', orgController);
app.use('/api', crmController);

// Centralized error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';
  
  if (status === 500) {
    console.error('Unhandled Error:', err);
  }
  
  res.status(status).json({ error: message });
});

// Conditionally start server listener
const PORT = process.env.PORT || 8080;

if (require.main === module) {
  (async () => {
    try {
      console.log('Initializing database...');
      await initDatabase();
      
      app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
      });
    } catch (err) {
      console.error('Failed to start application:', err);
      process.exit(1);
    }
  })();
}

module.exports = app;

const express = require('express');
const { initDatabase } = require('./models/db');
const authController = require('./controllers/authController');
const orgController = require('./controllers/orgController');
const crmController = require('./controllers/crmController');
require('dotenv').config();

const app = express();

// Parse request bodies
app.use(express.json());

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

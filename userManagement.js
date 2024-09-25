// userManagement.js
const express = require('express');
const router = express.Router();

router.get('/disableUser/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const userEmail = req.session.userEmail || 'user';
  
      console.log('Request received to disable user with ID:', userId, userEmail);
  
      // Update the user's is_active to 'disable' instead of false
      const results = await query('UPDATE users SET is_active = "disable" WHERE id = ?', [userId]);
  
      if (results.affectedRows > 0) {
        res.send(`User with ID ${userId} has been disabled.`);
      } else {
        res.status(404).send(`User with ID ${userId} not found.`);
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  router.get('/enableUser/:userId', async (req, res) => {
    try {
      const userId = req.params.userId;
      const userEmail = req.session.userEmail || 'user';
  
      console.log('Request received to enable user with ID:', userId, 'by user:', userEmail);
  
      // Update the user's is_active to 'active'
      const results = await query('UPDATE users SET is_active = "active" WHERE id = ?', [userId]);
  
      if (results.affectedRows > 0) {
        console.log(`User with ID ${userId} has been enabled.`);
        res.send(`User with ID ${userId} has been enabled.`);
      } else {
        console.log(`User with ID ${userId} not found.`);
        res.status(404).send(`User with ID ${userId} not found.`);
      }
    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Internal Server Error');
    }
  });
  
  module.exports = router;


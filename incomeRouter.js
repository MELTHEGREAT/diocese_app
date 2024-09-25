const express = require('express');
const router = express.Router();

// Define the route to handle income deletion
router.delete('/delete/:incomeId', (req, res) => {
    const incomeId = req.params.incomeId;

    // Perform the deletion in your database
    const deleteQuery = 'DELETE FROM input_income WHERE id = ?';

    connection.query(deleteQuery, [incomeId], (error, results, fields) => {
        if (error) {
            console.error('Error deleting income:', error);
            res.status(500).json({ error: 'Error deleting income' });
        } else {
            res.status(200).json({ message: 'Income deleted successfully' });
        }
    });
});

module.exports = router;


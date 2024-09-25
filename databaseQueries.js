// databaseQueries.js

function getTotalUsers(connection, callback) {
    const query = `
        SELECT COUNT(*) AS userCount FROM users
        UNION
        SELECT COUNT(*) AS userCount FROM sta_rita_users
    `;

    connection.query(query, (err, result) => {
        if (err) {
            callback(err, null);
            return;
        }

        const totalUsers = result.reduce((sum, row) => sum + row.userCount, 0);
        callback(null, totalUsers);
    });
}

module.exports = {
    getTotalUsers,
    // Add other functions if needed
};

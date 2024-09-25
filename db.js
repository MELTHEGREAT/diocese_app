// // db.js
// const mysql = require('mysql');

// const pool = mysql.createPool({
//     connectionLimit: 10,
//     host: 'localhost',
//     user: 'root',
//     password: '',
//     database: 'userDB'
// });

// const query = (sql, values) => {
//     return new Promise((resolve, reject) => {
//         pool.query(sql, values, (error, results) => {
//             if (error) {
//                 reject(error);
//                 return;
//             }
//             resolve(results);
//         });
//     });
// };

// module.exports = { query };

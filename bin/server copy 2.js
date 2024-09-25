const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const app = express();
const winston = require('winston');
const passport = require('passport');
const path = require('path');
const moment = require('moment');
const router = express.Router();
const bcrypt = require('bcrypt'); 
const { getTotalUsers } = require('./databaseQueries');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const multer = require('multer');
const fs = require('fs');

app.use(cookieParser());

// Authentication middleware
app.use('/admin', passport.authenticate('local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin/login',
    failureFlash: true
  }));

const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: 'user_actions.log' }),
    ],
  });



  

// Other middleware and routes...



// -------------------------MYSQL CONNECTION-------------------------//
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'userDB'
});


  


// -------------------------MIDDLEWARE-------------------------//
app.use(express.static('public'));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
      path: '/',
      httpOnly: true,
      secure: false,
      maxAge: 60000
    }
  }));


// -------------------------LANDING PAGE-------------------------//


app.get('/', (req, res) => {
    res.render('home');
});


//SESSION
function isAuthenticated(req, res, next) {
    console.log('isAuthenticated middleware executed');
    const userEmail = req.session.userEmail || 'admin';

    console.log('User in session:', userEmail);
    if (req.session && req.session.isAuthenticated) {
     
      next();
    } else {
      console.log('Redirecting to login page');
      res.redirect('admin/404');
    }
  }


// Add the 'path' module to the EJS rendering context
app.use((req, res, next) => {
    res.locals.path = path;
    next();
  });

app.get('/home', (req, res) => {
    res.render('home'); 
});

// app.get('/loginform', (req, res) => {
//     res.render('loginform'); 
// });

// app.get('/schedule', (req, res) => {
//     res.render('schedule'); 
// });
app.get('/to404', (req,res) => {
    res.render('admin/404');
});

// app.get('/schedule_request', (req, res) => {
//     res.render('admin/schedule_request');
// });

app.get('/try', (req, res) => {
    res.render('try');
});

// app.get('/toAdminBaptismal', (req, res) => {
//     res.render('admin/add_baptismal');
// });

app.get('/generateCertificate', (req, res) => {
    res.render('certificate');
});
app.get('/todonations', (req, res) => {
    res.render('donations');
});

app.get('/logout', (req, res) => {
    res.render('home');
});




// -----------------------------------------------------STA RITA CHURCH-----------------------------------------------------------------
app.get('/toSuperAdmin', (req, res) => {
    getTotalUsers(connection, (totalUsersErr, totalUsers) => {
        if (totalUsersErr) {
            res.send('Error fetching total user count.');
            console.error(`Error fetching total user count: ${totalUsersErr}`);
            return;
        }

        getDataForSuperAdmin((dataForSuperAdminErr, result) => {
            if (dataForSuperAdminErr) {
                res.send('Error fetching data for Super Admin.');
                console.error(`Error fetching data for Super Admin: ${dataForSuperAdminErr}`);
                return;
            }
            const userEmail = req.session.userEmail || 'Super Admin';
            const adminList = result && result.adminList ? result.adminList : [];
            // Check if adminList is an array before using forEach
            if (Array.isArray(adminList)) {
                res.render('super_admin/superadmin', { totalUsers, adminList, userEmail});
            } else {
                console.error('adminList is not an array:', adminList);
                res.send('Error rendering Super Admin page.');
            }
        });
    });
});

function getDataForSuperAdmin(callback) {
    const queryAdmin = `
        SELECT *, 'users' as source FROM users WHERE role = 'admin'
        UNION
        SELECT *, 'sta_rita_users' as source FROM sta_rita_users WHERE role = 'admin'
    `;

    connection.query(queryAdmin, (queryErr, adminList) => {
        if (queryErr) {
            callback(queryErr, null);
            return;
        }

        // Fetch other necessary data
        // ...

        callback(null, { adminList, /* other data */ });
    });
}

//------------------------------------- LOGIN IN CHURCHES--------------------//

app.get('/sta_rita_login', (req, res) => {
    res.render('sta_rita_login');
});

app.get('/to_starita_register', (req, res) => {
    res.render('sta_rita_register');
});

app.get('/to_starita_login', (req, res) => {
    res.render('sta_rita_login');
});

app.get('/to_sanroque_login', (req, res) => {
    res.render('san_roque_login');
});
//----------------------------------END LOGIN IN CHURCHES--------------------//

//-------------------------------------REQUIRED LOGIN--------------------//
//   app.use('/document', isAuthenticated);
  
  // Your routes go here
//   app.get('/document', (req, res) => {
//     res.send('This is the document route');
//   });
//-------------------------------------END REQUIRED LOGIN--------------------//
//-------------------------------------IMAGE --------------------------------//
// const filePath = 'C:\\xampp\\htdocs\\sanroque_cms_node\\uploads\\image_data-1705296465296.jpg';
// console.log('Attempting to access file:', filePath);

// fs.readFile(filePath, 'utf8', (err, data) => {
//   if (err) {
//     console.error('Error accessing file:', err);
//     console.log('Does the file exist?', fs.existsSync(filePath));
//     return;
//   }

//   console.log('File content:', data);
// });
//-------------------------------------IMAGE --------------------------------//

app.post('/starita_new_user', (req, res) => { 
    const { fullname, password, email, contact } = req.body;

    // Check if the user already exists
    const checkUserQuery = 'SELECT * FROM sta_rita_users WHERE email = ?';
    connection.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            res.status(500).send(`Registration failed. Error: ${err.message}`);
            return;
        }

        console.log('Results:', results); 

        if (results.length > 0) {
            res.render('sta_rita_register', { message: 'Failed, Email is already taken' });
            return; 
        }

        // Hash the password before inserting it into the database
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                res.status(500).send(`Registration failed.  Error: ${err.message}`); 
                return;
            }
            const churchId = 1; 
            // Modify the insertUser query to include church_id
            const insertUser = 'INSERT INTO sta_rita_users (fullname, password, email, contact_number, church_id) VALUES (?, ?, ?, ?, ?)';
            
            connection.query(insertUser, [fullname, hashedPassword, email, contact, churchId], (err, results) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    res.status(500).send(`Registration failed. Error: ${err.message}`);
                    return;
                }
                
                res.render('sta_rita_login', { message: 'Registration successful!' });
                console.error(`Email:${email}, Registered Successfully in Sta. Rita Church with church_id:${churchId}`);
            });
        });
    });
});



// LOGIN Sta Rita
app.post('/loginbtn_starita', (req, res) => {
    const { email, password } = req.body;
    const getUserQuery = 'SELECT * FROM sta_rita_users WHERE email = ?';
    const countUsersQuery = 'SELECT COUNT(*) AS userCount FROM users';
    const totalDonationQuery = 'SELECT SUM(amount) AS totalAmount FROM donations';
    const countBaptismalRequestsQuery = 'SELECT COUNT(*) AS baptismalRequestCount FROM baptismal_request';
    const countCustomerServices = 'SELECT COUNT(*) AS contactMessagesCount FROM contact_message';
    const countScheduleRequestsQuery = 'SELECT COUNT(*) AS scheduleRequestCount FROM schedule_requests';

    // Retrieve user by email
    connection.query(getUserQuery, [email], (err, results) => {
        if (err || results.length === 0) {
            // Handle login failure
            res.render('san_roque_login', { message: 'Login Failed' });
            console.error(`Email: ${email}, is not registered.`);
            return;
        }

        const user = results[0];

        // Compare hashed passwords
        bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
            if (bcryptErr || !bcryptResult) {
                res.send('error');
                console.error(`User: ${email}, Wrong Password.`);
                return;
            }

            // Fetch user count
            connection.query(countUsersQuery, (err, countResult) => {
                if (err) {
                    res.send('Error fetching user count.');
                    return;
                }

                const userCount = countResult[0].userCount;

                connection.query(totalDonationQuery, (donationErr, donationResult) => {
                    if (donationErr) {
                        res.send('Error fetching total donation amount.');
                        return;
                    }

                    const totalDonationAmount = donationResult.length > 0 ? donationResult[0].totalAmount : 0;

                    // Fetch baptismal request count
                    connection.query(countBaptismalRequestsQuery, (baptismalRequestErr, baptismalRequestResult) => {
                        if (baptismalRequestErr) {
                            res.send('Error fetching baptismal request count.');
                            return;
                        }

                        const baptismalRequestCount = baptismalRequestResult[0].baptismalRequestCount;
                    
                        // Fetch schedule request count
                        connection.query(countScheduleRequestsQuery, (scheduleRequestErr, scheduleRequestResult) => {
                            if (scheduleRequestErr) {
                                res.send('Error fetching schedule request count.');
                                return;
                            }

                            const scheduleRequestCount = scheduleRequestResult[0].scheduleRequestCount;

                        // Fetch contact messages
                        connection.query(countCustomerServices, (contactRequestErr, contactRequestResult) => {
                            if (contactRequestErr) {
                                res.send('Error fetching contact request count.');
                                return;
                            }

                            const contactMessagesCount = contactRequestResult[0].contactMessagesCount;

                            getChartData((error, dataForChart) => {
                                if (error) {
                                    return res.status(500).send('Error fetching chart data');
                                }

                                req.session.userEmail = user.email;
                                const userEmail = user.email;

                                req.session.userFullname = user.fullname;
                                const userFullname = user.fullname || 'member';
                                

                                if (user.role === 'admin') {
                                    // After successful login
                                 
                                
                                    // Render the admin dashboard template
                                    res.render('starita_admin/admin_dashboard2', {
                                        userCount,
                                        userEmail,
                                        data: JSON.stringify(dataForChart),
                                        totalDonationAmount,
                                        scheduleRequestCount,
                                        contactMessagesCount,
                                        baptismalRequestCount,
                                        dataForChart
                                    });
                                
                                
                                 

                                }
                                else if (user.role === 'superadmin') {
                                    res.render('super_admin/superadmin');
                                }  else {
                                    res.render('members/member_dashboard', {
                                        userCount,
                                        userEmail,   
                                        userFullname,                                  
                                        getUserQuery
                                    });
                                }
                            });
                        });
                        });
                    });
                });
            });
        });
    });
});
// ----------------------------------------------------- END STA RITA CHURCH-----------------------------------------------------------------

// -----------------------------------------------------SAN ROQUE CHURCH-----------------------------------------------------------------

app.get('/san_roque_register', (req, res) => {
    res.render('san_roque_register');
});
app.get('/san_roque_login', (req, res) => {
    res.render('san_roque_login');
});
// LOGIN SAN ROQUE
// -------------------------REGISTER LOGIN-------------------------//

// REGISTER USER SAN ROQUE
app.post('/register', (req, res) => { 
    const { fullname, password, email, contact } = req.body;

    // Check if the user already exists
    const checkUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(checkUserQuery, [email], (err, results) => {
        if (err) {
            console.error('Error checking user:', err);
            res.status(500).send(`Registration failed. Error: ${err.message}`);
            return;
        }

        console.log('Results:', results); 

        if (results.length > 0) {
            res.render('san_roque_register', { message: 'Failed, Email is already taken' });
           
            return; 
        }

        // Hash the password before inserting it into the database
        bcrypt.hash(password, 10, (err, hashedPassword) => {
            if (err) {
                console.error('Error hashing password:', err);
                res.status(500).send(`Registeration failed.  Error: ${err.message}`); 
                return;
            }
            const churchId = 2; 
            
            
            const insertUser = 'INSERT INTO users (fullname, password, email, contact_number,church_id) VALUES (?, ?, ?, ?, ?)';
            connection.query(insertUser, [fullname, hashedPassword, email, contact, churchId], (err, results) => {
                if (err) {
                    console.error('Error inserting user:', err);
                    res.status(500).send(`Registration failed. Error: ${err.message}`);
                   
                    return;
                }
               
                res.render('san_roque_login', { message: 'Registration successful!' });
               console.error(`Email:${email},Register Succesfully in San Roque Parish Church with churchId: ${churchId}`);
               
            });
        });
    });
}); 
const logToDatabase = (userId, action) => {
    const sql = 'INSERT INTO activity_log (userId, action, timestamp) VALUES (?, ?, ?)';
    const values = [userId, action, new Date()];
  
    connection.query(sql, values, (err, results) => {
      if (err) {
        console.error('Error inserting log entry into database:', err);
      } else {
        console.log('\nLog entry inserted into database with ActivityID:', results.insertId, `|| UserId: ${userId}`);
      }
    });
  };
  
// LOGIN SAN ROQUE
app.post('/login_sanroque', (req, res) => {
    const { email, password } = req.body;
    // const getUserQuery = 'SELECT * FROM users WHERE email = ?';
    // const getUserQuery = 'SELECT * FROM users WHERE email = ? AND is_active = ?';
    const getUserQuery = 'SELECT * FROM users WHERE email = ? AND is_active = "active"';
    const getDonationQuery = 'SELECT `donation_id`, `amount`, `name`, `email`, `donation_date`, `reference_number`, `confirmation_status`, `designation`, `additional_comments` FROM `donations` WHERE `confirmation_status` = "unconfirmed" ORDER BY `donation_date` DESC LIMIT 5';
    // const getDonationQuery = 'SELECT `donation_id`, `amount`, `name`, `email`, `donation_date`, `reference_number`, `confirmation_status`, `designation`, `additional_comments` FROM `donations` ORDER BY `donation_date` DESC LIMIT 5';   
    const countUsersQuery = 'SELECT COUNT(*) AS userCount FROM users';
    const totalDonationQuery = 'SELECT SUM(amount) AS totalAmount FROM donations WHERE confirmation_status = "confirmed"';
    const countBaptismalRequestsQuery = 'SELECT COUNT(*) AS baptismalRequestCount FROM baptismal_request';
    const countCustomerServices = 'SELECT COUNT(*) AS contactMessagesCount FROM contact_message';
    const countScheduleRequestsQuery = 'SELECT COUNT(*) AS scheduleRequestCount FROM schedule_requests';
    const countStaRitaUsersQuery = 'SELECT COUNT(*) AS staRitaUserCount FROM sta_rita_users';
    const adminQuery = ` SELECT *, 'users' as source FROM users WHERE role = 'admin' UNION SELECT *, 'sta_rita_users' as source FROM sta_rita_users WHERE role = 'admin' `;

    // Retrieve user by email
    connection.query(getUserQuery, [email], (err, results) => {
        if (err || results.length === 0) {
            // Handle login failure
            res.render('san_roque_login', { message: 'Login Failed' });
            console.error(`Email: ${email}, is not registered.`);
            return;
        }

        const user = results[0];

        // Compare hashed passwords
        bcrypt.compare(password, user.password, (bcryptErr, bcryptResult) => {
            if (bcryptErr || !bcryptResult) {
                res.send('error');
                console.error(`User: ${email}, Wrong Password.`);
                return;
            }
            

            // Fetch user count
            connection.query(countUsersQuery, (err, countResult) => {
                if (err) {
                    res.send('Error fetching user count.');
                    return;
                }

                const userCount = countResult[0].userCount;

                connection.query(totalDonationQuery, (donationErr, donationResult) => {
                    if (donationErr) {
                        res.send('Error fetching total donation amount.');
                        return;
                    }

                    const totalDonationAmount = donationResult.length > 0 ? donationResult[0].totalAmount : 0;

                    // Fetch baptismal request count
                    connection.query(countBaptismalRequestsQuery, (baptismalRequestErr, baptismalRequestResult) => {
                        if (baptismalRequestErr) {
                            res.send('Error fetching baptismal request count.');
                            return;
                        }

                        const baptismalRequestCount = baptismalRequestResult[0].baptismalRequestCount;
                    
                        // Fetch schedule request count
                        connection.query(countScheduleRequestsQuery, (scheduleRequestErr, scheduleRequestResult) => {
                            if (scheduleRequestErr) {
                                res.send('Error fetching schedule request count.');
                                return;
                            }
                            

                            const scheduleRequestCount = scheduleRequestResult[0].scheduleRequestCount;

                            // Fetch contact messages
                            connection.query(countCustomerServices, (contactRequestErr, contactRequestResult) => {
                                if (contactRequestErr) {
                                    res.send('Error fetching contact request count.');
                                    return;
                                }

                                const contactMessagesCount = contactRequestResult[0].contactMessagesCount;

                                connection.query(getDonationQuery, (err, recentDonations) => {
                                    if (err) {
                                        // Handle the error, for example, send an error response or log the error
                                        console.error('Error fetching recent donations:', err);
                                        return;
                                    }

                                    // getChartData((error, dataForChart) => {
                                    //     if (error) {
                                    //         return res.status(500).send('Error fetching chart data');
                                    //     }
                                    // });

                                        req.session.userEmail = user.email;
                                        const userEmail = user.email;
                                        
                                        // Fetch user count from both tables for superadmin
                                        connection.query(countUsersQuery, (err, usersCountResult) => {
                                            if (err) {
                                                res.send('Error fetching total user count.');
                                                return;
                                            }

                                            const query = `
                                                    SELECT id, username, email, role, 'users' as source FROM users WHERE role = 'admin'
                                                    UNION
                                                    SELECT id, username, email, role, 'sta_rita_users' as source FROM sta_rita_users WHERE role = 'admin'
                                                `;

                                                connection.query(adminQuery, (queryErr, adminList) => {
                                                    if (queryErr) {
                                                        res.send('Error fetching admin list.');
                                                        return;
                                                    }
                                                    

                                            connection.query(countStaRitaUsersQuery, (staRitaUsersErr, staRitaUsersCountResult) => {
                                                if (staRitaUsersErr) {
                                                    res.send('Error fetching total San Roque user count.');
                                                    return;
                                                }
                                                    
                                                const totalUsers = usersCountResult[0].userCount + staRitaUsersCountResult[0].staRitaUserCount;

                                                if (user.role === 'admin') {                                                   
                                                    req.session.isAuthenticated = true;
                                                    console.log('User authenticated:',userEmail);
                                                  
                                                    const userId = user.id;  
                                                    const action = 'logged in';
                                                    const confirmationMessage = ``;
                                                    logger.info(`User: ${userEmail} ${action} at ${new Date()}`);
                                                    logToDatabase(userId, action);

                                                    res.render('admin/admin_dashboard', {
                                                        userCount,
                                                        userEmail: user.email,

                                                        // data: JSON.stringify(dataForChart),                                       
                                                        totalDonationAmount,
                                                        scheduleRequestCount,
                                                        contactMessagesCount,
                                                        baptismalRequestCount,
                                                        recentDonations,
                                                        confirmationMessage,
                                                        
                                                    });
                                                }
                                                else if (user.role === 'superadmin') {
                                                    const userId = user.id;  
                                                    const action = 'logged in';
                                                
                                                    logger.info(`User ${userEmail} ${action} at ${new Date()}`);
                                                    logToDatabase(userId, action);
                                                
                                                    fetchAndRenderFinancialReportsSuperAdmin(res);
                                                }
                                                
                                                
                                                  else {//means member
                                                    const userId = user.id;
                                                    const action = 'logged in';
                                                    logger.info(`User ${userEmail} ${action} at ${new Date()}`);
                                                    logToDatabase(userId, action);
                                                  
                                                    // Fetch messages for the user
                                                    const getMessagesQuery = 'SELECT * FROM messages WHERE recipient_email = ? ORDER BY timestamp';
                                                    const getMemberQuery = 'SELECT id, email, contact_number, fullname, baptismal_certificate FROM users WHERE email = ?';

                                                    connection.query(getMessagesQuery, [userEmail], (messagesErr, messages) => {
                                                      if (messagesErr) {
                                                        console.error('Error fetching messages:', messagesErr);
                                                        res.status(500).send('Internal Server Error');
                                                      } else {
                                                        connection.query(getMemberQuery, [userEmail], (memberQueryErr, userData) => {
                                                            if (memberQueryErr) {
                                                              console.error('Error fetching user data:', memberQueryErr);
                                                              res.status(500).send('Internal Server Error');
                                                            } else {
                                                              // Render the member_dashboard view with user information and messages
                                                              res.render('members/member_dashboard', {
                                                                userCount,
                                                                userEmail,
                                                                getUserQuery,
                                                                messages,
                                                                userId,
                                                                userData: userData[0], 
                                                              });
                                                            }
                                                            });
                                                        
                                                      }
                                                    });                                                                                                     
                                                }
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});




// Assuming you have this route in your server file
app.get('/get-messages/:scheduleRequestId', (req, res) => {
    const scheduleRequestId = req.params.scheduleRequestId;
  
    // Retrieve messages for the given schedule request
    const selectQuery = 'SELECT * FROM messages WHERE schedule_request_id = ? ORDER BY timestamp';
    connection.query(selectQuery, [scheduleRequestId], (err, messages) => {
      if (err) {
        console.error('Error fetching messages:', err);
        res.status(500).send('Internal Server Error');
      } else {
        res.json(messages);
      }
    });
  });

// -----------------------------------------------------END FUNTIONS STA RITA CHURCH-----------------------------------------------------------------
//ADMIN MENU LIST

// Function to fetch admin dashboard data
// Function to fetch admin dashboard data
function fetchAdminDashboardData(req, callback) {
    const userEmail = req.session.userEmail || 'admin';

    const countUsersQuery = 'SELECT COUNT(*) AS userCount FROM users';
    const totalDonationQuery = 'SELECT SUM(amount) AS totalAmount FROM donations';
    const countRequestsQuery = 'SELECT COUNT(*) AS requestCount FROM baptismal_request';
    const getDonationQuery = `
        SELECT
            donation_id,
            amount,
            name,
            email,
            donation_date,
            reference_number,
            confirmation_status,
            designation,
            additional_comments
        FROM donations
        ORDER BY donation_date DESC
        LIMIT 5`;

    const countBaptismalRequestsQuery = 'SELECT COUNT(*) AS baptismalRequestCount FROM baptismal_request';
    const countCustomerServices = 'SELECT COUNT(*) AS contactMessagesCount FROM contact_message';
    const countScheduleRequestsQuery = 'SELECT COUNT(*) AS scheduleRequestCount FROM schedule_requests';

    getChartData((error, dataForChart) => {
        if (error) {
            return callback(error);
        }

        const handleQueryResult = (err, result, errorMessage) => {
            if (err) {
                return callback(`Error fetching ${errorMessage}.`);
            }
            return false;
        };

        connection.query(countUsersQuery, (err, countResult) => {
            if (handleQueryResult(err, countResult, 'user count')) return;

            const userCount = countResult[0].userCount;

            connection.query(countBaptismalRequestsQuery, (err, baptismalRequestResult) => {
                if (handleQueryResult(err, baptismalRequestResult, 'baptismal request count')) return;

                const baptismalRequestCount = baptismalRequestResult[0].baptismalRequestCount;

                connection.query(countScheduleRequestsQuery, (err, scheduleRequestResult) => {
                    if (handleQueryResult(err, scheduleRequestResult, 'schedule request count')) return;

                    const scheduleRequestCount = scheduleRequestResult[0].scheduleRequestCount;

                    connection.query(countCustomerServices, (err, contactRequestResult) => {
                        if (handleQueryResult(err, contactRequestResult, 'contact request count')) return;

                        const contactMessagesCount = contactRequestResult[0].contactMessagesCount;

                        connection.query(totalDonationQuery, (err, donationResult) => {
                            if (handleQueryResult(err, donationResult, 'total donation amount')) return;

                            const totalDonationAmount = donationResult.length > 0 ? donationResult[0].totalAmount : 0;

                            connection.query(getDonationQuery, (err, recentDonations) => {
                                if (handleQueryResult(err, recentDonations, 'recent donations')) return;

                                connection.query(countRequestsQuery, (err, requestResult) => {
                                    if (handleQueryResult(err, requestResult, 'request count')) return;

                                    const requestCount = requestResult[0].requestCount;

                                    const adminDashboardData = {
                                        userCount,
                                        userEmail,
                                        data: JSON.stringify(dataForChart),
                                        totalDonationAmount,
                                        requestCount,
                                        scheduleRequestCount,
                                        contactMessagesCount,
                                        baptismalRequestCount,
                                        recentDonations
                                    };

                                    callback(null, adminDashboardData);
                                });
                            });
                        });
                    });
                });
            });
        });
    });
}
app.get('/document', (req, res) => {
    fetchAdminDashboardData(req, (error, adminDashboardData) => {
        if (error) {
            return res.status(500).send(error);
        }

        const confirmationMessage = req.query.confirmationMessage;

        // Combine adminDashboardData and confirmationMessage into a single object
        const dataToSend = {
            ...adminDashboardData,
            confirmationMessage
        };

        // Render the view and pass the combined data
        res.render('admin/admin_dashboard', dataToSend);
    });
});



// Assuming you have a route that renders the member_dashboard.ejs template
app.get('/member_dashboard', (req, res) => {
    // Fetch your messages from the database or any other source
    const messages = "TRY MESSAGE";
  
    res.render('members/member_dashboard', { messages });
  });
  



const Chart = require('chart.js');


// -----------------------------------------------------DONATION MANAGEMENT-----------------------------------------------------------------//

//GIVING
function getDonations(confirmationStatus, callback) {
    const query = "SELECT `donation_id`, `amount`, `name`, `email`, `donation_date`, `reference_number`, `confirmation_status`, `designation`, `additional_comments` FROM `donations` WHERE `confirmation_status` = ?";
    
    connection.query(query, [confirmationStatus], (err, donations) => {
        if (err) {
            callback(err, null);
        } else {
            callback(null, donations);
        }
    });
}



app.get('/toGiving', (req, res) => {
    const userEmail = req.session.userEmail || 'admin';

    getChartData((error, dataForChart) => {
        if (error) {
            // Handle error fetching chart data
            return res.status(500).send('Error fetching chart data');
        }

        getDonations('confirmed', (err, confirmedDonations) => {
            if (err) {
                // Handle error while fetching confirmed donations
                return res.render('error', { error: 'Failed to fetch confirmed donations' });
            }

            getDonations('unconfirmed', (err, unconfirmedDonations) => {
                if (err) {
                    // Handle error while fetching unconfirmed donations
                    return res.render('error', { error: 'Failed to fetch unconfirmed donations' });
                }

                connection.query('SELECT * FROM donations', (error, results) => {
                    if (error) {
                        // Handle error from the database query
                        throw error;
                    }

                    // Render the 'admin/total_donations' template with the donations and chart data
                    const chartHtml = renderChart(dataForChart);
                    res.render('admin/total_donations', { users: results, userEmail, data: JSON.stringify(dataForChart), confirmedDonations, unconfirmedDonations, chartHtml });
                });
            });
        });
    });
});
// Handle the form submissions to update confirmation status
app.post('/update-donation-status', (req, res) => {
    const { donationId, status } = req.body;
  
    let newStatus;
    if (status === 'confirmed') {
      newStatus = 'confirmed';
    } else if (status === 'declined') {
      newStatus = 'declined';  // Update to 'declined'
    } else {
      res.status(400).send('Invalid status');
      return;
    }
  
    // Update the confirmation status in the database
    const UPDATE_STATUS_QUERY = `UPDATE donations SET confirmation_status = ? WHERE donation_id = ?`;
    connection.query(UPDATE_STATUS_QUERY, [newStatus, donationId], (err, result) => {
      if (err) {
        console.error('Error updating donation status:', err);
        res.status(500).send('Error updating donation status');
        return;
      }
      const confirmationMessage = `User Id ${donationId} updated successfully`;
  
      console.log('Donation status updated successfully');
      res.redirect(`/document?confirmationMessage=${encodeURIComponent(confirmationMessage)}`);

    //   res.redirect(`/document?confirmationMessage=${confirmationMessage}`);
    });
});

// Add a new function to render the chart in your HTML file
function renderChart(dataForChart) {
    // Assuming there is an HTML canvas element with id 'line' for the chart
    const canvas = '<canvas id="line"></canvas>';

    // Assuming there is a script tag to initialize the chart
    const script = `
        <script>
            var ctx = document.getElementById('line').getContext('2d');
            var chart = new Chart(ctx, {
                type: 'line',
                data: ${dataForChart},
                options: {} // You can customize options as needed
            });
        </script>
    `;

// -----------------------------------------------------END OF DONATION MANAGEMENT-----------------------------------------------------------------//


    // Combine canvas and script into an EJS-friendly string
    const ejsFriendlyChartHtml = `<%- '${canvas}' %><%- '${script}' %>`;
    
    return ejsFriendlyChartHtml;
}// Assuming you have a function to fetch chart data from the database
function getChartDataFromDatabase(callback) {
    // Implement the logic to fetch data from the database
    // Example: Fetch data from 'donations' table
    connection.query('SELECT `donation_id`, `amount`, `name`, `email`, `donation_date`, `reference_number`, `confirmation_status`, `designation`, `additional_comments` FROM `donations` WHERE 1', (error, results) => {
        if (error) {
            return callback(error, null);
        }

        const dataForChart = results; // Adjust this based on your data structure

        callback(null, dataForChart);
    });
}

//SCHEDULES
app.get('/schedule_request', (req, res) => {
    const userEmail = req.session.userEmail || 'admin'; 
    connection.query('SELECT * FROM schedule_requests', (error, results) => {
        if (error) {
            throw error;
        }
        res.render('admin/schedule_request', { schedulerequests: results, updatedSuccessfully: true, userEmail });
    });
});

function getMessages(userEmail, callback) {
    const getMessagesQuery = 'SELECT * FROM messages WHERE recipient_email = ? ORDER BY timestamp';
    connection.query(getMessagesQuery, [userEmail], (err, messages) => {
        if (err) {
            console.error('Error fetching messages:', err);
            callback(err, null);
        } else {
            callback(null, messages);
        }
    });
}

app.post('/updateSchedule/:id', (req, res) => {
    const requestId = req.params.id;
    const userEmail = req.session.userEmail;  // Correctly get user email from session
    const { request_email, request_fullName, status, message, id } = req.body;

    console.log('Received form data:', req.body, requestId);

    // Assuming you have a function in your database module to perform the update

    const updateQuery = 'UPDATE schedule_requests SET email = ?, fullName = ?, status = ?, message = ? WHERE id = ?';

    connection.query(updateQuery, [request_email, request_fullName, status, message, id], (updateErr, updateResults) => {
        if (updateErr) {
            console.error('Error updating schedule request:', updateErr);
            res.status(500).send('Internal Server Error');
        } else {
            // Insert the message into the messages table
            const insertMessageQuery = 'INSERT INTO messages (schedule_request_id, sender_email, recipient_email, message) VALUES (?, ?, ?, ?)';
            connection.query(insertMessageQuery, [id, userEmail, request_email, message], (insertErr, insertResults) => {
                if (insertErr) {
                    console.error('Error inserting message:', insertErr);
                    res.status(500).send('Internal Server Error');
                } else {
                    // Define notificationMessage here
                    const notificationMessage = `Your schedule request has been accepted: ${message}`;
                    
                    // Add a notification for the user
                    const insertNotificationQuery = 'INSERT INTO notifications (user_id, message) VALUES (?, ?)';
                    connection.query(insertNotificationQuery, [id, notificationMessage], (notificationErr, notificationResults) => {
                        if (notificationErr) {
                            console.error('Error inserting notification:', notificationErr);
                            res.status(500).send('Internal Server Error');
                        } else {
                            // Use the getMessages function to fetch messages
                            getMessages(userEmail, (messagesErr, messages) => {
                                if (messagesErr) {
                                    res.status(500).send('Internal Server Error');
                                } else {
                                    const confirmationSuccess = true;
                                    res.status(200).json({ messages, success: 'Schedule request and message updated successfully' });
                                }
                            });
                        }
                    });
                }
            });
        }
    });
});

//NOTIFICATION


app.get('/toNotifications', (req, res) => {
    const userEmail = req.session.userEmail;

    // Fetch donation data from the database
    getDonations((err, donations) => {
        if (err) {
            // Handle error while fetching donations
            res.render('error', { error: 'Failed to fetch donations' });
        } else {
            // Pass the donation data to the EJS template for rendering
            res.render('admin/admin_notifications', { userEmail, donations });
        }
    });
});

app.get('/admin_dashboard', (req, res) => {
    const userEmail = req.session.userEmail;
    res.render('admin/admin_dashboard', { userEmail });
});

app.get('/member_dashboard', (req, res) => {
    const userEmail = req.session.userEmail;
    res.render('members/member_dashboard', { userEmail });
});


// -------------------------CHART-------------------------//
function getChartData(callback) {
    const query = 'SELECT `donation_date`, `amount` FROM `donations`';

    connection.query(query, (error, results) => {
        if (error) return callback(error);

        const labels = [];
        const amounts = [];

        results.forEach(row => {
            labels.push(row.donation_date);
            amounts.push(row.amount);
        });

        const dataForChart = {
            labels: labels,
            datasets: [{
                label: 'Donation Amount',
                data: amounts,
                backgroundColor: 'rgba(105, 0, 132, .2)',
                borderColor: 'rgba(255, 99, 132, 0.8)',
                borderWidth: 2,
                tension: 0.4
            }]
        };

        callback(null, dataForChart);
    });
}


// -----------------------------------------------------------------MEMBER MANAGEMENT-------------------------------------------------------------------------------------

// 1ST CARD MEMBERS
app.get('/toMembers', (req, res) => {
    // Query to retrieve data from the 'users' table
    const userData = req.params.userData;
    const countBaptismalRequestsQuery = 'SELECT COUNT(*) AS baptismalRequestCount FROM baptismal_request';
    const countCustomerServices = 'SELECT COUNT(*) AS contactMessagesCount FROM contact_message';
    const countScheduleRequestsQuery = 'SELECT COUNT(*) AS scheduleRequestCount FROM schedule_requests';
    connection.query('SELECT * FROM users  WHERE role <> "superadmin"', (error, results) => {
        if (error) throw error;
        const userEmail = req.session.userEmail;
        // Fetch baptismal request count
        connection.query(countBaptismalRequestsQuery, (baptismalRequestErr, baptismalRequestResult) => {
            if (baptismalRequestErr) {
                res.send('Error fetching baptismal request count.');
                return;
            }

            const baptismalRequestCount = baptismalRequestResult[0].baptismalRequestCount;

            // Fetch schedule request count
            connection.query(countScheduleRequestsQuery, (scheduleRequestErr, scheduleRequestResult) => {
                if (scheduleRequestErr) {
                    res.send('Error fetching schedule request count.');
                    return;
                }

                const scheduleRequestCount = scheduleRequestResult[0].scheduleRequestCount;

                // Fetch contact messages
                connection.query(countCustomerServices, (contactRequestErr, contactRequestResult) => {
                    if (contactRequestErr) {
                        res.send('Error fetching contact request count.');
                        return;
                    }

                    const contactMessagesCount = contactRequestResult[0].contactMessagesCount;

                    // Render the 'members' view and pass the retrieved data to it
                    res.render('admin/total_members', {
                        users: results,
                        userData,
                        userEmail,
                        scheduleRequestCount,
                        contactMessagesCount,
                        baptismalRequestCount
                    });
                });
            });
        });
    });
});

//TOTAL DONATIONS
app.get('/to_member_donation', (req, res) => {
    getDonations((err, donations) => {
        if (err) {
            // Handle error while fetching donations
            res.render('error', { error: 'Failed to fetch donations' });
        } else {
            // Pass the donation data to the EJS template for rendering
            const userEmail = req.session.userEmail || 'user';
            res.render('admin/total_donations', { userEmail, donations }); // Pass donations here
        }
    });
});

// // 2ND CARD REQUEST
// app.get('/toadminschedule', (req, res) => {
//     res.render('toadminschedule', { updatedSuccessfully: true });
// });
// 3RD CARD REQUEST
app.get('/to_add_income', (req, res) => {
    res.render('admin/add_income');
});

// 3RD CARD REQUEST
app.get('/to_add_expenses', (req, res) => {
    res.render('admin/add_expenses');
});


// Define a route to handle the request

app.get('/baptismal_list', (req, res) => {
    const searchTerm = req.query.term;
    
    if (searchTerm) {
      // Redirect to the search route with the search term
      res.redirect(`/search?term=${searchTerm}`);
    } else {
      // Fetch all data from the database
      const query = 'SELECT `id`, `first_name`, `last_name`, `email`, `image_data`, `created_at` FROM `baptismal_certificate` WHERE 1';
      
      connection.query(query, (err, results) => {
        if (err) {
          console.error('Error executing the query:', err);
          res.status(500).send('Internal Server Error');
          return;
        }
    
        // Render the EJS template with the fetched data
        res.render('admin/baptismal_list', { certificates: results });
      });
    }
  });
  
  // Define a route to handle the search request
app.get('/search', (req, res) => {
    const searchTerm = req.query.term; // Get the search term from the query parameters
  
    // Fetch data from the database based on the search term
    const query = 'SELECT `id`, `first_name`, `last_name`, `email`, `image_data`, `created_at` FROM `baptismal_certificate` WHERE `first_name` LIKE ? OR `last_name` LIKE ?';
    const params = [`%${searchTerm}%`, `%${searchTerm}%`];
  
    connection.query(query, params, (err, results) => {
      if (err) {
        console.error('Error executing the query:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      // Render the EJS template with the filtered data
      res.render('admin/baptismal_list', { certificates: results });
    });
  });
  




// Start serving images
app.get('/uploads/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'uploads', filename);

  // Check if the file exists before sending it
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error(`Error accessing file: ${filePath}`);
      res.status(404).send('File not found');
    } else {
      res.sendFile(filePath);
    }
  });
});

  

// app.get('/baptismal_list', (req, res) => {
//     // Fetch data from the database
//     const query = 'SELECT `id`, `first_name`, `last_name`, `email`, `image_data`, `created_at` FROM `baptismal_certificate`';
    
//     connection.query(query, (err, results) => {
//       if (err) {
//         console.error('Error executing the query:', err);
//         res.status(500).send('Internal Server Error');
//         return;
//       }
  
//       // Render the EJS template with the fetched data
//       res.render('admin/baptismal_list', { certificates: results });
//     });
//   });
  

// app.get('/baptismal_list', (req, res) => {
//     // Fetch user data from the database
//     connection.query('SELECT id, password, role, email, contact_number, fullname FROM users', (errorUser, resultsUser, fieldsUser) => {
//         if (errorUser) {
//             // Handle error accordingly for users query
//             console.error('Error fetching user data:', errorUser);
//             res.render('error', { message: 'Error fetching user data' });
//         } else {
//             // Fetch first_name and last_name from the baptismal_certificate table
//             connection.query('SELECT first_name, last_name FROM baptismal_certificate', (errorBaptismal, resultsBaptismal, fieldsBaptismal) => {
//                 if (errorBaptismal) {
//                     // Handle error accordingly for baptismal_certificate query
//                     console.error('Error fetching first_name and last_name:', errorBaptismal);
//                     res.render('error', { message: 'Error fetching data' });
//                 } else {
//                     res.render('admin/baptismal_list', { usersData: resultsUser, namesData: resultsBaptismal });
//                 }
//             });
//         }
//     });
// });

//logout
app.post('/logout', (req, res) => {
    res.render('home');
});

// app.get('/toBaptismal', (req, res) => {
//     // Fetch user data from the database
//     connection.query('SELECT id, password, role, email, contact_number, fullname FROM users', (error, results, fields) => {
//         if (error) {
//             // Handle error accordingly
//             console.error('Error fetching user data:', error);
//             res.render('error', { message: 'Error fetching user data' });
//         } else {
//             res.render('admin/card_baptismal', { usersData: results });
//         }
//     });
// });
// app.get('/toadminschedule', (req, res) => {
//     connection.query('SELECT * FROM schedulerequests', (error, results) => {
//         if (error) {
//             throw error;
//         }
//         res.render('admin/admin_schedule', { schedulerequests: results, updatedSuccessfully: true });
//     });
// });

// 3RD CARD BAPTISMAL
// 4TH CARD DONATIONS
// 5TH CARD OTHER


// -----------------------------------------------------MEMBER DASHBOARD-----------------------------------------------------------------

// app.get('/member_document', (req, res) => {
//     const userEmail = req.session.userEmail || 'user';
//     res.render('members/member_dashboard',{userEmail});
// });

// //Schedule
// app.get('/to_member_schedule', (req, res) => {
//     const userEmail = req.session.userEmail ||'user';
//     res.render('members/member_dashboard',{userEmail});
// });

// Fetching data from the database
app.get('/see_baptismal', (req, res) => {
    const sqlQuery = "SELECT `image_data` FROM `baptismal_certificate` WHERE 1";
    
    connection.query(sqlQuery, (err, results) => {
      if (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Internal Server Error');
        return;
      }
      
      // Assuming 'results' is an array of objects with 'image_data'
      // Pass the retrieved image data to the EJS template
      res.render('members/see_baptismal', { imageData: results });
    });
  });
 

// ------------------------ADMIN USER MANAGEMENT-------------------------//
app.get('/disableUser/:userId', (req, res) => {
    const userId = req.params.userId;
    const userEmail = req.session.userEmail || 'user';

    console.log('Request received to disable user with ID:', userId, userEmail);

    // Update the user's is_active to 'disable' instead of false
    connection.query('UPDATE users SET is_active = "disable" WHERE id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        } else if (results.affectedRows > 0) {
            res.send(`User with ID ${userId} has been disabled.`);
        } else {
            res.status(404).send(`User with ID ${userId} not found.`);
        }
    });
});

app.get('/enabledUser/:userId', (req, res) => {
    const userId = req.params.userId;
    const userEmail = req.session.userEmail || 'user';

    console.log('Request received to enabled user with ID:', userId, userEmail);

    // Update the user's is_active to 'disable' instead of false
    connection.query('UPDATE users SET is_active = "active" WHERE id = ?', [userId], (error, results) => {
        if (error) {
            console.error('Error:', error);
            res.status(500).send('Internal Server Error');
        } else if (results.affectedRows > 0) {
            res.send(`User with ID ${userId} has been disabled.`);
        } else {
            res.status(404).send(`User with ID ${userId} not found.`);
        }
    });
});

// Define a function for updating the password
app.post('/updatePassword', (req, res) => {
    const userEmail = req.session.userEmail;
    const userId = req.session.userId;

    const { oldPassword, password, confirmPassword } = req.body;

    // Log received data
    console.log('Received data from: ', { userEmail });

    // Retrieve the user from the database using the user's email
    const getUserQuery = 'SELECT * FROM users WHERE email = ?';
    connection.query(getUserQuery, [userEmail], (getUserError, userResults) => {
        if (getUserError) {
            console.error('Error fetching user:', getUserError);
            return res.render('admin/404', { message: 'Internal Server Error' });
        }

        // Check if the user with the given email exists
        const user = userResults[0];
        if (!user) {
            console.error(`User with email ${userEmail} not found.`);
            return res.render('admin/404', { message: 'User not found' });
        }

        // Check if the old password matches the stored password
        if (!bcrypt.compareSync(oldPassword, user.password)) {
            fetchAdminDashboardData(req, (error, adminDashboardData) => {
                if (error) {
                    return res.status(500).send(error);
                }
        
                // Use the adminDashboardData wherever needed
                // For example, you can pass it to the view when rendering
                return res.render('admin/admin_dashboard', {
                    message: ' Unauthorized: Old password is incorrect',
                    ...adminDashboardData
                });
            });
        } else {
            // Check if the new password and confirmation match
            if (password !== confirmPassword) {
                console.log('Password and confirmation do not match:', { password, confirmPassword });
                return res.render('admin/404', { message: 'Bad Request: Password and confirmation do not match' });
            }
        
            // Update user password in the database
            const updateQuery = 'UPDATE users SET password = ? WHERE email = ?';
            connection.query(updateQuery, [bcrypt.hashSync(password, 10), userEmail], (updateError, results) => {
                if (updateError) {
                    console.error('Error updating user password:', updateError);
                    return res.render('admin/404', { message: 'Internal Server Error' });
                }
        
                // Log query results
                console.log('\nUpdate query results:', results);
        
                // Fetch the admin dashboard data after password update
                fetchAdminDashboardData(req, (fetchError, adminDashboardData) => {
                    if (fetchError) {
                        return res.status(500).send(fetchError);
                    }
                    console.log('\nPassword updated successfully,');
        
                    // Redirect to the admin_dashboard route with a success message and admin data
                    return res.render('admin/admin_dashboard', {
                        passwordUpdateSuccess: true,
                        ...adminDashboardData
                    });
                });
            });
        }
        
    });
});


// -------------------------USER SCHEDULE REQUEST-------------------------//



// Handle form submission
app.post('/schedule', (req, res) => {
    const { fullname, email, phone, preferredDate, preferredTime, requestType, additionalInfo } = req.body;
    const userEmail = req.session.userEmail||'user';
  
    // Insert data into the database
    const INSERT_SCHEDULE_QUERY = `INSERT INTO schedule_requests (fullname, email, phone, preferredDate, preferredTime, requestType, additionalInfo) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  
    connection.query(
        INSERT_SCHEDULE_QUERY,
        [fullname, email, phone, preferredDate, preferredTime, requestType, additionalInfo],
        (err, result) => {
            if (err) {
                console.error('Error inserting schedule request:', err);
                res.status(500).send('Error inserting schedule request');
                return;
            }
            console.log('Schedule request inserted successfully');
            res.render('members/member_dashboard', {userEmail, message : 'Request Submitted,Please wait for our response'})

            // res.status(200).send('Schedule request successful');
        }
    );
});

// -------------------------ADMIN SCHEDULE MANAGEMENT-------------------------//


  // DELETION SCHEDULE
  app.delete('/delete/request/:requestId', (req, res) => {
    const requestId = req.params.requestId;
    const deleteQuery = 'DELETE FROM schedule_requests WHERE id = ?'; 

    connection.query(deleteQuery, [requestId], (error, results) => {
        if (error) {
            console.error('Error deleting request:', error);
            res.status(500).send('Error deleting request');
        } else {
            console.log('Request deleted successfully');
            res.send(`Request with ID ${requestId} deleted successfully`);
        }
    });
});

// UPDATE SCHEDULE MANAGEMENT
// Route to handle form submission
app.post('/updateRequest', (req, res) => {
    const requestId = req.body.requestId;
    const fullName = req.body.fullName;
    const email = req.body.email;
    const phone = req.body.phone;
    const preferredDate = req.body.preferredDate;
    const preferredTime = req.body.preferredTime;
    const requestType = req.body.requestType;
    const status = req.body.status;
    const additionalInfo = req.body.additionalInfo;
  
    // Update the request in the MySQL database
    const updateRequestQuery = `
      UPDATE schedule_requests 
      SET fullName = ?, email = ?, phone = ?, preferredDate = ?, preferredTime = ?, requestType = ?, status = ?, additionalInfo = ?
      WHERE id = ?
    `;
    connection.query(
      updateRequestQuery,
      [fullName, email, phone, preferredDate, preferredTime, requestType, status, additionalInfo, requestId],
      (err, results) => {
        if (err) {
          console.error('Error updating request: ', err);
          res.status(500).send('Error updating request');
        } else {
          console.log('Request updated successfully');
          res.send('Updated Successfully')
        //   res.render(`admin/admin_schedule`);
        }
      }
    );
  });

  
  
// -------------------------END ADMIN SCHEDULE MANAGEMENT-------------------------//


// -------------------------BAPTISMAL CERTIFICATE MANAGEMET-------------------------//

// Set storage for uploaded files using Multer
// const storage = multer.diskStorage({
//     destination: './uploads/',
//     filename: function (req, file, cb) {
//       cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
//     }
//   });
  
//   // Initialize Multer upload
//   const upload = multer({
//     storage: storage,
//     limits: { fileSize: 1000000 }, // Adjust as needed
//   }).single('image_data');
  
 
  
// Handle form submission
app.post('/submit', (req, res) => {
    upload(req, res, (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        res.send('Error uploading file(File size must be big');
        // res.render('form', { message: 'Error uploading file. Please try again.' });
      } else {
        // Extract form data
        const { first_name, last_name, email } = req.body;
        const image_data = req.file.filename; // File name saved in uploads folder
  
        // Insert data into database
        const insertQuery = 'INSERT INTO baptismal_certificate (first_name, last_name, email, image_data, created_at) VALUES (?, ?, ?, ?, NOW())';
        connection.query(insertQuery, [first_name, last_name, email, image_data], (err, result) => {
          if (err) {
            console.error('Error inserting data:', err);
            res.render( { message: 'Error inserting data into the database.' });
          } else {
            res.send('Uploaded Successfully');
          }
        });
      }
    });
  });

//INSERT BAPTISMAL CERTIFICATE
//   app.post('/submit_baptismal_request', (req, res) => {
//     const { email, first_name, last_name, gcash_reference, request_date } = req.body;
  
//     const request_status = 'Pending'; // You may set a default value or handle it differently
  
//     // Insert data into the database
//     const sql = 'INSERT INTO baptismal_request (email, first_name, last_name, gcash_reference, request_date, request_status) VALUES (?, ?, ?, ?, ?, ?)';
//     const values = [email, first_name, last_name, gcash_reference, request_date, request_status];
  
//     connection.query(sql, values, (err, result) => {
//       if (err) {
//         console.error('Error inserting data into MySQL:', err);
//         res.status(500).send('Internal Server Error');
//       } else {
//         console.log('Data inserted into MySQL:', result);
//         console.log('Data inserted into MySQL:', values);

//         res.send('Your request has been submitted. Thank you!');
//       }
//     });
//   });

  app.post('/submit_baptismal_request', (req, res) => {
    const { email, first_name, last_name, gcash_reference, request_date } = req.body;

    // Retrieve user_id based on the provided email
    const getUserIdQuery = 'SELECT id FROM users WHERE email = ?';
    connection.query(getUserIdQuery, [email], (err, result) => {
        if (err) {
            console.error('Error querying user_id from MySQL:', err);
            res.status(500).send('Internal Server Error');
            return;
        }

        if (result.length === 0) {
            // Handle the case where the user with the provided email doesn't exist
            res.status(404).send('User not found');
            return;
        }

        const user_id = result[0].id;

        // Insert data into the baptismal_request table with the retrieved user_id
        const request_status = 'Pending';
        const insertQuery = 'INSERT INTO baptismal_request (user_id, first_name, last_name, gcash_reference, request_date, request_status) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [user_id, first_name, last_name, gcash_reference, request_date, request_status];

        connection.query(insertQuery, values, (insertErr, insertResult) => {
            if (insertErr) {
                console.error('Error inserting data into MySQL:', insertErr);
                res.status(500).send('Internal Server Error');
            } else {
                console.log('Data inserted into MySQL:', insertResult);
                console.log('Data inserted into MySQL:', values);
                res.send('Your request has been submitted. Thank you!');
            }
        });
    });
});

// Middleware to handle file uploads
const storage = multer.diskStorage({
    destination: './uploads',
    filename: (req, file, cb) => {
      cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
  });
  
  const upload = multer({ storage: storage });
  
  // Serve static files from the 'uploads' directory
  app.use('/uploads', express.static('uploads'));
  // Handle file upload and user update
app.post('/upload_certificate/:userId', upload.single('baptismal_certificate'), (req, res) => {
    const userId = req.params.userId;
    const certificatePath = req.file.path;
  
    // Update the user with the certificate path
    const sql = 'UPDATE users SET baptismal_certificate = ? WHERE id = ?';
    const values = [certificatePath, userId];
  
    connection.query(sql, values, (err, result) => {
      if (err) {
        console.error('Error updating user in MySQL:', err);
        res.status(500).send('Internal Server Error');
      } else {
        console.log('User updated in MySQL:', result);
        res.send('Baptismal certificate uploaded and user updated successfully!');
      }
    });
  });

//-------------------------DONATION MANAGEMENT-------------------------//

// Inserting donation data into the database
app.post('/donate', (req, res) => {
    const userEmail = req.session.userEmail || 'user';
    const status = 'unconfirmed';
    const { fullname, email, gcash_reference, amount, designation, comments } = req.body;
  
    // Insert data into the database
    const INSERT_DONATION_QUERY = `INSERT INTO donations (name, email, amount, donation_date, reference_number, confirmation_status, designation, additional_comments) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)`;
  
    connection.query(
      INSERT_DONATION_QUERY,
      [fullname, email, amount, gcash_reference, status, designation, comments],
      (err, result) => {
        if (err) {
          console.error('Error inserting donation:', err);
          res.render('members/member_donations', { userEmail, message: 'Error inserting donation!' });
          return;
        }
        console.log('Donation inserted successfully', req.body, result);
        res.render('members/member_dashboard', { userEmail, message: 'Donation Successful! Please wait for the confirmation of your reference submitted' });
      }
    );
});


// Assuming your route setup in Express looks like this
app.put('/confirmDonation/:donationId', (req, res) => {
    const donationId = req.params.donationId;

    // Perform the database update operation to mark the donation as confirmed
    // Replace this with your actual database update logic
    const updateQuery = "UPDATE donations SET confirmation_status = true WHERE donation_id = ?";
    
    connection.query(updateQuery, [donationId], (err, result) => {
        if (err) {
            console.error('Error updating donation confirmation status:', err);
            res.sendStatus(500); // Send a 500 internal server error status
        } else {
          
            console.log('Donation from ',{donationId},'confirmed successfully\n');
            res.sendStatus(200); // Send a 200 OK status
        }
    });
});


// Handle the POST request to '/updateDonation'
app.post('/updateDonation', (req, res) => {
    // Retrieve data from the request body
    const { amount, fullname, email, contact_number, role } = req.body;
    const donationId = req.body.donation_id; // Assuming the donation_id is sent in the request

    // Perform your SQL query to update the donation
    const sql = `UPDATE donations 
                SET amount=?, name=?, email=?, confirmation_status=? 
                WHERE donation_id=?`;
    
    connection.query(sql, [amount, fullname, email, role, donationId], (err, result) => {
        if (err) {
            console.error('Error updating donation:', err);
            res.status(500).send('Error updating donation');
        } else {
            console.log('Donation updated successfully');
            res.status(200).send('Donation updated successfully');
        }
    });
});



  // DELETE route to handle donation deletion
  app.delete('/delete_donation/donation/:donationId', (req, res) => {
    const donationIdToDelete = req.params.donationId;

    const deleteQuery = "DELETE FROM `donations` WHERE `email` = ?";

    connection.query(deleteQuery, [donationIdToDelete], (err, result) => {
        if (err) {
            console.error('Error deleting donation:', err);
            res.status(500).send('Error deleting donation');
            return;
        }
        console.log('Donation deleted successfully');
        res.sendStatus(200); // Sending success status
    });
});




//-------------------------BAPTISMAL REQUEST MANAGEMENT-------------------------//

app.post('/baptismal_request', (req, res) => {
    const { firstname, lastname, email, gcash_reference } = req.body;
    const userEmail = req.session.userEmail || 'user';
    // Insert data into the database
    const INSERT_BAPTISMAL_REQUEST_QUERY = `
        INSERT INTO baptismal_request (first_name, last_name, email, gcash_reference, request_date) 
        VALUES (?, ?, ?, ?, NOW())
    `;

    connection.query(
        INSERT_BAPTISMAL_REQUEST_QUERY,
        [firstname, lastname, email, gcash_reference],
        (err, result) => {
            if (err) {
                console.error('Error inserting baptismal request:', err);
                res.status(500).send('Error inserting baptismal request');
                return;
            }
            console.log('Baptismal request inserted successfully');
            res.render('members/member_request', {userEmail, message : 'Request Submitted, Please wait for our response!'})

        }
    );
});

app.get('/baptismal_request', (req, res) => {
    const query = 'SELECT * FROM baptismal_request';
  
    connection.query(query, (error, results, fields) => {
      if (error) throw error;
  
      // Render the EJS file with the retrieved data
      console.log("Results from database:", results);

      res.render('admin/baptismal_request', { data: results });
    });
  });
//-------------------------END BAPTISMAL REQUEST MANAGEMENT-------------------------//

//-------------------------CONTACT MESSAGE------------------------------------------//

app.post('/submit-contact-message', (req, res) => {
    const { name, email, subject, message } = req.body;

    const contactMessage = {
        name,
        email,
        subject,
        message,
    };

    connection.query('INSERT INTO contact_message SET ?', contactMessage, (err, result) => {
        if (err) {
            console.error(err);
            res.status(500).send('Internal Server Error');
        } else {
            // Successful submission
            res.send('Your message has been sent. Thank you!');
            console.log('Your message sent successfully!');
        }
    });
});
//------------------------END CONTACT MESSAGE------------------------------------------//


//-------------------------ADD INCOME AND EXPENSES OF CHURCHES-------------------------//

// ADD INCOME SAN ROQUE
app.post('/add_income', (req, res) => {
    const { amount, email, date, source, church } = req.body;

    // Insert data into MySQL
    const sql = 'INSERT INTO input_income (amount, email, selected_date, source, church) VALUES (?, ?, ?, ?, ?)';

    console.log('Values:', amount, email, date, source, church);
    connection.query(sql, [amount, email, date, source, church], (err, result) => {
        if (err) {
            console.error('MySQL insertion error: ' + err.stack);
            res.send('Error submitting form');
            return;
        }

        // Fetch and render financial reports after adding income
        fetchAndRenderFinancialReports(res);
    });
});


app.get('/edit/:id', (req, res) => {
  const id = req.params.id;

  // Fetch the data for the specified ID from the database
  const query = 'SELECT id, email, selected_date, source, submission_date, amount FROM input_income WHERE id = ?';
  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error(err);
      res.status(500).send('Internal Server Error');
      return;
    }

    if (results.length === 0) {
      res.status(404).send('Record not found');
      return;
    }

    // Render your edit modal with the fetched data
    res.render('edit-modal', { data: results[0] });
  });
});

// Handle POST request to update the record
app.post('/update/:id', (req, res) => {
    const id = req.params.id;
    const { source, amount, selectedDate } = req.body;
  
    // Update the record in the database
    const updateQuery = 'UPDATE input_income SET source = ?, amount = ?, selected_date = ? WHERE id = ?';
    connection.query(updateQuery, [source, amount, selectedDate, id], (err, results) => {
      if (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
        return;
      }
  
      res.redirect('/'); // Redirect to the home page or wherever you want after updating
    });
  });


// Function to fetch and render financial reports SAN ROQUE
function fetchAndRenderFinancialReports(res) {
    const incomeQuery = 'SELECT `id`, `email`, `selected_date`, `source`, `submission_date`, `amount`, `status`, `church` FROM `input_income` WHERE `church` = "San Roque Parish Church" ORDER BY `selected_date` DESC';

    
    // const incomeQuery = 'SELECT `id`, `amount`, `email`, `selected_date`, `source`, `submission_date` FROM `input_income` ORDER BY `selected_date` DESC';
    const expensesQuery = 'SELECT `id`, `amount`, `email`, `date`, `category`, `submission_date`, `church` FROM `add_expenses`  WHERE `church` = "San Roque Parish Church" ORDER BY `date` DESC';

    connection.query(incomeQuery, (errorIncome, resultsIncome, fieldsIncome) => {
        if (errorIncome) throw errorIncome;

        // Calculate total income
        const totalIncome = resultsIncome.reduce((total, income) => total + income.amount, 0);

        // Format dates in the income data
        const formattedIncomeData = resultsIncome.map(income => ({
            ...income,
            selected_date: moment(income.selected_date).format('YYYY-MM-DD'),
            submission_date: moment(income.submission_date).format('YYYY-MM-DD HH:mm:ss')
        }));

        connection.query(expensesQuery, (errorExpenses, resultsExpenses, fieldsExpenses) => {
            if (errorExpenses) throw errorExpenses;

            // Calculate total expenses
            const totalExpenses = resultsExpenses.reduce((total, expense) => total + expense.amount, 0);

            // Calculate net income (loss)
            const netIncomeLoss = totalIncome - totalExpenses;

            // Format dates in the expenses data
            const formattedExpensesData = resultsExpenses.map(expense => ({
                ...expense,
                date: moment(expense.date).format('YYYY-MM-DD'),
                submission_date: moment(expense.submission_date).format('YYYY-MM-DD HH:mm:ss')
            }));

            // Render the EJS file with the formatted data and total income/expenses/netIncomeLoss
            const successMessage = 'Form added successfully!';

          
            res.render('admin/financial_reports', { successMessage, incomeData: formattedIncomeData, expensesData: formattedExpensesData, totalIncome, totalExpenses, netIncomeLoss, moment });
        });
    });
}


//-------------------------FINANCIAL REPORTS OF SAN ROQUE-------------------------//

// Handle GET request for financial reports
app.get('/to_financial_reports', (req, res) => {
    fetchAndRenderFinancialReports(res);
});

// Update route
app.post('/update_income', (req, res) => {
    const { amount, email, date, source } = req.body;
    const incomeId = req.params.id;

    // Update data in MySQL
    const sql = 'UPDATE input_income SET amount=?, email=?, selected_date=?, source=? WHERE id=?';
    connection.query(sql, [amount, email, date, source, incomeId], (err, result) => {
        if (err) {
            console.error('MySQL update error: ' + err.stack);
            res.status(500).send('Error updating form');
            return;
        }
        console.log('Form updated successfully!');
        // res.redirect('/to_financial_reports'); 
    });
});

//-------------------------ADD EXPENSES-------------------------//
app.post('/add_expenses', (req, res) => {
    const { amount, email, date, category, church } = req.body;

    // Log the received data
    console.log('Received data:', req.body);

    // Insert data into MySQL
    const sql = 'INSERT INTO add_expenses (amount, email, date, category, church) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [amount, email, date, category, church], (err, result) => {
        if (err) {
            console.error('MySQL insertion error: ' + err.stack);
            res.status(500).send('Error submitting form');
            return;
        }
        fetchAndRenderFinancialReports(res);

        console.log(`Expenses submitted successfully to ${church}`);
    });
});

//-------------------- END FINANCIAL REPORTS OF SAN ROQUE-------------------//



//--------------------  FINANCIAL REPORTS OF STA RITA-------------------//
function fetchAndRenderFinancialReports2(res) {
    const incomeQuery = 'SELECT `id`, `email`, `selected_date`, `source`, `submission_date`, `amount`, `status`, `church` FROM `input_income` WHERE `church` = "Sta Rita De Casia" ORDER BY `selected_date` DESC';

    // const incomeQuery = 'SELECT `id`, `amount`, `email`, `selected_date`, `source`, `submission_date` FROM `input_income` ORDER BY `selected_date` DESC';
    const expensesQuery = 'SELECT `id`, `amount`, `email`, `date`, `category`, `submission_date` FROM `add_expenses`  WHERE `church` = "Sta Rita De Casia" ORDER BY `date` DESC';

    connection.query(incomeQuery, (errorIncome, resultsIncome, fieldsIncome) => {
        if (errorIncome) throw errorIncome;

        // Calculate total income
        const totalIncome = resultsIncome.reduce((total, income) => total + income.amount, 0);

        // Format dates in the income data
        const formattedIncomeData = resultsIncome.map(income => ({
            ...income,
            selected_date: moment(income.selected_date).format('YYYY-MM-DD'),
            submission_date: moment(income.submission_date).format('YYYY-MM-DD HH:mm:ss')
        }));

        connection.query(expensesQuery, (errorExpenses, resultsExpenses, fieldsExpenses) => {
            if (errorExpenses) throw errorExpenses;

            // Calculate total expenses
            const totalExpenses = resultsExpenses.reduce((total, expense) => total + expense.amount, 0);

            // Calculate net income (loss)
            const netIncomeLoss = totalIncome - totalExpenses;

            // Format dates in the expenses data
            const formattedExpensesData = resultsExpenses.map(expense => ({
                ...expense,
                date: moment(expense.date).format('YYYY-MM-DD'),
                submission_date: moment(expense.submission_date).format('YYYY-MM-DD HH:mm:ss')
            }));

            // Render the EJS file with the formatted data and total income/expenses/netIncomeLoss
            const successMessage = 'Form added successfully!';

          
            res.render('starita_admin/financial_reports2', { successMessage, incomeData: formattedIncomeData, expensesData: formattedExpensesData, totalIncome, totalExpenses, netIncomeLoss, moment });
        });
    });
}

// Handle GET request for financial reports
app.get('/to_financial_reports2', (req, res) => {
    fetchAndRenderFinancialReports2(res);
});
app.post('/add_income_starita', (req, res) => {
    const { amount, email, date, source, church } = req.body;

    // Insert data into MySQL
    const sql = 'INSERT INTO input_income (amount, email, selected_date, source, church) VALUES (?, ?, ?, ?, ?)';

    console.log('Values:', amount, email, date, source, church);
    connection.query(sql, [amount, email, date, source, church], (err, result) => {
        if (err) {
            console.error('MySQL insertion error: ' + err.stack);
            res.send('Error submitting form');
            return;
        }

        // Fetch and render financial reports after adding income
        fetchAndRenderFinancialReports2(res);
    });
});


//-------------------------ADD EXPENSES-------------------------//
app.post('/add_expenses_starita', (req, res) => {
    const { amount, email, date, category, church } = req.body;

    // Log the received data
    console.log('Received data:', req.body);

    // Insert data into MySQL
    const sql = 'INSERT INTO add_expenses (amount, email, date, category, church) VALUES (?, ?, ?, ?, ?)';
    connection.query(sql, [amount, email, date, category, church], (err, result) => {
        if (err) {
            console.error('MySQL insertion error: ' + err.stack);
            res.status(500).send('Error submitting form');
            return;
        }
        fetchAndRenderFinancialReports2(res);

        console.log(`Expenses submitted successfully to ${church}`);
    });
});



// const incomeRouter = require('./incomeRouter');

// // Use the income router
// app.use('/income', incomeRouter);


// -----------------------------------------------------STA RITA CHURCH-----------------------------------------------------------------
app.post('/updateIncome/:id', (req, res) => {
    const incomeId = req.params.id;
    const { email, source, amount, selectedDate } = req.body;

    // Perform your SQL query to update the income
    const sql = `UPDATE input_income 
                SET email=?, source=?, amount=?, selected_date=? 
                WHERE id=?`;

    connection.query(sql, [email, source, amount, selectedDate, incomeId], (err, result) => {
        if (err) {
            console.error('Error updating income:', err);
            res.status(500).send('Error updating income');
        } else {
            console.log('Income updated successfully');
            res.redirect('/to_financial_reports');
            // fetchAndRenderFinancialReports(res);
  
        }
    });
});


// Handle DELETE request for deleting income
app.delete('/deleteIncome', (req, res) => {
  const incomeIdToDelete = req.query.id;

  // Perform the deletion logic
  const deleteQuery = 'DELETE FROM `input_income` WHERE `id` = ?';

  connection.query(deleteQuery, [incomeIdToDelete], (error, results) => {
    if (error) {
      console.error('Error deleting record:', error.message);
      res.status(500).json({ success: false, message: 'Error deleting record.' });
    } else {
      console.log('Record deleted successfully.');
      res.json({ success: true, message: 'Record deleted successfully.' });
      
    //  res.redirect('/to_financial_reports');
    }
  });   
});

app.post('/updateExpenses/:id', (req, res) => {
    const expensesId = req.params.id;
    const { email, category, amount, date } = req.body;

    // Perform your SQL query to update the expenses
    const sql = `UPDATE add_expenses 
                SET email=?, category=?, amount=?, date=? 
                WHERE id=?`;

    connection.query(sql, [email, category, amount, date, expensesId], (err, result) => {
        if (err) {
            console.error('Error updating expenses:', err);
            res.status(500).send('Error updating expenses');
        } else {
            console.log('Expenses updated successfully');
            res.status(200).send('Expenses updated successfully');
        }
    });
});


// -----------------------------------------------------SUPER ADMIN-----------------------------------------------------------------//
app.get('/toSuperAdmin', (req, res) => {
    res.render('super_admin/superadmin');
});
const getActivityLogData = () => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                activity_log.id, 
                activity_log.userId, 
                users.email, 
                activity_log.action, 
                activity_log.timestamp 
            FROM 
                activity_log
            JOIN 
                users ON activity_log.userId = users.id
            ORDER BY 
                activity_log.timestamp DESC`; 
        
        connection.query(query, (err, results) => {
            if (err) {
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};


app.get('/to_admin_tools', async (req, res) => {
    try {
        // Retrieve data from the database
        const activityLogData = await getActivityLogData();

        // Render the EJS template and pass the data
        res.render('super_admin/admin_tools', { activityLogData });
    } catch (error) {
        console.error('Error fetching activity log data:', error);
        res.status(500).send('Internal Server Error');
    }
});

// -----------------------------------------------------calculate net income-----------------------------------------------------------------//


function calculateNetIncomeLoss(incomeData, expensesData) {
    // Calculate total income
    const totalIncome = incomeData.reduce((total, income) => total + income.amount, 0);

    // Calculate total expenses
    const totalExpenses = expensesData.reduce((total, expense) => total + expense.amount, 0);

    // Calculate net income (loss)
    const netIncomeLoss = totalIncome - totalExpenses;

    return netIncomeLoss;
}

// -----------------------------------------------------calculate net income-----------------------------------------------------------------//



app.get('/to_admin_tools', (req, res) => {
    res.render('super_admin/admin_tools');
});

function fetchAndRenderFinancialReportsStarita(res) {
    const incomeQuery = 'SELECT `id`, `email`, `selected_date`, `source`, `submission_date`, `amount`, `status`, `church` FROM `input_income` WHERE `church` = "Sta Rita De Casia" ORDER BY `selected_date` DESC';

    // const incomeQuery = 'SELECT `id`, `amount`, `email`, `selected_date`, `source`, `submission_date` FROM `input_income` ORDER BY `selected_date` DESC';
    const expensesQuery = 'SELECT `id`, `amount`, `email`, `date`, `category`, `submission_date` FROM `add_expenses`  WHERE `church` = "Sta Rita De Casia" ORDER BY `date` DESC';

    connection.query(incomeQuery, (errorIncome, resultsIncome, fieldsIncome) => {
        if (errorIncome) throw errorIncome;

        // Calculate total income
        const totalIncome = resultsIncome.reduce((total, income) => total + income.amount, 0);

        // Format dates in the income data
        const formattedIncomeData = resultsIncome.map(income => ({
            ...income,
            selected_date: moment(income.selected_date).format('YYYY-MM-DD'),
            submission_date: moment(income.submission_date).format('YYYY-MM-DD HH:mm:ss')
        }));

        connection.query(expensesQuery, (errorExpenses, resultsExpenses, fieldsExpenses) => {
            if (errorExpenses) throw errorExpenses;

            // Calculate total expenses
            const totalExpenses = resultsExpenses.reduce((total, expense) => total + expense.amount, 0);

            // Calculate net income (loss)
            const netIncomeLoss = totalIncome - totalExpenses;

            // Format dates in the expenses data
            const formattedExpensesData = resultsExpenses.map(expense => ({
                ...expense,
                date: moment(expense.date).format('YYYY-MM-DD'),
                submission_date: moment(expense.submission_date).format('YYYY-MM-DD HH:mm:ss')
            }));

            // Render the EJS file with the formatted data and total income/expenses/netIncomeLoss

          
            res.render('super_admin/starita_reports', {  incomeData: formattedIncomeData, expensesData: formattedExpensesData, totalIncome, totalExpenses, netIncomeLoss, moment });
        });
    });
}


app.get('/starita_reports', (req, res) => {
 fetchAndRenderFinancialReportsStarita(res);

});

function fetchAndRenderFinancialReportsSuperAdmin(res) {
    // Assuming you have functions to fetch net income (loss) for each church
    fetchNetIncomeLossForSanRoque((errorSanRoque, netIncomeLossSanRoque) => {
        if (errorSanRoque) {
            console.error('Error fetching net income (loss) for San Roque:', errorSanRoque.message);
            return res.status(500).send('Internal Server Error');
        }

        fetchNetIncomeLossForStaRita((errorStaRita, netIncomeLossStaRita) => {
            if (errorStaRita) {
                console.error('Error fetching net income (loss) for Sta Rita:', errorStaRita.message);
                return res.status(500).send('Internal Server Error');
            }

            // Fetch any other net income (loss) data as needed

            // Render the 'superadmin' view with net income (loss) for each church
            res.render('super_admin/superadmin', {
                totalUsers,
                adminList,
                userEmail,
                netIncomeLossSanRoque,
                netIncomeLossStaRita
                // Add more net income (loss) variables for other churches if needed
            });
        });
    });
}


// Function to fetch net income (loss) for San Roque from the database
function fetchNetIncomeLossForSanRoque(callback) {
    const expensesQuerySanRoque = 'SELECT `amount` FROM `add_expenses` WHERE `church` = "San Roque Parish Church"';
    const incomeQuerySanRoque = 'SELECT `amount` FROM `input_income` WHERE `church` = "San Roque Parish Church"';

    // Fetch total expenses for San Roque
    connection.query(expensesQuerySanRoque, (errorExpensesSanRoque, resultsExpensesSanRoque) => {
        if (errorExpensesSanRoque) {
            callback(errorExpensesSanRoque, null);
        } else {
            const totalExpensesSanRoque = resultsExpensesSanRoque.reduce((total, expense) => total + expense.amount, 0);

            // Fetch total income for San Roque
            connection.query(incomeQuerySanRoque, (errorIncomeSanRoque, resultsIncomeSanRoque) => {
                if (errorIncomeSanRoque) {
                    callback(errorIncomeSanRoque, null);
                } else {
                    const totalIncomeSanRoque = resultsIncomeSanRoque.reduce((total, income) => total + income.amount, 0);

                    // Calculate net income (loss) for San Roque
                    const netIncomeLossSanRoque = totalIncomeSanRoque - totalExpensesSanRoque;

                    // Call the callback with the calculated net income (loss) for San Roque
                    callback(null, netIncomeLossSanRoque);
                }
            });
        }
    });
}

// Function to fetch net income (loss) for Sta Rita from the database
function fetchNetIncomeLossForStaRita(callback) {
    const expensesQueryStaRita = 'SELECT `amount` FROM `add_expenses` WHERE `church` = "Sta Rita De Casia"';
    const incomeQueryStaRita = 'SELECT `amount` FROM `input_income` WHERE `church` = "Sta Rita De Casia"';

    // Fetch total expenses for Sta Rita
    connection.query(expensesQueryStaRita, (errorExpensesStaRita, resultsExpensesStaRita) => {
        if (errorExpensesStaRita) {
            callback(errorExpensesStaRita, null);
        } else {
            const totalExpensesStaRita = resultsExpensesStaRita.reduce((total, expense) => total + expense.amount, 0);

            // Fetch total income for Sta Rita
            connection.query(incomeQueryStaRita, (errorIncomeStaRita, resultsIncomeStaRita) => {
                if (errorIncomeStaRita) {
                    callback(errorIncomeStaRita, null);
                } else {
                    const totalIncomeStaRita = resultsIncomeStaRita.reduce((total, income) => total + income.amount, 0);

                    // Calculate net income (loss) for Sta Rita
                    const netIncomeLossStaRita = totalIncomeStaRita - totalExpensesStaRita;

                    // Call the callback with the calculated net income (loss) for Sta Rita
                    callback(null, netIncomeLossStaRita);
                }
            });
        }
    });
}

 app.get('/toReportsTry', (req, res) => {
    // Fetch net income (loss) for San Roque from the database
    fetchNetIncomeLossForSanRoque((errorSanRoque, netIncomeLossSanRoque) => {
        if (errorSanRoque) {
            console.error('Error fetching net income (loss) for San Roque:', errorSanRoque.message);
            return res.status(500).send('Internal Server Error');
        }

        // Fetch net income (loss) for Sta Rita from the database
        fetchNetIncomeLossForStaRita((errorStaRita, netIncomeLossStaRita) => {
            if (errorStaRita) {
                console.error('Error fetching net income (loss) for Sta Rita:', errorStaRita.message);
                return res.status(500).send('Internal Server Error');
            }

            // Render the 'reportsTry' view with net income (loss) for each church
            res.render('reportsTry', {
                netIncomeLossSanRoque,
                netIncomeLossStaRita
                // Add more net income (loss) variables for other churches if needed
            });
        });
    });
});


// Function to fetch and render financial reports SAN ROQUE

function fetchAndRenderFinancialReportsSanRoque(res) {
    const incomeQuery = 'SELECT `id`, `email`, `selected_date`, `source`, `submission_date`, `amount`, `status`, `church` FROM `input_income` WHERE `church` = "San Roque Parish Church" ORDER BY `selected_date` DESC';

    
    // const incomeQuery = 'SELECT `id`, `amount`, `email`, `selected_date`, `source`, `submission_date` FROM `input_income` ORDER BY `selected_date` DESC';
    const expensesQuery = 'SELECT `id`, `amount`, `email`, `date`, `category`, `submission_date`, `church` FROM `add_expenses`  WHERE `church` = "San Roque Parish Church" ORDER BY `date` DESC';

    connection.query(incomeQuery, (errorIncome, resultsIncome, fieldsIncome) => {
        if (errorIncome) throw errorIncome;

        // Calculate total income
        const totalIncome = resultsIncome.reduce((total, income) => total + income.amount, 0);

        // Format dates in the income data
        const formattedIncomeData = resultsIncome.map(income => ({
            ...income,
            selected_date: moment(income.selected_date).format('YYYY-MM-DD'),
            submission_date: moment(income.submission_date).format('YYYY-MM-DD HH:mm:ss')
        }));

        connection.query(expensesQuery, (errorExpenses, resultsExpenses, fieldsExpenses) => {
            if (errorExpenses) throw errorExpenses;

            // Calculate total expenses
            const totalExpenses = resultsExpenses.reduce((total, expense) => total + expense.amount, 0);

            // Calculate net income (loss)
            const netIncomeLoss = totalIncome - totalExpenses;

            // Format dates in the expenses data
            const formattedExpensesData = resultsExpenses.map(expense => ({
                ...expense,
                date: moment(expense.date).format('YYYY-MM-DD'),
                submission_date: moment(expense.submission_date).format('YYYY-MM-DD HH:mm:ss')
            }));


          
            res.render('super_admin/sanroque_reports', {  incomeData: formattedIncomeData, expensesData: formattedExpensesData, totalIncome, totalExpenses, netIncomeLoss, moment });
        });
    });
}


app.get('/sanroque_reports', (req, res) => {
    fetchAndRenderFinancialReportsSanRoque(res);
});
// -----------------------------------------------------END SUPER ADMIN-----------------------------------------------------------------//

// -----------------------------------------------------MESSAGES-----------------------------------------------------------------//

// MESSAGE TRY
// Handle user messages
app.post('/sendMessage', (req, res) => {
    const { sender_email, recipient_email, message } = req.body;
    const userEmail = req.session.userEmail ;

    // Assuming you have a function in your database module to perform the insert
    const insertMessageQuery = 'INSERT INTO messages (sender_email, recipient_email, message) VALUES (?, ?, ?)';
    connection.query(insertMessageQuery, [sender_email, recipient_email, message], (insertErr, insertResults) => {
        if (insertErr) {
            console.error('Error inserting message:', insertErr);
            res.status(500).send('Internal Server Error');
        } else {
            console.log(`User: ${userEmail} successfully sent data`);
            res.render('members/member_dashboard',userEmail);
        }
    }); 
});


// app.get('/to_financial_reports',(req, res)=>{
//     res.render('admin/financial_reports');
// });


// -------------------------PORT-------------------------//

const PORT = 4000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
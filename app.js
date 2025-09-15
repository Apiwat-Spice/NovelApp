//npm init -y
//npm i express mysql2 dotenv nodemon bcrypt ejs express-session
const express = require('express')//cookie-parser jsonwebtoken
const mysql = require('mysql2')
const dotenv = require('dotenv')
const path = require('path')
const cookieParser = require('cookie-parser');
const { isLoggedIn } = require('./controllers/authMiddleware');

dotenv.config()
global.loggedIn = null
const app = express()
app.use(cookieParser());


const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
})

const publicDirectiory = path.join(__dirname, './public')
app.use(express.static(publicDirectiory))
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(isLoggedIn);
app.set('view engine', 'ejs')

db.connect((error) => {
    if (error) {
        console.log("Error-SQL :" + error);
    } else {
        console.log("Connected");
    }
})

//Router
app.use('/', require('./routes/pages'))
app.use('/auth', require('./routes/auth'))

app.listen(3000, () => {
    console.log("Sever Started on Port 3000 http://localhost:3000/");
})
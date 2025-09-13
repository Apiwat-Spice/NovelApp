//npm init -y
//npm i express mysql2 dotenv nodemon bcrypt ejs
const express = require('express')//cookie-parser jsonwebtoken
const mysql = require('mysql2')
const dotenv = require('dotenv')
const path = require('path')
const cookieParser = require('cookie-parser');

dotenv.config()

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


app.post("/addNovel", (req, res) => {
  const values = [req.body.name, req.body.text, req.body.url];
  const sql = "INSERT INTO novell (name, `text`, url) VALUES (?, ?, ?)";

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.render("index", { data: [] }); 
    }
    // query ใหม่เพื่อดึงข้อมูลทั้งหมด
    db.query("SELECT * FROM novell ORDER BY name ASC", (err, results) => {
      if (err) {
        console.error(err);
        return res.render("index", { data: [] });
      }
      res.render("index", { data: results }); 
    });
  });
});
app.listen(3000, () => {
    console.log("Sever Started on Port 3000");
})
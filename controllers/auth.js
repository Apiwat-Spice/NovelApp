const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})
exports.register = (req, res) => {
    console.log(req.body.birthdate);

    const { name, email, password, passwordConfirm, date } = req.body;
    db.query('SELECT email FROM users WHERE email = ?', [email], (error, result) => {
        if (error) {
            console.log("error-here : " + error);
        }
        if (result.length > 0) {
            return res.render('register', {
                message: "That email is already in used"
            });
        }
        else if (password !== passwordConfirm) {
            return res.render('register', {
                message: "Password do not match"
            });
        }
        bcrypt.hash(process.env.DATABASE_PASSWORD, 8, (err, hashedPassword) => {
            if (err) throw err;
            db.query('INSERT INTO users SET ?', { username: name, email: email, password: hashedPassword, birthdate: date }, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(result);
                    return res.render('login', {
                        message: "User registered"
                    });
                }
            })
        });
    })
}

exports.login = (req, res) => {
    const { email, password } = req.body;
    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) {
            console.error(err);
        }
        if (results.length === 0) {
            return res.render('login', {
                message: "Email หรือรหัสผ่านไม่ถูกต้อง"
            });
        }

        const user = results[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.render('login', {
                message: "Email หรือรหัสผ่านไม่ถูกต้อง"
            });
        } else {// Login สำเร็จ
            // สร้าง JWT token
            const token = jwt.sign(
                { id: user.id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            // ส่ง token เก็บใน cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                secure: false,
                maxAge: 24 * 60 * 60 * 1000
            });

            return res.render('index');
        }
    });
}
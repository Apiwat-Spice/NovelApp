const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

// D:\ApiwatSpice\RealS\Project101\NovelApp\controllers\auth.js
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
});

exports.register = (req, res) => {
    const { name, email, password, passwordConfirm, date } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], (error, result) => {
        if (error) {
            console.log("error-here : " + error);
        }

        if (result.length > 0) {
            return res.render('register', {
                message: "That email is already in used"
            });
        } else if (password !== passwordConfirm) {
            return res.render('register', {
                message: "Password do not match"
            });
        }

        bcrypt.hash(password, 8, (err, hashedPassword) => {
            if (err) throw err;

            const userData = {
                username: name,
                email: email,
                password: hashedPassword,
                birthday: date
            };

            db.query('INSERT INTO users SET ?', userData, (error, result) => {
                if (error) {
                    console.log(error);
                } else {
                    console.log(result);
                    return res.render('login', { message: "User registered" });
                }
            });
        });
    });
};

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
        } else {
            // สร้าง JWT token
            const token = jwt.sign(
                { user_id: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );

            // ส่ง token เก็บใน cookie
            res.cookie('jwt', token, {
                httpOnly: true,
                secure: true,
                maxAge: 24 * 60 * 60 * 1000
            });

            db.query("SELECT * FROM novels ORDER BY title ASC", (err, data) => {
                if (err) {
                    console.log("error here :" + err);
                    return res.render('index', { data: [] });
                }
                console.log("no error");
                res.redirect('/index');
            });
        }
    });
};

exports.addNovel = (req, res) => {
    console.log(req.body);

    if (!req.user) return res.redirect('/login');
    const userId = req.user.user_id;

    const {
        novelname,
        arthor,
        category,
        PicUrl,
        Descriptions,
        Novel_Content,
        Check18Content
    } = req.body;

    const isAdult = Check18Content === 'on' ? 1 : 0;

    const values = [
        novelname,
        userId,
        arthor,
        category,
        PicUrl,
        Descriptions,
        Novel_Content,
        isAdult
    ];

    const sql = `
        INSERT INTO novels 
        (title, user_id, author_name, category, cover_url, description, content, is_adult)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.render("index", { data: [] });
        }

        db.query("SELECT * FROM novels ORDER BY title ASC", (err, results) => {
            if (err) {
                console.error(err);
                return res.render("index", { data: [] });
            }
            res.render("index", { data: results });
        });
    });
};

exports.addChapter = (req, res) => {
    console.log(req.body);

    const id = req.params.id;
    const { content, chapter_number } = req.body;

    const sql = "INSERT INTO chapters (novel_id, content, chapter_number) VALUES (?, ?, ?)";

    db.query(sql, [id, content, chapter_number || null], (err, result) => {
        if (err) return res.send(err);
        res.redirect(`/read/${id}`);
    });
};
exports.addComment = (req, res) => {
    const chapterId = req.params.id;
    const userId = req.user.user_id;
    const { content } = req.body;

    if (!content) return res.status(400).send("Content is required");

    const sql = "INSERT INTO comments (chapter_id, user_id, content) VALUES (?, ?, ?)";
    db.query(sql, [chapterId, userId, content], (err, result) => {
        if (err) return res.send("Failed to post comment");
        res.redirect(`/chapter/${chapterId}`);
    });
};

exports.logout = (req, res) => {
    res.clearCookie('jwt'); // เคลียร์ JWT cookie
    res.redirect('/login');
};
exports.coin = (req,res) =>{
    const amount_coin = req.body.amount;
    const amount_bath = req.body.amount;
    const userId = req.user.user_id;
    const earn = "earn"
    const bath_to_coin = "bath_to_coin"
    
    //API Payments
    
    const sql = "INSERT INTO coin_payments (user_id, type, method, amount_coin, amount_bath) VALUES (?, ?, ?, ?, ?)";
    db.query(sql,[userId,earn,bath_to_coin,amount_coin,amount_bath],(err,result)=>{
        if (err) return res.send("Failed to โอนตังค์");
        const sqlUpdate = "UPDATE users SET coins = coins + ? WHERE user_id = ?";
        db.query(sqlUpdate, [amount_coin, userId], (err2, result2) => {
            if (err2) return res.status(500).send("Failed to update coins");
        res.redirect("/coin"); 
        });
    })
};
const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');
// D:\ApiwatSpice\RealS\Project101\NovelApp\controllers\auth.js
const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE
})
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
        }
        else if (password !== passwordConfirm) {
            return res.render('register', {
                message: "Password do not match"
            });
        }
        //process.env.DATABASE_PASSWORD
        bcrypt.hash(password, 8, (err, hashedPassword) => {
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
                secure: true,
                maxAge: 24 * 60 * 60 * 1000
            });

            db.query("SELECT * FROM novels ORDER BY title ASC", (err, data) => {
                if (err) {
                    console.log("error here :"+err);
                    return res.render('index', { data: [] }); // ส่ง array ว่าง
                }
                console.log("no error");
                res.redirect('/index'); // ส่งข้อมูลไป EJS
            });
        }
    });
}

exports.addNovel = (req, res) => {
//     CREATE TABLE novels ( --novel ใหม่
//     id INT AUTO_INCREMENT PRIMARY KEY,           -- รหัสนิยาย
//     title VARCHAR(100) NOT NULL,                 -- ชื่อนิยาย
//     user_id INT NOT NULL,                      -- รหัสผู้แต่ง (FK)
//     author_name VARCHAR(100) NOT NULL,           -- ชื่อผู้แต่งสำรอง
//     category VARCHAR(50),                        -- หมวดหมู่
//     cover_url VARCHAR(500),                       -- URL ปก
//     description TEXT,                            -- คำบรรยาย
//     content LONGTEXT,                            -- เนื้อหานิยาย
//     is_adult BOOLEAN DEFAULT FALSE,              -- 18+ content
//     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
//     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
//     FOREIGN KEY (user_id) REFERENCES users(id) -- FK เชื่อมกับ users
// );
    console.log(req.body);
    const userId = req.user.id; // <-- เพิ่มตรงนี้
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

    // บังคับให้ login ก่อนถึงเพิ่ม novel:
    if (!req.user) return res.redirect('/login');

    const values = [
        novelname,
        userId,       // <-- แก้ตรงนี้
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
}


exports.addChapter = (req, res) => {
    console.log(req.body);
    const id = req.params.id;
    const { title, content, chaptersNum } = req.body;
    const sql = "INSERT INTO chapters (idNovel1, title, content, chaptersNum) VALUES (?, ?, ?, ?)";

    db.query(sql, [id, title, content, chaptersNum || null], (err, result) => {
        if (err) return res.send("Failed to add chapter");
        res.redirect(`/read/${id}`);
    });
}

exports.logout = (req, res) => {
    res.clearCookie('jwt'); // เคลียร์ JWT cookie
    res.redirect('/login');
};
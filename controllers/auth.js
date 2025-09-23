const mysql = require('mysql2')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken');

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
                {
                    user_id: user.user_id,
                    email: user.email,
                    is_premium: user.is_premium,
                },
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
                res.redirect('/index');
            });
        }
    });
};
exports.addNovel = (req, res) => {

    if (!req.user) return res.redirect('/login');
    const userId = req.user.user_id;

    const {
        novelname,
        arthor,
        category,
        PicUrl,
        Descriptions,
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
        isAdult
    ];

    const sql = `
        INSERT INTO novels 
        (title, user_id, author_name, category, cover_url, description, is_adult)
        VALUES (?, ?, ?, ?, ?, ?, ?)
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

    const id = req.params.id; // novel_id
    const chapter_name = req.body.chapter_name;
    const content = req.body.content;
    const is_adult = req.body.Check18Content === "on" ? 1 : 0;


    // หาเลขตอนล่าสุดของ novel_id นี้
    const getChapterNumberSql = `
        SELECT COALESCE(MAX(chapter_number), 0) AS lastChapter 
        FROM chapters 
        WHERE novel_id = ?
    `;

    db.query(getChapterNumberSql, [id], (err, rows) => {
        if (err) return res.send(err);

        // ตอนใหม่ = ตอนล่าสุด + 1
        const chapter_number = rows[0].lastChapter + 1;

        // คำนวณ cost
        let cost = 0;
        if (chapter_number >= 4) cost = 3;

        // insert ตอนใหม่
        const insertSql = `
            INSERT INTO chapters (novel_id, chapter_number, chapter_name, content, is_adult, cost)
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        db.query(insertSql, [id, chapter_number, chapter_name || null, content, is_adult, cost], (err2, result) => {
            if (err2) return res.send(err2);

            console.log(`Chapter ${chapter_number} inserted for novel ${id}`);
            res.redirect(`/read/${id}`);
        });
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
exports.coin = (req, res) => {
    const amount_coin = req.body.amount;
    const amount_bath = req.body.amount;
    const userId = req.user.user_id;
    const earn = "earn"
    const bath_to_coin = "bath_to_coin"

    //API Payments

    const sql = "INSERT INTO coin_payments (user_id, type, method, amount_coin, amount_bath) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [userId, earn, bath_to_coin, amount_coin, amount_bath], (err, result) => {
        if (err) return res.send("Failed to โอนตังค์");
        const sqlUpdate = "UPDATE users SET coins = coins + ? WHERE user_id = ?";
        db.query(sqlUpdate, [amount_coin, userId], (err2, result2) => {
            if (err2) return res.status(500).send("Failed to update coins");
            res.redirect("/coin");
        });
    })
};
exports.unlock = (req, res) => {

    const chapterId = req.params.id;
    const userId = req.user.user_id;

    // ดึง chapter
    db.query('SELECT * FROM chapters WHERE chapter_id = ?', [chapterId], (err, results) => {
        if (err) return res.send('Database error');
        if (results.length === 0) return res.send('Chapter not found');

        const chap = results[0];

        // Premium user อ่านฟรี
        if (req.user.is_premium) {
            return res.redirect(`/chapter/${chapterId}`);
        }

        // ตรวจสอบ coins
        if (req.user.coins < chap.cost) {
            console.log(req.user.coins);
            console.log("KUy");
            
            return res.send('Not enough coins');
        }

        // หัก coins ของ user
        db.query('UPDATE users SET coins = coins - ? WHERE user_id = ?', [chap.cost, userId], (err1) => {
            if (err1) return res.send('Error deducting coins');

            // เพิ่ม coins ให้ผู้สร้าง novel
            db.query('UPDATE users u JOIN novels n ON u.user_id = n.user_id SET u.coins = u.coins + ? WHERE n.novel_id = ?', [chap.cost, chap.novel_id], (err2) => {
                if (err2) return res.send('Error adding coins to author');

                // อัพสถานะ unlocked
                db.query('INSERT INTO user_progress (user_id, novel_id, chapter_number, unlocked) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE unlocked=1',
                    [userId, chap.novel_id, chap.chapter_number],
                    (err3) => {
                        if (err3) {
                            console.log(err3); // ดู error จริง
                            return res.send('Error updating progress');
                        }
                        res.redirect(`/chapter/${chapterId}`);
                    }
                );
            });
        });
    });
};
exports.likeChapter = (req, res) => {
    const chapterId = req.params.id;
    const userId = req.user.user_id;

    // ตรวจสอบว่าผู้ใช้เคยกด Like แล้วหรือยัง
    db.query(
        "SELECT * FROM chapter_likes WHERE chapter_id=? AND user_id=?",
        [chapterId, userId],
        (err, results) => {
            if (err) return res.status(500).send("Error checking like");

            if (results.length > 0) {
                // ลบ Like
                db.query(
                    "DELETE FROM chapter_likes WHERE chapter_id=? AND user_id=?",
                    [chapterId, userId],
                    (err, delResult) => {
                        if (err) return res.status(500).send("Failed to unlike chapter");
                        res.redirect(`/chapter/${chapterId}`);
                    }
                );
            } else {
                // เพิ่ม Like
                db.query(
                    "INSERT INTO chapter_likes (chapter_id, user_id) VALUES (?, ?)",
                    [chapterId, userId],
                    (err, insertResult) => {
                        if (err) return res.status(500).send("Failed to like chapter");
                        res.redirect(`/chapter/${chapterId}`);
                    }
                );
            }
        }
    );
};
exports.premium = (req, res) => {
    const user_id = req.user.user_id;
    const premium_class = req.body.premium_class;

    const premium_day = { noob: 1, pro: 30, hacker: 365 }[premium_class];
    const price_coin = { noob: 1, pro: 25, hacker: 359 }[premium_class];

    if (!premium_day) {
        return res.status(400).send("Error 404 only (noob, pro, hacker)");
    }

    const sql = 'SELECT * FROM users WHERE user_id = ?';
    db.query(sql, [user_id], (err, results) => {
        if (err) return res.status(500).send(err);
        if (results.length === 0) return res.status(404).send("User not found");
        const user = results[0];

        if (user.coins < price_coin) {
            return res.status(400).render('404', {
                alertMessage: "Not enough coins"
            });
        }

        // คำนวณวันหมดอายุ
        let expireDate;
        if (user.is_premium && user.premium_expire) {
            expireDate = new Date(user.premium_expire);
        } else {
            expireDate = new Date();
        }
        expireDate.setDate(expireDate.getDate() + premium_day);
        const expireFormat = expireDate.toISOString().split('T')[0];

        // เริ่ม transaction (optional แต่แนะนำ)
        db.beginTransaction(err => {
            if (err) return res.status(500).send(err);

            // 1. ลบเหรียญผู้ใช้
            const updateUserSql = 'UPDATE users SET coins = coins - ?, is_premium = 1, premium_expire = ?, updated_at = NOW() WHERE user_id = ?';
            db.query(updateUserSql, [price_coin, expireFormat, user_id], (err2) => {
                if (err2) return db.rollback(() => res.status(500).send(err2));

                // 2. บันทึกการใช้เหรียญใน coin_payments
                const insertCoinSql = 'INSERT INTO coin_payments (user_id, type, method, amount_coin, created_at) VALUES (?, "spend", "coin_to_premium", ? , NOW())';
                db.query(insertCoinSql, [user_id, price_coin], (err3) => {
                    if (err3) return db.rollback(() => res.status(500).send(err3));

                    db.commit(err4 => {
                        if (err4) return db.rollback(() => res.status(500).send(err4));

                        // สร้าง JWT ใหม่
                        const newToken = jwt.sign(
                            {
                                user_id: user.user_id,
                                username: user.username,
                                email: user.email,
                                coins: user.coins - price_coin,   // ลดเหรียญแล้ว
                                is_premium: 1,                     // ตั้ง premium เป็น 1
                                premium_expire: expireFormat       // วันหมดอายุใหม่
                            },
                            process.env.JWT_SECRET,
                            { expiresIn: '1d' }
                        );

                        // อัปเดต cookie
                        res.cookie('jwt', newToken, {
                            httpOnly: true,
                            secure: true,
                            maxAge: 24 * 60 * 60 * 1000
                        });

                        res.redirect('/profile');
                    });
                });
            });
        });
    });
};
exports.chatbot = (req, res) => {
    const userId = req.user.user_id;
    const { message } = req.body;

    // list คำสั่งที่รองรับ
    const commands = [
        "เหรียญ / coin",
        "premium / สมาชิก",
        "โปรโมชั่น / promotion",
        "รายการฝากถอน / transaction",
        "เติมเงิน",
        "ซื้อ chapter",
        "ช่วยเหลือ / help"
    ];

    if (/เหรียญ|coin/i.test(message)) {
        const sql = "SELECT coins FROM users WHERE user_id = ?";
        db.query(sql, [userId], (err, results) => {
            if (err) return res.json({ reply: "ไม่สามารถดึงข้อมูลเหรียญได้" });
            res.json({ reply: `คุณมี ${results[0].coins} coins` });
        });

    } else if (/premium|สมาชิก/i.test(message)) {
        const sql = "SELECT is_premium, premium_expire FROM users WHERE user_id = ?";
        db.query(sql, [userId], (err, results) => {
            if (err) return res.json({ reply: "ไม่สามารถดึงข้อมูล Premium ได้" });
            const user = results[0];
            if (user.is_premium) {
                res.json({ reply: `คุณเป็น Premium อยู่ จนถึงวันที่ ${user.premium_expire?.toISOString().slice(0, 10)}` });
            } else {
                res.json({ reply: "คุณยังไม่เป็น Premium" });
            }
        });

    } else if (/โปรโมชั่น|promotion/i.test(message)) {
        res.json({
            reply:
                "🔥 โปรโมชั่น Premium 🔥\n" +
                "- Noob: 1 วัน / 1 coin\n" +
                "- Pro: 30 วัน / 25 coins\n" +
                "- Hacker: 365 วัน / 359 coins\n\n" +
                "อัตราแปลงเงิน: 1 coin = 1 บาท"
        });

    } else if (/รายการฝากถอน|transaction/i.test(message)) {
        const sql = "SELECT type, method, amount_coin, amount_bath, created_at FROM coin_payments WHERE user_id = ? ORDER BY created_at DESC LIMIT 5";
        db.query(sql, [userId], (err, results) => {
            if (err) return res.json({ reply: "ไม่สามารถดึงข้อมูล transaction ได้" });
            if (results.length === 0) return res.json({ reply: "ยังไม่มีรายการ transaction" });

            let reply = "รายการ transaction ล่าสุด:\n";
            results.forEach(r => {
                reply += `${r.created_at.toISOString().slice(0, 19)} - ${r.type} - ${r.amount_coin} coins (${r.method})\n`;
            });
            res.json({ reply });
        });

    } else if (/เติมเงิน/i.test(message)) {
        res.json({
            reply: "คุณสามารถเติมเงินได้โดยโอนเงิน (บาท) แล้วระบบจะแปลงเป็น coins อัตโนมัติ\nอัตรา: 1 coin = 1 บาท"
        });

    } else if (/ซื้อ chapter/i.test(message)) {
        res.json({
            reply: "คุณสามารถซื้อ chapter โดยใช้ coins ที่คุณมีอยู่\n(1 chapter = จำนวน coin ตามที่นักเขียนกำหนด)"
        });

    } else if (/ช่วยเหลือ|help/i.test(message)) {
        let reply = "📌 คำสั่งที่รองรับ:\n";
        commands.forEach(cmd => { reply += `- ${cmd}\n`; });
        res.json({ reply });

    } else if (/เกย์/i.test(message)) {
        res.json({ reply: "อย่าเกย์ครับอ้าย 🤣" });

    } else {
        // else แสดง list คำสั่งทั้งหมด
        let reply = "❓ ไม่เข้าใจคำสั่งนี้ ลองใช้คำสั่งที่รองรับ:\n";
        commands.forEach(cmd => { reply += `- ${cmd}\n`; });
        res.json({ reply });
    }
};

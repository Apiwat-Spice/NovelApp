//รวม Get
const mysql = require('mysql2')
const express = require("express")
const router = express.Router();
const { isLoggedIn } = require('../controllers/authMiddleware');
const authController = require('../controllers/auth');

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
})

router.get('/', isLoggedIn, (req, res) => {
  res.render('login', { message: '', user: req.user })
})
router.get('/index', isLoggedIn, (req, res) => {
  const sort = req.query.sort || 'title_asc';

  let orderBy = 'n.title ASC'; // default

  if (sort === 'date_desc') orderBy = 'n.created_at DESC';
  else if (sort === 'likes_desc') orderBy = 'total_likes DESC';

  const sql = `
    SELECT n.*, COALESCE(SUM(cl.likes),0) AS total_likes
    FROM novels n
    LEFT JOIN (
        SELECT chapter_id, COUNT(*) AS likes
        FROM chapter_likes
        GROUP BY chapter_id
    ) cl ON cl.chapter_id IN (
        SELECT chapter_id FROM chapters WHERE novel_id = n.novel_id
    )
    GROUP BY n.novel_id
    ORDER BY ${orderBy}
  `;

  db.query(sql, (err, results) => {
    if (err) return res.render('index', { data: [], user: req.user });
    res.render('index', { data: results, user: req.user });
  });
})

router.get('/register', isLoggedIn, (req, res) => {
  res.render('register', { message: '', user: req.user })
})

router.get('/coin', isLoggedIn, (req, res) => {
  res.render('coin');
})
router.get('/login', isLoggedIn, (req, res) => {
  res.render('login', { message: '', user: req.user })
})
router.get('/addNovel', isLoggedIn, (req, res) => {
  res.render('addNovel', { message: '' })
})
router.get('/YourNovel', isLoggedIn, (req, res) => {
  const userId = req.user.user_id;
  console.log(userId);

  db.query(
    "SELECT * FROM novels WHERE user_id = ? ORDER BY title ASC",
    [userId],
    (err, results) => {
      if (err) return res.render('index', { data: [], user: req.user });
      res.render('YourNovel', { data: results, user: req.user });
    }
  );
})
router.get('/profile', isLoggedIn, (req, res) => {
  const userId = req.user.user_id;

  // นับจำนวนคอมเมนต์ของ chapter ตัวเอง
  const commentSql = `
    SELECT COUNT(c.comment_id) AS comment_count
    FROM comments c
    JOIN chapters ch ON c.chapter_id = ch.chapter_id
    JOIN novels n ON ch.novel_id = n.novel_id
    WHERE n.user_id = ?
  `;

  db.query(commentSql, [userId], (err, commentResults) => {
    if (err) {
      console.error(err);
      return res.render('profile', { user: {}, commentCount: 0 });
    }

    const commentCount = commentResults[0]?.comment_count || 0;

    // Query ข้อมูล user ครบทุกฟิลด์
    const userSql = `SELECT * FROM users WHERE user_id = ?`;

    db.query(userSql, [userId], (err2, userResults) => {
      if (err2) {
        console.error(err2);
        return res.render('profile', { user: {}, commentCount });
      }

      const user = userResults[0] || {};
      res.render('profile', {
        user,          
        commentCount,    
        alertMessage:""
      });
    });
  });
});
router.get('/Reviews', isLoggedIn, (req, res) => {
  const userId = req.user.user_id;

  const sql = `
    SELECT 
      c.comment_id,
      c.content       AS comment_content,
      c.created_at    AS comment_date,
      ch.chapter_id,
      ch.chapter_number,
      n.novel_id,
      n.title         AS novel_title,
      u.username      AS commenter
    FROM comments c
    JOIN chapters ch ON c.chapter_id = ch.chapter_id
    JOIN novels n ON ch.novel_id = n.novel_id
    JOIN users u ON c.user_id = u.user_id
    WHERE n.user_id = ?
    ORDER BY n.title ASC, ch.chapter_number ASC, c.created_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) return res.render('index', { data: [], user: req.user });
    res.render('Reviews', { data: results, user: req.user });
  });
});
router.get('/chatbot', isLoggedIn, (req, res) => {
  res.render("chatbot")
});
router.get('/novel/:id/addChapter', isLoggedIn, (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM novels WHERE novel_id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.send("Novel not found");

    const novel = results[0];
    res.render('addChapter', { novel: novel, user: req.user });
  });
});
router.get('/read/:id', isLoggedIn, (req, res) => {
  const novelId = req.params.id;
  const user = req.user;
  console.log(user);

  db.query("SELECT * FROM novels WHERE novel_id = ?", [novelId], (err, novelResults) => {
    if (err || novelResults.length === 0) return res.send("Novel not found");

    const novel = novelResults[0];

    db.query("SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", [novelId], (err, chapterResults) => {
      if (err) {
        console.error(err);
        return res.send("Error loading chapters");
      }

      if (!user) {
        // ไม่ล็อกอิน → cost > 0 = locked
        const chaptersWithLock = chapterResults.map(ch => ({
          ...ch,
          locked: ch.cost > 0
        }));
        return res.render('readNovel', { novel, chapters: chaptersWithLock, user: null });
      } 
      else if (user.is_premium === 1) {
        // มี premium → อ่านได้ทุกตอน
        const chaptersWithLock = chapterResults.map(ch => ({
          ...ch,
          locked: false
        }));
        return res.render('readNovel', { novel, chapters: chaptersWithLock, user });
      }

      // ล็อกอินแล้ว ไม่มี premium → เช็ค progress
      db.query(
        "SELECT chapter_number FROM user_progress WHERE user_id=? AND novel_id=? AND unlocked=1",
        [user.user_id, novelId],
        (err2, progressResults) => {
          if (err2) {
            console.error(err2);
            return res.send("Error checking progress");
          }

          const unlockedChapters = progressResults.map(r => r.chapter_number);

          const chaptersWithLock = chapterResults.map(ch => ({
            ...ch,
            locked: ch.cost > 0 && !unlockedChapters.includes(ch.chapter_number)
          }));

          res.render('readNovel', { novel, chapters: chaptersWithLock, user });
        }
      );
    });
  });
});

router.get('/logout', authController.logout);
router.get('/chapter/:id', isLoggedIn, (req, res) => {
  const chapterId = req.params.id;
  const user = req.user;

  // Get chapter info
  db.query("SELECT * FROM chapters WHERE chapter_id=?", [chapterId], (err, results) => {
    if (err || results.length === 0) return res.send("Chapter not found");
    const chapter = results[0];

    // Get novel title
    db.query("SELECT title FROM novels WHERE novel_id=?", [chapter.novel_id], (err2, novelRes) => {
      const novelName = novelRes[0].title;

      // Get comments
      db.query(`
                SELECT comments.*, users.username 
                FROM comments 
                JOIN users ON comments.user_id = users.user_id 
                WHERE chapter_id=? 
                ORDER BY created_at DESC
            `, [chapterId], (err3, comments) => {

        // Get likes count
        db.query(
          "SELECT COUNT(*) AS likes FROM chapter_likes WHERE chapter_id=?",
          [chapterId],
          (err4, likeRes) => {
            const chapterLikes = likeRes[0].likes || 0;

            // Find prev/next chapters
            db.query(
              "SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number<? ORDER BY chapter_number DESC LIMIT 1",
              [chapter.novel_id, chapter.chapter_number],
              (err5, prevRes) => {
                const prevChapter = prevRes.length > 0 ? prevRes[0].chapter_id : null;

                db.query(
                  "SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number>? ORDER BY chapter_number ASC LIMIT 1",
                  [chapter.novel_id, chapter.chapter_number],
                  (err6, nextRes) => {
                    const nextChapter = nextRes.length > 0 ? nextRes[0].chapter_id : null;

                    // Check if chapter is locked
                    if (chapter.cost > 0 && user) {
                      db.query(
                        "SELECT unlocked FROM user_progress WHERE user_id=? AND novel_id=? AND chapter_number=?",
                        [user.user_id, chapter.novel_id, chapter.chapter_number],
                        (err7, progRes) => {
                          const locked = !(progRes.length > 0 && progRes[0].unlocked);

                          res.render("readChapter", {
                            chapter,
                            novelName,
                            prevChapter,
                            nextChapter,
                            comments,
                            user,
                            locked,
                            loggedIn: true,
                            chapterLikes
                          });
                        }
                      );
                    } else {
                      res.render("readChapter", {
                        chapter,
                        novelName,
                        prevChapter,
                        nextChapter,
                        comments,
                        user,
                        locked: chapter.cost > 0,
                        loggedIn: !!user,
                        chapterLikes
                      });
                    }

                  });
              });
          });
      });
    });
  });
});
router.post('/chatbot', isLoggedIn, (req, res) => {
  const userId = req.user.user_id;
  const { message } = req.body;

  // list คำสั่งที่รองรับ
  const commands = [
    "เหรียญ / coin",
    "premium / สมาชิก",
    "รายการฝากถอน / transaction",
    "เติมเงิน",
    "ซื้อ chapter"
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
    res.json({ reply: "คุณสามารถเติมเงินได้โดยโอนผ่านระบบ Bath-to-Coin" });

  } else if (/ซื้อ chapter/i.test(message)) {
    res.json({ reply: "คุณสามารถซื้อ chapter โดยใช้ coins ของคุณ" });

  } else {
    // else แสดง list คำสั่งทั้งหมด
    let reply = "คำสั่งที่รองรับ:\n";
    commands.forEach(cmd => { reply += `- ${cmd}\n`; });
    res.json({ reply });
  }
});





// Post routes
router.post("/addNovel", isLoggedIn, authController.addNovel);
router.post('/novel/:id/addChapter', isLoggedIn, authController.addChapter);
router.post("/chapter/:id/comment", isLoggedIn, authController.addComment);
router.post("/chapter/:id/unlock", isLoggedIn, authController.unlock)
router.post("/coin", isLoggedIn, authController.coin);
router.post("/chapter/:id/like", isLoggedIn, authController.likeChapter);
router.post("/premium", isLoggedIn, authController.premium);

module.exports = router;

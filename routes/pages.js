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
  db.query("SELECT * FROM novels ORDER BY title ASC", (err, results) => {
    if (err) return res.render('index', { data: [], user: req.user });
    res.render('index', { data: results, user: req.user });
  });
});

router.get('/register', isLoggedIn, (req, res) => {
  res.render('register', { message: '', user: req.user })
})

router.get('/coin',isLoggedIn,(req,res)=>{
  res.render('coin');
})

router.get('/login', isLoggedIn, (req, res) => {
  res.render('login', { message: '', user: req.user })
})

router.get('/addNovel', isLoggedIn, (req, res) => {
  res.render('addNovel', { message: '' })
})
router.get('/YourNovel',isLoggedIn,(req,res)=>{
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
        user,           // ส่งข้อมูล user ครบทุกฟิลด์
        commentCount    // จำนวนคอมเมนต์
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
router.get('/novel/:id/addChapter', isLoggedIn, (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM novels WHERE novel_id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.send("Novel not found");

    const novel = results[0];
    res.render('addChapter', { novel: novel, user: req.user });
  });
});

// อ่าน novel + chapters
router.get('/read/:id', isLoggedIn, (req, res) => {
  const novelId = req.params.id;
  const user = req.user;

  db.query("SELECT * FROM novels WHERE novel_id = ?", [novelId], (err, novelResults) => {
    if (err || novelResults.length === 0) return res.send("Novel not found");

    const novel = novelResults[0];

    db.query("SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", [novelId], (err, chapterResults) => {
      if (err) {
        console.error(err);
        return res.send("Error loading chapters");
      }

      if (!user) {
        // ถ้าไม่ได้ล็อกอิน → ทุกตอนที่ cost > 0 ให้ locked = true
        const chaptersWithLock = chapterResults.map(ch => ({
          ...ch,
          locked: ch.cost > 0
        }));
        return res.render('readNovel', { novel, chapters: chaptersWithLock, user: null });
      }

      // ถ้า login → เช็คว่าผู้ใช้ unlock ตอนอะไรแล้ว
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

// logout
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



        // Find prev/next chapters
        db.query("SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number<? ORDER BY chapter_number DESC LIMIT 1",
          [chapter.novel_id, chapter.chapter_number],
          (err4, prevRes) => {
            const prevChapter = prevRes.length > 0 ? prevRes[0].chapter_id : null;

            db.query("SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number>? ORDER BY chapter_number ASC LIMIT 1",
              [chapter.novel_id, chapter.chapter_number],
              (err5, nextRes) => {
                const nextChapter = nextRes.length > 0 ? nextRes[0].chapter_id : null;

                // Check if chapter is locked
                if (chapter.cost > 0) {
                  db.query(
                    "SELECT unlocked FROM user_progress WHERE user_id=? AND novel_id=? AND chapter_number=?",
                    [user.user_id, chapter.novel_id, chapter.chapter_number],
                    (err6, progRes) => {
                      const locked = !(progRes.length > 0 && progRes[0].unlocked);

                      res.render("readChapter", {
                        chapter,
                        novelName,
                        prevChapter,
                        nextChapter,
                        comments,
                        user,
                        locked,
                        loggedIn: true
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
                    locked: false,
                    loggedIn: true
                  });
                }
              });
          });
      });
    });
  });
});

// Post routes
router.post("/addNovel", isLoggedIn, authController.addNovel);
router.post('/novel/:id/addChapter', isLoggedIn, authController.addChapter);
router.post("/chapter/:id/comment",isLoggedIn, authController.addComment);
router.post("/chapter/:id/unlock",isLoggedIn, authController.unlock)
router.post("/coin",isLoggedIn, authController.coin);
router.post("/chapter/:id/like", isLoggedIn, authController.likeChapter);

module.exports = router;

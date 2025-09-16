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
  const id = req.params.id;

  db.query("SELECT * FROM novels WHERE novel_id = ?", [id], (err, novelResults) => {
    if (err || novelResults.length === 0) return res.send("Novel not found");

    const novel = novelResults[0];

    db.query("SELECT * FROM chapters WHERE novel_id = ? ORDER BY chapter_number ASC", [id], (err, chapterResults) => {
      if (err) {
        console.error(err);
        chapterResults = [];
      }

      res.render('readNovel', { novel: novel, chapters: chapterResults, user: req.user });
    });
  });
});

// logout
router.get('/logout', authController.logout);

router.get('/chapter/:id', isLoggedIn, (req, res) => {
    const chapterId = req.params.id;
    const user = req.user;

    // Fetch chapter details including cost
    db.query("SELECT * FROM chapters WHERE chapter_id = ?", [chapterId], (err, results) => {
        if (err || results.length === 0) return res.send("Chapter not found");

        const chapter = results[0];

        // Check if chapter costs coins
        const chapterCost = chapter.cost || 0;

        // Check if user has already unlocked this chapter
        db.query(
            "SELECT unlocked FROM user_progress WHERE user_id=? AND novel_id=? AND chapter_number=?",
            [user.user_id, chapter.novel_id, chapter.chapter_number],
            (err2, progressRes) => {
                let unlocked = progressRes.length > 0 ? progressRes[0].unlocked : false;

                if (!unlocked && chapterCost > 0) {
                    // Chapter is locked and costs coins
                    db.query("SELECT coins FROM users WHERE user_id=?", [user.user_id], (err3, userRes) => {
                        if (err3) return res.send("Database error");
                        const userCoins = userRes[0].coins;

                        if (userCoins < chapterCost) {
                            return res.send(`You need ${chapterCost} coins to unlock this chapter.`);
                        }

                        // Deduct coins from user
                        const newCoins = userCoins - chapterCost;
                        db.query("UPDATE users SET coins=? WHERE user_id=?", [newCoins, user.user_id], (err4) => {
                            if (err4) return res.send("Failed to update coins");

                            // Record coin transaction
                            const sqlCoin = "INSERT INTO coin_payments (user_id, type, method, amount_coin) VALUES (?, 'spend', 'coin_to_chapter', ?)";
                            db.query(sqlCoin, [user.user_id, chapterCost], (err5) => {
                                if (err5) console.error(err5);

                                // Mark chapter as unlocked
                                db.query(
                                    "INSERT INTO user_progress (user_id, novel_id, chapter_number, unlocked) VALUES (?, ?, ?, ?)",
                                    [user.user_id, chapter.novel_id, chapter.chapter_number, true],
                                    (err6) => {
                                        if (err6) console.error(err6);
                                        renderChapter();
                                    }
                                );
                            });
                        });
                    });
                } else {
                    // Already unlocked or free chapter
                    renderChapter();
                }

                function renderChapter() {
                    // Fetch novel name
                    db.query("SELECT title FROM novels WHERE novel_id=?", [chapter.novel_id], (err7, novelRes) => {
                        if (err7 || novelRes.length === 0) return res.send("Novel not found");
                        const novelName = novelRes[0].title;

                        // Fetch previous and next chapter IDs
                        const sqlPrev = "SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number<? ORDER BY chapter_number DESC LIMIT 1";
                        const sqlNext = "SELECT chapter_id FROM chapters WHERE novel_id=? AND chapter_number>? ORDER BY chapter_number ASC LIMIT 1";

                        db.query(sqlPrev, [chapter.novel_id, chapter.chapter_number], (err8, prevRes) => {
                            db.query(sqlNext, [chapter.novel_id, chapter.chapter_number], (err9, nextRes) => {
                                const prevChapter = prevRes.length > 0 ? prevRes[0].chapter_id : null;
                                const nextChapter = nextRes.length > 0 ? nextRes[0].chapter_id : null;

                                // Fetch comments for this chapter
                                db.query(
                                    `SELECT comments.*, users.username 
                                     FROM comments JOIN users ON comments.user_id=users.user_id 
                                     WHERE chapter_id=? ORDER BY created_at DESC`,
                                    [chapterId],
                                    (err10, comments) => {
                                        if (err10) comments = [];
                                        res.render('readChapter', { chapter, novelName, prevChapter, nextChapter, comments, user });
                                    }
                                );
                            });
                        });
                    });
                }
            }
        );
    });
});

// Post routes
router.post("/addNovel", isLoggedIn, authController.addNovel);
router.post('/novel/:id/addChapter', isLoggedIn, authController.addChapter);
router.post("/chapter/:id/comment",isLoggedIn, authController.addComment);
router.post("/coin",isLoggedIn, authController.coin);

module.exports = router;

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

    // ดึง chapter ตาม chapter_id
    db.query("SELECT * FROM chapters WHERE chapter_id = ?", [chapterId], (err, results) => {
        if (err || results.length === 0) return res.send("Chapter not found");

        const chapter = results[0];

        // ดึงชื่อ novel
        db.query("SELECT title FROM novels WHERE novel_id = ?", [chapter.novel_id], (err2, novelRes) => {
            if (err2 || novelRes.length === 0) return res.send("Novel not found for this chapter");

            const novelName = novelRes[0].title;

            // ดึง previous และ next chapter
            const sqlPrev = `
                SELECT chapter_id FROM chapters 
                WHERE novel_id = ? AND chapter_number < ? 
                ORDER BY chapter_number DESC LIMIT 1
            `;
            const sqlNext = `
                SELECT chapter_id FROM chapters 
                WHERE novel_id = ? AND chapter_number > ? 
                ORDER BY chapter_number ASC LIMIT 1
            `;

            db.query(sqlPrev, [chapter.novel_id, chapter.chapter_number], (err3, prevRes) => {
                db.query(sqlNext, [chapter.novel_id, chapter.chapter_number], (err4, nextRes) => {
                    const prevChapter = prevRes.length > 0 ? prevRes[0].chapter_id : null;
                    const nextChapter = nextRes.length > 0 ? nextRes[0].chapter_id : null;

                    res.render('readChapter', { chapter, novelName, prevChapter, nextChapter });
                });
            });
        });
    });
});


// Post routes
router.post("/addNovel", isLoggedIn, authController.addNovel);
router.post('/novel/:id/addChapter', isLoggedIn, authController.addChapter);

module.exports = router;

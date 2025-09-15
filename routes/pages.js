//รวม Get
const mysql = require('mysql2')
const express = require("express")
const router = express.Router();
const { isLoggedIn } = require('../controllers/authMiddleware');

const db = mysql.createConnection({
    host: process.env.DATABASE_HOST,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE,
})

router.get('/',(req,res)=>{
    res.render('login', { message: '' ,user: req.user})
})
router.get('/index', isLoggedIn, (req, res) => {
    res.render('index', { user: req.user });
});
router.get('/register',(req,res)=>{
    res.render('register', { message: '' })
})
router.get('/login',(req,res)=>{
    res.render('login', { message: '' })
})
router.get('/addNovel',(req,res)=>{
    res.render('addNovel', { message: '' })
})

// router.get('/read/:id', (req, res) => {
//   const id = req.params.id;
//   db.query("SELECT * FROM novell WHERE idNovel1 = ?", [id], (err, results) => {
//     if (err || results.length === 0) return res.send('Novel not found');
//     res.render('readNovel', { novel: results[0] });
//   });
// });

router.get('/novel/:id/addChapter', (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM novell WHERE idNovel1 = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.send("Novel not found");
    res.render('addChapter', { novel: results[0] });
  });
});
router.get('/read/:id', (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM novell WHERE idNovel1 = ?", [id], (err, novelResults) => {
    if (err || novelResults.length === 0) return res.send("Novel not found");

    const novel = novelResults[0];

    db.query("SELECT * FROM chapters WHERE idNovel1 = ? ORDER BY chaptersNum ASC", [id], (err, chapterResults) => {
      if (err) {
        console.error(err);
        chapterResults = []; 
      }

      res.render('readNovel', { novel: novel, chapters: chapterResults });
    });
  });
});

router.get('/chapter/:id', (req, res) => {
  const chapterId = req.params.id;

  // Get current chapter
  db.query("SELECT * FROM chapters WHERE idchapters = ?", [chapterId], (err, results) => {
    if (err || results.length === 0) return res.send("Chapter not found");

    const chapter = results[0];

    // Get novel name for breadcrumb
    db.query("SELECT name FROM novell WHERE idNovel1 = ?", [chapter.idNovel1], (err2, novelRes) => {
      const novelName = novelRes[0]?.name || 'Unknown';

      // Now get previous and next chapters
      const sqlPrev = "SELECT idchapters FROM chapters WHERE idNovel1 = ? AND chaptersNum < ? ORDER BY chaptersNum DESC LIMIT 1";
      const sqlNext = "SELECT idchapters FROM chapters WHERE idNovel1 = ? AND chaptersNum > ? ORDER BY chaptersNum ASC LIMIT 1";

      db.query(sqlPrev, [chapter.idNovel1, chapter.chaptersNum], (err3, prevRes) => {
        db.query(sqlNext, [chapter.idNovel1, chapter.chaptersNum], (err4, nextRes) => {
          const prevChapter = prevRes.length > 0 ? prevRes[0].idchapters : null;
          const nextChapter = nextRes.length > 0 ? nextRes[0].idchapters : null;

          res.render('readChapter', { chapter, novelName, prevChapter, nextChapter });
        });
      });
    });
  });
});

//has to be here
router.post('/novel/:id/addChapter', (req, res) => {
  const id = req.params.id;
  const { title, content, chaptersNum } = req.body;
  const sql = "INSERT INTO chapters (idNovel1, title, content, chaptersNum) VALUES (?, ?, ?, ?)";

  db.query(sql, [id, title, content, chaptersNum || null], (err, result) => {
    if (err) return res.send("Failed to add chapter");
    res.redirect(`/read/${id}`);
  });
});
module.exports = router;
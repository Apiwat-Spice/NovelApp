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

router.get('/', isLoggedIn,(req,res)=>{
    res.render('login', { message: '' ,user: req.user})
})
router.get('/index', isLoggedIn, (req, res) => {
    db.query("SELECT * FROM novels ORDER BY title ASC", (err, results) => {
        if (err) return res.render('index', { data: [], user: req.user });
        res.render('index', { data: results, user: req.user });
    });
});
router.get('/register', isLoggedIn,(req,res)=>{
    res.render('register', { message: '', user: req.user })
})
router.get('/login', isLoggedIn,(req,res)=>{
    res.render('login', { message: '', user: req.user })
})
router.get('/addNovel', isLoggedIn,(req,res)=>{
    res.render('addNovel', { message: '' })
})
router.get('/novel/:id/addChapter', isLoggedIn, (req, res) => {
  const id = req.params.id;
  db.query("SELECT * FROM novels WHERE id = ?", [id], (err, results) => {
    if (err || results.length === 0) return res.send("Novel not found");
    res.render('addChapter', { novel: results[0], user: req.user });
  });
});
router.get('/read/:id', isLoggedIn, (req, res) => {
  const id = req.params.id;

  db.query("SELECT * FROM novels WHERE id = ?", [id], (err, novelResults) => {
    if (err || novelResults.length === 0) return res.send("Novel not found");

    const novel = novelResults[0];

    db.query("SELECT * FROM chapters WHERE idNovel1 = ? ORDER BY chaptersNum ASC", [id], (err, chapterResults) => {
      if (err) {
        console.error(err);
        chapterResults = []; 
      }

      res.render('readNovel', { novel: novel, chapters: chapterResults, user: req.user });
    });
  });
});
router.get('/logout',authController.logout);
router.get('/chapter/:id', isLoggedIn, (req, res) => {
  const chapterId = req.params.id;

  db.query("SELECT * FROM chapters WHERE idchapters = ?", [chapterId], (err, results) => {
    if (err || results.length === 0) return res.send("Chapter not found");

    const chapter = results[0];

    // Get novel name for breadcrumb
    db.query("SELECT name FROM novell WHERE idNovel1 = ?", [chapter.idNovel1], (err2, novelRes) => {
      const novelName = novelRes[0]?.name || 'Unknown';
      res.render('readChapter', { chapter, novelName, user: req.user });
    });
  });
});

router.post("/addNovel", isLoggedIn,authController.addNovel);
router.post('/novel/:id/addChapter', isLoggedIn,authController.addChapter);

module.exports = router;
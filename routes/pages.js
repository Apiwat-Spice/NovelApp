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

router.get('/',(req,res)=>{
    res.render('login', { message: '' ,user: req.user})
})
router.get('/index', isLoggedIn, (req, res) => {
    res.render('index', { data: results, user: req.user });
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
router.get('/logout',authController.logout);
router.get('/chapter/:id', (req, res) => {
  const chapterId = req.params.id;

  db.query("SELECT * FROM chapters WHERE idchapters = ?", [chapterId], (err, results) => {
    if (err || results.length === 0) return res.send("Chapter not found");

    const chapter = results[0];

    // Get novel name for breadcrumb
    db.query("SELECT name FROM novell WHERE idNovel1 = ?", [chapter.idNovel1], (err2, novelRes) => {
      const novelName = novelRes[0]?.name || 'Unknown';
      res.render('readChapter', { chapter, novelName });
    });
  });
});

router.post("/addNovel",authController.addNovel);
router.post('/novel/:id/addChapter',authController.addChapter);
module.exports = router;
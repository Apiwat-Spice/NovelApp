//รวม Post
const express = require("express")
const authController = require('../controllers/auth');
const router = express.Router();

router.post('/register',authController.register)
router.post('/login',authController.login)

router.post('/auth/logout', (req, res) => {
  req.session.destroy(err => {
    if(err) return res.status(500).send("Logout failed");
    res.clearCookie('connect.sid'); 
    res.redirect('/login');
  });
});

router.post("/addNovel", (req, res) => {
  const values = [req.body.name, req.body.text, req.body.url];
  const sql = "INSERT INTO novels (name, `text`, url) VALUES (?, ?, ?)";

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error(err);
      return res.render("index", { data: [] }); 
    }
    // query ใหม่เพื่อดึงข้อมูลทั้งหมด
    db.query("SELECT * FROM novell ORDER BY name ASC", (err, results) => {
      if (err) {
        console.error(err);
        return res.render("index", { data: [] });
      }
      res.render("index", { data: results }); 
    });
  });
});

module.exports = router;
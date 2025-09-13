//รวม Get
const express = require("express")
const router = express.Router();
const { isLoggedIn } = require('../controllers/authMiddleware');
router.get('/',(req,res)=>{
    res.render('login', { message: '' })
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
module.exports = router;
const jwt = require('jsonwebtoken');
// D:\ApiwatSpice\RealS\Project101\NovelApp\controllers\authMiddleware.js
exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        res.locals.loggedIn = false; // ส่งค่าไปทุก view
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        res.locals.loggedIn = true; // ส่งค่าไปทุก view
        next();
    } catch (err) {
        console.log(err);
        res.locals.loggedIn = false;
        return next();
    }
}

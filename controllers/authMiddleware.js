const jwt = require('jsonwebtoken');

exports.isLoggedIn = (req, res, next) => {
  const token = req.cookies.jwt;
  if (!token) {
    res.locals.loggedIn = false;
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      user_id: decoded.user_id,
      username: decoded.username,
      email: decoded.email,
      coins: decoded.coins,
      is_premium: decoded.is_premium,
      premium_expire: decoded.premium_expire
    };
    res.locals.loggedIn = true;
    next();
    } catch (err) {
    console.log("JWT verify error:", err.message);
    res.locals.loggedIn = false;
    req.user = null;
    return next();
  }
};

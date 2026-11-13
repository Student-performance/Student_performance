function ensureAuthenticated(req, res, next) {
    if (req.session.user && (req.session.userId || (req.session.user && req.session.user.id))) return next();
    req.session.returnTo = req.originalUrl;
    res.redirect('/login');
}

function ensureGuest(req, res, next) {
    if (req.session && (req.session.userId || (req.session.user && req.session.user.id))) return res.redirect('/');
    next();
}

module.exports = { ensureAuthenticated, ensureGuest };
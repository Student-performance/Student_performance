const router = require('express').Router();
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const db = require('../db/connection');
const { ensureAuthenticated } = require('../middleware/auth');

const render = (res, page, error, status = 200) => res.status(status).render(`auth/${page}`, { title: page, error });
router.get('/login', (req, res) => render(res, 'login', null));
router.get('/register', (req, res) => render(res, 'register', null));
router.post('/register', async (req, res, next) => {
    const username = String(req.body.username || '').trim().toLowerCase();
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password, confirmPassword } = req.body;

    // test username, email and password for validity. Password must be 8–72 bytes (not characters) and match confirmPassword.
    if (!/^[a-z0-9_-]{3,40}$/.test(username) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password) > 72 || password !== confirmPassword) {
        return render(res, 'register', 'Enter a unique username (3–40 letters, digits, _ or -), email and matching password (8–72 bytes).', 400);
    }

    try {
        const hash = await bcrypt.hash(password, 10);
        db.run('INSERT INTO accounts (id, email, username, password_hash, role) VALUES (?, ?, ?, ?, ?)',
            randomUUID(), email, username, hash, 'student');
        res.redirect('/login');
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') return render(res, 'register', 'Email or username already registered.', 400);
        next(error);
    }
});

router.post('/login', async (req, res, next) => {
    try {
        const identifier = String(req.body.username || req.body.email || '').trim().toLowerCase();
        const user = db.get('SELECT * FROM accounts WHERE username = ? OR email = ?', identifier, identifier);
        if(!user || typeof req.body.password !== 'string' || !(await bcrypt.compare(req.body.password, user.password_hash))) {
            return render(res, 'login', 'Invalid username/email or password.', 400);
        }
        req.session.regenerate(error => {
            if( error ) return next(error);
            req.session.userId = user.id;
            req.session.user = {
                id: user.id, 
                username: user.username,
                role: user.role
            }
            req.session.save(error => error ? next(error) : res.redirect('/datasets'));
        })

    } catch (error) {
        next(error);
    }
})

router.post('/logout', ensureAuthenticated, (req, res, next) => {
    req.session.destroy(error => {
        if( error ) return next(error);
        res.clearCookie('connect.sid');
        res.redirect('/login');
    })
})

module.exports = router;
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const SQLiteStore = require('connect-sqlite3')(session);
const layouts = require('express-ejs-layouts');
const csrf = require('csurf');
const fs = require('node:fs');
const path = require('node:path');
const { runMigrations } = require('./src/db/migrate');

runMigrations();

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.use(layouts);

const sampleRouter = path.join(__dirname, 'src/routes/samples.js');

if (fs.existsSync(sampleRouter)) app.use('/', require(sampleRouter));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));

const filename = path.resolve(process.env.DATABASE_PATH || path.join(__dirname, 'data/app.sqlite'));

if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
    throw new Error('Set SESSION_SECRET to at least 32 random characters.');
}

const sessionStore = new SQLiteStore({ db: path.basename(filename), dir: path.dirname(filename), table: 'sessions' });

app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || 'local-course-demo-change-this-secret',
    resave: false, saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 86400000 }
}));

const csrfProtection = csrf();

app.use((req, res, next) => {
    // Multipart body must be parsed by Multer before the upload router verifies CSRF.
    if (req.path.replace(/\/$/, '') === '/datasets/upload' && req.method === 'POST') return next();
    csrfProtection(req, res, next);
});

app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : '';
    next();
});

app.use('/', require('./src/routes/auth'));

// Only these not-yet-delivered sprint routers may be absent. Existing files must load successfully.
for (const [mount, filename] of [['/datasets', 'datasets'], ['/', 'runs'], ['/', 'evaluation'], ['/', 'help']]) {
    const source = path.join(__dirname, 'src/routes', filename + '.js');
    if (fs.existsSync(source)) app.use(mount, require(source));
}

if (!fs.existsSync(path.join(__dirname, 'src/routes/datasets.js'))) {
    app.get('/datasets', require('./src/middleware/auth').ensureAuthenticated, (req, res) =>
        res.render('datasets/index', { title: 'Dashboard', datasets: [], recentRuns: [], pagination: { page: 1, totalPages: 1 } }));
}

app.get('/', (req, res) => res.redirect(req.session.userId ? '/datasets' : '/login'));

app.use((req, res) => res.status(404).render('errors/404', { title: 'Not found' }));

app.use((error, req, res, next) => {
    const status = error.code === 'EBADCSRFTOKEN' ? 403 : error.code === 'LIMIT_FILE_SIZE' ? 400 : error.status || 500;
    if (status >= 500) console.error(error);
    res.locals.user = res.locals.user || null;
    res.locals.csrfToken = res.locals.csrfToken || '';
    res.status(status).render('errors/500', {
        title: String(status), error: status >= 500 ? 'Unable to complete this request. Please retry.' : error.message
    });
});

let server;

if (require.main === module) {
    server = app.listen(process.env.PORT === undefined ? 3000 : Number(process.env.PORT), () => console.log(`Listening on ${server.address().port}`));
}

module.exports = { app, server, sessionStore };
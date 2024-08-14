const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt'); // Untuk verifikasi password
const session = require('express-session'); // Untuk session management
const helmet = require('helmet'); // Untuk keamanan HTTP header
const rateLimit = require('express-rate-limit'); // Untuk rate limiting

const app = express();

// Menggunakan Helmet untuk keamanan header
app.use(helmet());

// Rate limiting untuk mencegah serangan DDoS
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 menit
    max: 100, // Batas maksimum 100 permintaan per 15 menit
    message: "Terlalu banyak permintaan dari IP ini, coba lagi nanti."
});

app.use(limiter);

app.use(session({
    secret: 'string_yang_sangat_rahasia_yang_sulit_ditebak',
    resave: false,
    saveUninitialized: true,
    name: 'GorCookie',
    cookie: {
        httpOnly: true,  // Hanya dapat diakses melalui HTTP(S)
        secure: process.env.NODE_ENV === 'production', // Hanya kirimkan cookie di HTTPS
        maxAge: 24 * 60 * 60 * 1000 // Durasi cookie (misalnya 1 hari)
    }
}));


app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'gorags'
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database connected');
});

// Middleware untuk memastikan user sudah login
function ensureAuthenticated(req, res, next) {
    if (req.session.isAuthenticated) {
        return next();
    }
    res.redirect('/admin');
}

// Fungsi untuk mencari admin berdasarkan nama atau nomor telepon
function findAdminByCredentials(identifier, callback) {
    const sql = "SELECT * FROM admin WHERE Nama = ? OR nomor_telepon = ?";
    db.query(sql, [identifier, identifier], callback);
}

// Route untuk halaman input sewa
app.get('/', (req, res) => {
    res.render('index');
});

app.post('/sewa', [
    body('nama').isString().notEmpty().withMessage('Nama harus berupa teks dan tidak boleh kosong'),
    body('tanggal').isISO8601().withMessage('Tanggal harus berupa tanggal yang valid'),
    body('jamMasuk').isString().notEmpty().withMessage('Jam masuk tidak boleh kosong'),
    body('jamKeluar').isString().notEmpty().withMessage('Jam keluar tidak boleh kosong'),
    body('nomorTelepon').isNumeric().isLength({ min: 10, max: 13 }).withMessage('Masukan nomor telepon aktif dan benar')
], (req, res) => {
    console.log('Data yang diterima:', req.body); // Debugging: lihat data yang diterima dari form
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        console.log('Errors:', errors.array()); // Debugging: lihat kesalahan validasi
        return res.status(400).json({ success: false, message: errors.array()[0].msg });
    }

    const { nama, tanggal, jamMasuk, jamKeluar, nomorTelepon } = req.body;
    const sql = "INSERT INTO sewa (nama, tanggal, jam_masuk, jam_keluar, nomor_telepon) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nama, tanggal, jamMasuk, jamKeluar, nomorTelepon], (err, result) => {
        if (err) {
            console.error('Error:', err);
            return res.status(500).json({ success: false, message: 'Sewa Gagal Masukan Data Dengan Benar.' });
        }
        res.status(200).json({ success: true, message: 'Sewa Telah Berhasil Mohon untuk datang tepat waktu.' });
    });
});

// Route untuk halaman jadwal
app.get('/jadwal', (req, res) => {
    res.render('jadwal', { data: [], moment: moment });
});

// Route untuk pencarian jadwal berdasarkan tanggal
app.get('/search', (req, res) => {
    const tanggal = req.query.tanggal;
    const sql = "SELECT * FROM sewa WHERE tanggal = ?";
    db.query(sql, [tanggal], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.render('jadwal', {
                data: result,
                selectedDate: tanggal,
                moment: moment
            });
        }
    });
});

// Route untuk menghapus data sewa
app.post('/path-to-delete-endpoint', (req, res) => {
    const { nomor_telepon, tanggal, jam_masuk, jam_keluar } = req.body;

    const query = `
        DELETE FROM sewa 
        WHERE nomor_telepon = ? 
          AND tanggal = ? 
          AND jam_masuk = ? 
          AND jam_keluar = ?
    `;

    db.query(query, [nomor_telepon, tanggal, jam_masuk, jam_keluar], (error, results) => {
        if (error) {
            console.error('Error deleting record:', error);
            return res.status(500).json({ success: false, message: 'Terjadi kesalahan saat menghapus data.' });
        }

        if (results.affectedRows > 0) {
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, message: 'Data tidak ditemukan.' });
        }
    });
});

// Route untuk verifikasi nomor telepon dan tanggal
app.get('/verify-phone-date', (req, res) => {
    const { nomorTelepon, tanggal } = req.query;

    const sql = "SELECT * FROM sewa WHERE nomor_telepon = ? AND tanggal = ?";
    db.query(sql, [nomorTelepon, tanggal], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            return res.status(500).send('Internal Server Error');
        }

        res.json({ valid: result.length > 0 });
    });
});

// Route untuk menampilkan data pada modal update
app.get('/update-modal/:id', (req, res) => {
    const id = req.params.id;
    const sql = "SELECT * FROM sewa WHERE id = ?";
    db.query(sql, [id], (err, result) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.render('update-modal', { data: result[0] });
        }
    });
});

// Route untuk memperbarui data sewa
app.post('/update', (req, res) => {
    const { nomorTelepon, tanggal, nama, jamMasuk, jamKeluar } = req.body;

    const checkSql = "SELECT * FROM sewa WHERE nomor_telepon = ? AND tanggal = ?";
    db.query(checkSql, [nomorTelepon, tanggal], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            if (result.length === 0) {
                res.status(400).send('Nomor telepon tidak terdaftar pada tanggal ini.');
            } else {
                const updateSql = "UPDATE sewa SET nama = ?, jam_masuk = ?, jam_keluar = ? WHERE nomor_telepon = ? AND tanggal = ?";
                db.query(updateSql, [nama, jamMasuk, jamKeluar, nomorTelepon, tanggal], (err, result) => {
                    if (err) {
                        console.error('Error updating data:', err);
                        res.status(500).send('Internal Server Error');
                    } else {
                        res.redirect('/jadwal');
                    }
                });
            }
        }
    });
});

// Route untuk halaman login admin (GET)
app.get('/admin', (req, res) => {
    res.render('admin', { error: null });
});

// Route untuk login admin (POST)
app.post('/admin/login', [
    body('identifier').isString().notEmpty().withMessage('Identifier tidak boleh kosong'),
    body('password').isString().notEmpty().withMessage('Password tidak boleh kosong')
], (req, res) => {
    const { identifier, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    findAdminByCredentials(identifier, (err, result) => {
        if (err) {
            console.error('Terjadi kesalahan saat mencari admin:', err);
            return res.status(500).send('Terjadi kesalahan pada server.');
        }

        if (result.length === 0) {
            console.log('Login gagal: Admin tidak ditemukan.');
            return res.redirect('/admin?error=login');
        }

        const admin = result[0];
        const hashedPassword = admin.Password;

        bcrypt.compare(password, hashedPassword, (err, isMatch) => {
            if (err) {
                console.error('Error comparing passwords:', err);
                return res.redirect('/admin?error=server');
            }

            if (isMatch) {
                console.log('Login berhasil');
                req.session.isAuthenticated = true;
                res.redirect('/admin/dashboard');
            } else {
                console.log('Login gagal: Password salah');
                return res.redirect('/admin?error=password');
            }
        });
    });
});

// Route untuk logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Internal Server Error');
        }
        res.redirect('/admin'); // Redirect ke halaman login setelah logout
    });
});


// Route untuk dashboard admin
app.get('/admin/dashboard', ensureAuthenticated, (req, res) => {
    const sql = "SELECT * FROM sewa";
    db.query(sql, (err, result) => {
        if (err) {
            console.error('Error fetching data:', err);
            res.status(500).send('Internal Server Error');
        } else {
            res.render('admindashboard', { data: result, moment: moment });
        }
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

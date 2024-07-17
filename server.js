express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');
const moment = require('moment');
const { body, validationResult } = require('express-validator');
const app = express();

app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

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

app.use(bodyParser.urlencoded({ extended: true }));

// Route untuk halaman input sewa
app.get('/', (req, res) => {
    res.render('index');
});


// Route untuk menambah sewa dengan validasi input
app.post('/sewa', [
    body('nama').isString().notEmpty().withMessage('Nama harus berupa teks dan tidak boleh kosong'),
    body('tanggal').isISO8601().withMessage('Tanggal harus berupa tanggal yang valid'),
    body('jamMasuk').isString().notEmpty().withMessage('Jam masuk tidak boleh kosong'),
    body('jamKeluar').isString().notEmpty().withMessage('Jam keluar tidak boleh kosong'),
    body('nomorTelepon').isNumeric().isLength({ min: 10, max: 12 }).withMessage('Nomor telepon harus berupa angka dan panjangnya antara 10 hingga 12 digit')
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    const { nama, tanggal, jamMasuk, jamKeluar, nomorTelepon } = req.body;
    const sql = "INSERT INTO sewa (nama, tanggal, jam_masuk, jam_keluar, nomor_telepon) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nama, tanggal, jamMasuk, jamKeluar, nomorTelepon], (err, result) => {
        if (err) throw err;
        res.redirect('/');
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
            res.render('jadwal', { data: result, moment: moment });
        }
    });
});

// Route untuk delete jadwal
app.post('/delete', (req, res) => {
    const { nomorTelepon, tanggal } = req.body;
    const sql = "DELETE FROM sewa WHERE nomor_telepon = ? AND tanggal = ?";
    db.query(sql, [nomorTelepon, tanggal], (err, result) => {
        if (err) {
            console.error('Error executing query:', err);
            res.status(500).send('Internal Server Error');
        } else {
            console.log('Deleted successfully');
            res.redirect('/jadwal');
        }
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

// Route untuk melakukan update data
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

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

const express = require('express');
const mysql = require('mysql');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();

app.set('view engine', 'ejs');
// Serve static files from the "public" directory
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

app.post('/sewa', (req, res) => {
    const { nama, tanggal, jamMasuk, jamKeluar, nomorTelepon } = req.body;
    const sql = "INSERT INTO sewa (nama, tanggal, jam_masuk, jam_keluar, nomor_telepon) VALUES (?, ?, ?, ?, ?)";
    db.query(sql, [nama, tanggal, jamMasuk, jamKeluar, nomorTelepon], (err, result) => {
        if (err) throw err;
        res.redirect('/');
    });
});

// Route untuk halaman jadwal
app.get('/jadwal', (req, res) => {
    res.render('jadwal', { data: [] });
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
            res.render('jadwal', { data: result });
        }
    });
});

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});

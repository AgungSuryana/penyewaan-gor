const bcrypt = require('bcrypt');
const mysql = require('mysql');

// Konfigurasi koneksi database
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

// Password admin baru
const plainPassword = 'agung'; // Password yang ingin di-hash
const saltRounds = 10; // Jumlah rounds untuk bcrypt

// Hash password
bcrypt.hash(plainPassword, saltRounds, (err, hashedPassword) => {
    if (err) throw err;

    console.log('Hashed Password:', hashedPassword);

    // Data admin baru
    const adminData = {
        nama: 'Agu',
        nomor_telepon: '1234567890',
        Password: hashedPassword // Password yang sudah di-hash
    };

    // Query untuk menambah admin baru
    const sql = 'INSERT INTO admin (nama, nomor_telepon, Password) VALUES (?, ?, ?)';
    db.query(sql, [adminData.nama, adminData.nomor_telepon, adminData.Password], (err, result) => {
        if (err) {
            console.error('Error inserting admin:', err);
        } else {
            console.log('Admin added successfully');

            // Verifikasi password yang baru di-hash
            db.query('SELECT Password FROM admin WHERE nomor_telepon = ?', [adminData.nomor_telepon], (err, result) => {
                if (err) throw err;

                const hashedPasswordFromDB = result[0].Password;

                // Verifikasi hash password dari database
                bcrypt.compare(plainPassword, hashedPasswordFromDB, (err, isMatch) => {
                    if (err) throw err;
                    console.log('Password match result after insertion:', isMatch); // Harusnya true jika cocok
                    db.end(); // Menutup koneksi database
                });
            });
        }
    });
});

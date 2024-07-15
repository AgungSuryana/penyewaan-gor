const bcrypt = require('bcryptjs');

class user {
    constructor(no_telp, password, nama_pelanggan) {
        this.no_telp = no_telp;
        this.password = password;
        this.nama_pelanggan = nama_pelanggan;
    }

    static async findByNoTelpAndPassword(no_telp, password, db) {
        return new Promise((resolve, reject) => {
            db.query('SELECT * FROM pelanggan WHERE no_telp = ? AND password = ?', [no_telp, password], (err, result) => {
                if (err) reject(err);
                resolve(result[0]);
            });
        });
    }

    async save(db) {

        return new Promise((resolve, reject) => {
            db.query('INSERT INTO pelanggan (no_telp, password, Nama_pelanggan) VALUES (?, ?, ?)', [this.no_telp, this.password, this.nama_pelanggan], (err, result) => {
                if (err) reject(err);
                resolve(result);
            });
        });
    }

    static comparePassword(password, hashedPassword) {
        return bcrypt.compareSync(password, hashedPassword);
    }
}

module.exports = user;

const express = require('express');
const User = require('../models/user');
const router = express.Router();

module.exports = function (db) { // accept db connection as parameter
    // Register Route
    router.get('/register', (req, res) => {
        res.render('register', { title: 'Register' });
    });

    router.post('/register', async (req, res) => {
        const { no_telp, password, nama_pelanggan } = req.body;
        const user = new User(no_telp, password, nama_pelanggan);
        try {
            await user.save(db);
            res.redirect('/auth/login');
        } catch (err) {
            res.status(400).send('Error creating user: ' + err.message);
        }
    });

    // Login Route
    router.get('/login', (req, res) => {
        res.render('login', { title: 'Login' });
    });

    router.post('/login', async (req, res) => {
        const { no_telp, password } = req.body;
        try {
            const userRecord = await User.findByNoTelpAndPassword(no_telp, password, db);
            if (userRecord) {
                req.session.user = userRecord.no_telp;
                res.redirect('/');
            } else {
                res.render('login', { title: 'Login', error: 'Invalid credentials' });
            }
        } catch (err) {
            res.status(500).send('Error logging in: ' + err.message);
        }
    });


    return router;
};

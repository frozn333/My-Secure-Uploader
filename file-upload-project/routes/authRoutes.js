const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- Helper function to create JWT payload ---
const getPayload = (user) => ({
    user: { 
        id: user.id,
        role: user.role // NOW INCLUDING ROLE IN THE TOKEN!
    }
});

// @route POST /api/auth/register
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        
        // CRITICAL STEP: HARDCODE YOUR ADMIN USER
        // If the registering user is YOU (use YOUR specific email), set the role to 'admin'.
        let role = 'user';
        if (email === 'krolikmakrolik228@gmail.com') { // <-- REPLACE THIS EMAIL
             role = 'admin';
        }
        
        user = new User({ username, email, password, role });

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        const payload = getPayload(user);

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error('Registration Error:', err.message);
        res.status(500).send('Server Error');
    }
});

// @route POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid Credentials: User Email Not Found' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid Credentials: Password Mismatch' });
        }

        const payload = getPayload(user); // Use helper to get payload with role

        jwt.sign(
            payload,
            process.env.JWT_SECRET,
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token });
            }
        );

    } catch (err) {
        console.error('Login Error:', err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router;
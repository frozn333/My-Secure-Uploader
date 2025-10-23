const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs'); // Assuming you imported this
const User = require('../models/User'); // Assuming you imported this
const jwt = require('jsonwebtoken'); // Assuming you imported this

// @route POST /api/auth/register
// @desc Register a new user
router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;

    try {
        // 1. Check if user already exists
        let user = await User.findOne({ email });

        // --- NEW LOGGING LINE ---
        if (user) {
            console.log(`[AUTH FAIL] User already exists for email: ${email}`);
            return res.status(400).json({ msg: 'Registration failed. User may already exist.' });
        }
        // --- END NEW LOGGING LINE ---

        // 2. Create new User instance
        user = new User({ username, email, password });
        

        // 3. HASH the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // 4. Save user to database
        await user.save();

        // 5. Create and return a JSON Web Token (JWT) for immediate login
        const payload = { user: { id: user.id } };

        jwt.sign(
            payload,
            process.env.JWT_SECRET, // Use a secret key from your .env file
            { expiresIn: '5h' },
            (err, token) => {
                if (err) throw err;
                res.json({ token }); // Token is sent to the client
            }
        );

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route POST /api/auth/login
// @desc Authenticate user & get token
router.post('/login', async (req, res) => {
    console.log('--- HIT LOGIN ENDPOINT ---'); // <-- DEBUG LOG
    const { email, password } = req.body;

    try {
        // 1. Check for user existence
        let user = await User.findOne({ email });
        if (!user) {
            // Updated message to be more explicit for debugging
            return res.status(400).json({ msg: 'Invalid Credentials: User Email Not Found' });
        }

        // 2. Compare the provided password with the HASHED password in the DB
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Updated message to be more explicit for debugging
            return res.status(400).json({ msg: 'Invalid Credentials: Password Mismatch' });
        }

        // 3. Create and return a JWT upon successful login
        const payload = { user: { id: user.id } };

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
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

module.exports = router; // Ensure this is present

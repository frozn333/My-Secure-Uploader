require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware setup
app.use(express.json());
// Allow all origins (for ease of deployment) and common methods
app.use(cors({
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    origin: '*', // Allows Vercel (and all others) to connect
}));

// 1. Connect to Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// 2. Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes')); 

// 3. Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
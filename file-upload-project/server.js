// server.js
require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors'); // <-- MUST BE IMPORTED
const path = require('path');
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to enable CORS and parse JSON
// ----------------------------------------------------
app.use(cors()); // <-- MUST BE USED HERE! This is the fix.
app.use(express.json());

// 1. Connect to Database
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- Serve Static Uploads Folder ---
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Define Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/files', require('./routes/fileRoutes')); 

// 3. Start Server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
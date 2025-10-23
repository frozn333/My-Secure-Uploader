const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Node.js File System module for downloads/deletion
const auth = require('../middleware/auth'); 
const Project = require('../models/Project'); 

// --- 1. Multer Setup for File Storage ---
// Configure where the uploaded files go and how they are named
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Files will be stored in the /uploads directory
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        // e.g., 'user-12345-1678901234-myproject.pdf'
        cb(null, `user-${req.user.id}-${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// -----------------------------------------------------------------

// @route POST /api/files/upload
// @desc Upload a new project/file
// @access Private
router.post('/upload', auth, upload.single('projectFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded.' });
        }
        
        // 1. Create a new Project document in the database
        const newProject = new Project({
            userId: req.user.id, 
            fileName: req.file.originalname,
            filePath: req.file.path, 
            fileMimeType: req.file.mimetype
        });

        // 2. Save the metadata
        const project = await newProject.save();

        res.json({ msg: 'File uploaded and saved!', project });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route GET /api/files
// @desc Get all projects for the logged-in user
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        // Find all projects where the userId matches the logged-in user's ID
        const projects = await Project.find({ userId: req.user.id }).sort({ uploadDate: -1 });

        res.json(projects);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route GET /api/files/download/:projectId
// @desc Download a specific project/file
// @access Private
router.get('/download/:projectId', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // SECURITY CHECK: Ensure the logged-in user owns this file
        if (project.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to download this file' });
        }

        const filePath = path.join(__dirname, '..', project.filePath);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ msg: 'File content missing on server' });
        }

        res.download(filePath, project.fileName); 

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route DELETE /api/files/:projectId
// @desc Delete a specific project/file
// @access Private
router.delete('/:projectId', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // 1. SECURITY CHECK: Ensure the logged-in user owns this file
        if (project.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'User not authorized to delete this file' });
        }

        const filePath = path.join(__dirname, '..', project.filePath);

        // 2. DELETE PHYSICAL FILE from the /uploads folder
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath); // Synchronously delete the file
        }

        // 3. DELETE DATABASE RECORD
        await Project.deleteOne({ _id: req.params.projectId });

        res.json({ msg: 'Project deleted successfully' });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

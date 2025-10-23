const express = require('express');
const router = express.Router();
const multer = require('multer');
const multerS3 = require('multer-s3');
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const auth = require('../middleware/auth'); 
const Project = require('../models/Project'); 

// --- 1. AWS S3 Configuration ---
const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

// --- 2. Multer S3 Storage Setup ---
const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.AWS_S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
            cb(null, { userId: req.user.id });
        },
        key: (req, file, cb) => {
            const fileKey = `user-${req.user.id}-${Date.now()}-${file.originalname.replace(/ /g, '_')}`;
            cb(null, fileKey);
        }
    })
});

// -----------------------------------------------------------------

// @route POST /api/files/upload
// @desc Upload a new project/file to S3, saving 'isPublic' state
// @access Private
router.post('/upload', auth, upload.single('projectFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: 'No file uploaded.' });
        }
        
        // Extract isPublic state from the form body (it comes as text 'true'/'false')
        const isPublic = req.body.isPublic === 'true'; 

        // 1. Create a new Project document in the database
        const newProject = new Project({
            userId: req.user.id, 
            fileName: req.file.originalname,
            fileUrl: req.file.location,
            fileKey: req.file.key,       
            fileMimeType: req.file.mimetype,
            isPublic: isPublic // Save the user's sharing choice
        });

        // 2. Save the metadata
        const project = await newProject.save();

        res.json({ msg: 'File uploaded and saved!', project });

    } catch (err) {
        console.error('S3 Upload Error:', err.message);
        res.status(500).send('Server Error');
    }
});


// @route GET /api/files
// @desc Get all projects: owned by user OR public
// @access Private
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Find documents where: 
        // 1. userId matches the logged-in user OR
        // 2. isPublic is true
        const projects = await Project.find({
            $or: [
                { userId: userId },
                { isPublic: true }
            ]
        }).sort({ uploadDate: -1 });

        res.json(projects);

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});


// @route GET /api/files/download/:projectId
// @desc Download a specific project/file from S3 via signed URL
// @access Private
router.get('/download/:projectId', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // AUTHORIZATION CHECK: 
        // Allow if: 
        // 1. User is the owner OR 
        // 2. File is marked as public
        const isOwner = project.userId.toString() === req.user.id;
        const isAccessible = isOwner || project.isPublic;

        if (!isAccessible) {
            return res.status(401).json({ msg: 'Access denied. File is private.' });
        }

        // Generate a temporary signed URL for secure download
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: project.fileKey,
            ResponseContentDisposition: `attachment; filename="${project.fileName}"`
        });

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); 
        res.redirect(signedUrl);

    } catch (err) {
        console.error('S3 Download Error:', err.message);
        res.status(500).send('Server Error');
    }
});


// @route DELETE /api/files/:projectId
// @desc Delete a specific project/file from S3 and DB
// @access Private (Only owners can delete)
router.delete('/:projectId', auth, async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);

        if (!project) {
            return res.status(404).json({ msg: 'File not found' });
        }

        // CRITICAL CHECK: ONLY THE OWNER CAN DELETE THE FILE
        if (project.userId.toString() !== req.user.id) {
            return res.status(401).json({ msg: 'You can only delete files you own.' });
        }
        
        // 2. DELETE PHYSICAL FILE from S3
        const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: project.fileKey,
        });
        await s3Client.send(deleteCommand);


        // 3. DELETE DATABASE RECORD
        await Project.deleteOne({ _id: req.params.projectId });

        res.json({ msg: 'Project deleted successfully from S3 and database.' });

    } catch (err) {
        console.error('S3 Deletion Error:', err.message);
        res.status(500).send('Server Error');
    }
});


module.exports = router;

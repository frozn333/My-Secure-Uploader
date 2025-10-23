// models/Project.js
const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    userId: {
        // This links the project back to the user who uploaded it
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    fileName: { // The original name of the file
        type: String,
        required: true
    },
    filePath: { // The path where Multer saved the file on the server (e.g., 'uploads/...')
        type: String,
        required: true
    },
    fileMimeType: { // File type (e.g., 'image/png')
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

// Export the model so it can be used in your routes
module.exports = mongoose.model('Project', ProjectSchema);
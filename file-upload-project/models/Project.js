const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true
    },
    fileName: {
        type: String,
        required: true
    },
    fileUrl: { // Stores the public S3 URL
        type: String,
        required: true
    },
    fileKey: { // Stores the unique S3 identifier (for deletion)
        type: String,
        required: true
    },
    fileMimeType: {
        type: String,
        required: true
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
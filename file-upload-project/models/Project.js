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
    fileUrl: {
        type: String,
        required: true
    },
    fileKey: {
        type: String,
        required: true
    },
    fileMimeType: {
        type: String,
        required: true
    },
    isPublic: { // NEW FIELD: True if anyone logged in can view/download
        type: Boolean,
        default: false 
    },
    uploadDate: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Project', ProjectSchema);
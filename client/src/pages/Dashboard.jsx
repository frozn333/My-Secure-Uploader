import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/files`;

// Helper function to determine file type for icons/filtering
const getFileCategory = (mimeType) => {
    if (!mimeType) return 'other';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'spreadsheet';
    if (mimeType.includes('word') || mimeType.includes('text')) return 'document';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
    return 'other';
};

// Simple Icon component (using inline SVGs for stability)
const FileIcon = ({ mimeType, url, isEditing }) => {
    const category = getFileCategory(mimeType);

    if (category === 'image' && !isEditing) {
        // Render a small thumbnail preview for images
        return (
            <img 
                src={url} 
                alt="File preview" 
                style={styles.thumbnail} 
                onError={(e) => { e.target.style.display = 'none'; }} // Hide if image fails to load
            />
        );
    }
    
    // Default SVG Icons
    const iconMap = {
        'pdf': "M6 2v6h6V2zm-3 8v10h18V10zm11 4h-4v2h4zm-4 4h-2v2h2z",
        'document': "M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8z",
        'spreadsheet': "M18 2H9L4 7v13c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 20v-2h4v2H6zm0-4h4v-2H6zm6 6h4v-6h-4zm0-8h4v-2h-4z",
        'archive': "M12 1L4 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-8-4zm-1 9H9V7h2v3zm0 4H9v-2h2v2z",
        'other': "M15 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V7z"
    };
    
    const svgPath = iconMap[category] || iconMap.other;

    return (
        <svg 
            viewBox="0 0 24 24" 
            style={styles.fileIcon}
            xmlns="http://www.w3.org/2000/svg"
        >
            <path d={svgPath} fill="currentColor" />
        </svg>
    );
};


const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [uploadMessage, setUploadMessage] = useState({}); 
    const [isLoading, setIsLoading] = useState(true);
    const [isPublic, setIsPublic] = useState(false); 
    const [uploadProgress, setUploadProgress] = useState(0); // NEW: State for progress bar
    const [editingId, setEditingId] = useState(null);      // NEW: State for renaming
    const [newName, setNewName] = useState('');           // NEW: State for renaming
    const [filter, setFilter] = useState('all');         // NEW: State for filtering
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('token');
    
    const getUserIdFromToken = () => {
        const token = getToken();
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user.id;
            } catch (e) {
                return null;
            }
        }
        return null;
    };
    
    const currentUserId = getUserIdFromToken();

    // ----------------------------------------------------
    // FETCH PROJECTS 
    // ----------------------------------------------------
    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const res = await axios.get(API_BASE_URL, {
                headers: { 'x-auth-token': getToken() }
            });
            setProjects(res.data);
        } catch (err) {
            console.error('Error fetching projects:', err.response?.data?.msg || err.message);
            if (err.response?.status === 401) handleLogout(); 
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []); 

    // ----------------------------------------------------
    // UPLOAD FILE (Progress Bar Integrated)
    // ----------------------------------------------------
    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            setUploadMessage({ text: 'Please select a file first.', isError: true });
            return;
        }

        const formData = new FormData();
        formData.append('projectFile', file); 
        formData.append('isPublic', isPublic); 

        setUploadMessage({ text: 'Uploading...', isError: false });
        setUploadProgress(0); // Start progress bar

        try {
            await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'x-auth-token': getToken(),
                    'Content-Type': 'multipart/form-data' 
                },
                // NEW: Progress tracking
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            setUploadMessage({ text: `Success: ${file.name} uploaded!`, isError: false });
            setUploadProgress(100);
            setTimeout(() => setUploadProgress(0), 1000); // Hide progress bar after success
            setFile(null); 
            setIsPublic(false); 
            document.getElementById('file-input').value = null; 
            fetchProjects(); 

        } catch (err) {
            setUploadMessage({ text: err.response?.data?.msg || 'Upload failed.', isError: true });
            setUploadProgress(0);
        }
    };

    // ----------------------------------------------------
    // RENAME FILE (New Feature)
    // ----------------------------------------------------
    const handleRename = async (e, projectId) => {
        e.preventDefault();
        if (newName.trim().length < 3) {
            setUploadMessage({ text: 'New name must be at least 3 characters.', isError: true });
            return;
        }
        
        try {
            await axios.patch(`${API_BASE_URL}/${projectId}`, { newName: newName.trim() }, {
                headers: { 'x-auth-token': getToken() }
            });
            
            setUploadMessage({ text: `File renamed to "${newName.trim()}"`, isError: false });
            setEditingId(null);
            fetchProjects();

        } catch (err) {
            setUploadMessage({ text: err.response?.data?.msg || 'Rename failed.', isError: true });
        }
    };


    // ----------------------------------------------------
    // DOWNLOAD FILE
    // ----------------------------------------------------
    const handleDownload = async (projectId, fileName) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/download/${projectId}`, {
                headers: { 'x-auth-token': getToken() },
                responseType: 'blob' 
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName); 
            document.body.appendChild(link);
            link.click();
            
            link.remove();
            window.URL.revokeObjectURL(url); 

        } catch (err) {
            console.error('Download failed:', err);
            setUploadMessage({ text: 'Download failed. Check file access or try logging in again.', isError: true });
        }
    };
    
    // ----------------------------------------------------
    // DELETE FILE
    // ----------------------------------------------------
    const handleDelete = async (projectId, fileName) => {
        if (!window.confirm(`Are you sure you want to delete "${fileName}"? This cannot be undone.`)) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/${projectId}`, {
                headers: { 'x-auth-token': getToken() }
            });
            
            setUploadMessage({ text: `Deleted: ${fileName}`, isError: false });
            fetchProjects(); 

        } catch (err) {
            console.error('Delete failed:', err);
            setUploadMessage({ text: err.response?.data?.msg || 'Deletion failed.', isError: true });
        }
    };


    // ----------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };
    
    const getVisibilityLabel = (project) => {
        const isOwner = project.userId === currentUserId;
        if (isOwner) { 
             return project.isPublic ? 'My File (Shared)' : 'My File (Private)';
        }
        if (project.isPublic) {
            return 'Public (Shared by another user)';
        }
        return 'Private';
    };
    
    const canDelete = (project) => {
        return project.userId === currentUserId;
    };
    
    const canRename = (project) => {
        return project.userId === currentUserId;
    };
    
    const filteredProjects = projects.filter(project => {
        if (filter === 'all') return true;
        if (filter === 'public') return project.isPublic;
        if (filter === 'private') return project.isPublic === false && project.userId === currentUserId;
        if (filter === 'image') return getFileCategory(project.fileMimeType) === 'image';
        if (filter === 'document') return getFileCategory(project.fileMimeType) === 'document' || getFileCategory(project.fileMimeType) === 'pdf';
        return true;
    });
    
    // ----------------------------------------------------
    // RENDER LOGIC
    // ----------------------------------------------------

    return (
        <div style={styles.outerContainer}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <h1 style={styles.title}>Secure Storage Hub</h1>
                    <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
                </header>
                
                <div style={styles.card}>
                    <h3 style={styles.cardTitle}>Upload New Project</h3>
                    <form onSubmit={handleUploadSubmit} style={styles.uploadForm}>
                        
                        {/* 1. The HIDDEN input for actual file selection */}
                        <input 
                            type="file" 
                            id="file-input"
                            onChange={handleFileChange} 
                            required 
                            style={styles.hiddenFileInput} 
                        />
                        
                        <div style={styles.fileInputGroup}>
                            {/* 2. The VISIBLE label that acts as the button */}
                            <label htmlFor="file-input" style={styles.fileLabel}>
                                {file ? file.name : 'Select File'}
                            </label>
                            
                            {/* Sharing Toggle */}
                            <div style={styles.toggleContainer}>
                                <span style={styles.toggleLabel}>Share Publicly</span>
                                <input 
                                    type="checkbox" 
                                    id="public-toggle" 
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    style={styles.toggleCheckbox}
                                />
                                <label 
                                    htmlFor="public-toggle" 
                                    style={{
                                        ...styles.toggleSwitch,
                                        backgroundColor: isPublic ? '#38b2ac' : '#ccc' 
                                    }} 
                                />
                            </div>

                        </div>
                        
                        <button type="submit" style={styles.uploadButton} disabled={!file}>
                            Upload File
                        </button>
                    </form>
                    
                    {/* NEW: Upload Progress Bar */}
                    {uploadProgress > 0 && uploadProgress < 100 && (
                        <div style={styles.progressBarContainer}>
                            <div style={{ ...styles.progressBar, width: `${uploadProgress}%` }}>
                                {uploadProgress}%
                            </div>
                        </div>
                    )}

                    {uploadMessage.text && (
                        <p style={{ 
                            ...styles.message, 
                            color: uploadMessage.isError ? '#dc3545' : '#28a745' 
                        }}>
                            {uploadMessage.text}
                        </p>
                    )}
                </div>

                <h3 style={styles.listTitle}>Your Projects</h3>
                
                {/* NEW: Filter Bar */}
                <div style={styles.filterBar}>
                    {['all', 'public', 'private', 'image', 'document'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            style={{ 
                                ...styles.filterButton, 
                                backgroundColor: filter === f ? '#1a4f8f' : '#fff',
                                color: filter === f ? '#fff' : '#1a4f8f'
                            }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                <div style={styles.card}>
                    {isLoading ? (
                        <p style={styles.loading}>Loading projects...</p>
                    ) : (
                        <ul style={styles.fileList}>
                            {filteredProjects.length > 0 ? (
                                filteredProjects.map(project => (
                                    <li key={project._id} style={styles.fileItem}>
                                        
                                        {/* File Info Block */}
                                        <div style={styles.fileInfo}>
                                            <div style={styles.nameAndIcon}>
                                                
                                                {/* ICON / PREVIEW */}
                                                <FileIcon 
                                                    mimeType={project.fileMimeType} 
                                                    url={project.fileUrl} 
                                                    isEditing={editingId === project._id}
                                                />
                                                
                                                {/* FILENAME / RENAME INPUT */}
                                                {editingId === project._id && canRename(project) ? (
                                                    <form onSubmit={(e) => handleRename(e, project._id)} style={styles.renameForm}>
                                                        <input 
                                                            type="text"
                                                            value={newName}
                                                            onChange={(e) => setNewName(e.target.value)}
                                                            style={styles.renameInput}
                                                            placeholder="Enter new file name..."
                                                        />
                                                        <button type="submit" style={styles.renameSaveButton}>Save</button>
                                                        <button onClick={() => setEditingId(null)} style={styles.renameCancelButton}>Cancel</button>
                                                    </form>
                                                ) : (
                                                    <span 
                                                        style={styles.fileName}
                                                        // Toggle rename mode on double-click by owner
                                                        onDoubleClick={() => { 
                                                            if (canRename(project)) {
                                                                setEditingId(project._id);
                                                                setNewName(project.fileName);
                                                            }
                                                        }}
                                                    >
                                                        {project.fileName}
                                                    </span>
                                                )}

                                            </div>
                                            
                                            {/* Status and Date */}
                                            <span style={{
                                                ...styles.fileStatus,
                                                color: project.isPublic ? '#1a4f8f' : '#6c757d' 
                                            }}>
                                                {getVisibilityLabel(project)}
                                            </span>
                                            <span style={styles.fileDate}>Uploaded: {formatDate(project.uploadDate)}</span>
                                        </div>
                                        
                                        {/* Buttons */}
                                        <div style={styles.buttonGroup}>
                                            <button 
                                                onClick={() => handleDownload(project._id, project.fileName)} 
                                                style={styles.downloadButton}>
                                                Download
                                            </button>
                                            
                                            {canRename(project) && (
                                                <button 
                                                    onClick={() => {
                                                        if(editingId !== project._id) {
                                                            setEditingId(project._id);
                                                            setNewName(project.fileName);
                                                        }
                                                    }} 
                                                    style={styles.renameEditButton}>
                                                    Edit
                                                </button>
                                            )}
                                            
                                            {canDelete(project) && ( 
                                                <button 
                                                    onClick={() => handleDelete(project._id, project.fileName)} 
                                                    style={styles.deleteButton}>
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li style={styles.noFiles}>No projects match the current filter.</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- FINAL COZY COOL STYLES ---
const styles = {
    outerContainer: { 
        background: '#eef2f6', 
        minHeight: '100vh', 
        fontFamily: 'Inter, sans-serif' 
    },
    container: { 
        maxWidth: '1200px', 
        margin: '0 auto', 
        padding: '30px 20px', 
    },
    header: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingBottom: '20px', 
        borderBottom: '2px solid #ddd' 
    },
    title: { 
        color: '#1a4f8f', 
        fontWeight: '800' 
    },
    logoutButton: { 
        padding: '10px 20px', 
        backgroundColor: '#dc3545', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '600' 
    },
    card: { 
        background: 'white', 
        padding: '30px', 
        borderRadius: '10px', 
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)', 
        marginBottom: '30px' 
    },
    cardTitle: { 
        color: '#1a4f8f', 
        marginBottom: '20px', 
        fontSize: '1.5em' 
    },
    listTitle: { 
        color: '#555', 
        marginBottom: '15px', 
        fontSize: '1.6em', 
        fontWeight: '700' 
    },
    uploadForm: { 
        display: 'flex', 
        gap: '20px', 
        alignItems: 'center', 
        flexWrap: 'wrap' 
    },
    fileInputGroup: {
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        gap: '10px',
        minWidth: '280px',
    },
    // Hide the default input button
    hiddenFileInput: {
        display: 'none',
    },
    // Style the label to look like a file preview/button
    fileLabel: {
        padding: '12px 15px',
        border: '2px dashed #a0c4ff', 
        borderRadius: '6px',
        cursor: 'pointer',
        color: '#1a4f8f',
        backgroundColor: '#f5faff', 
        fontWeight: '500',
        flexGrow: 1,
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    uploadButton: { 
        padding: '12px 25px', 
        backgroundColor: '#1a4f8f', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '600', 
        transition: 'background-color 0.2s',
        alignSelf: 'flex-start' 
    },
    message: { 
        marginTop: '15px', 
        fontSize: '14px',
        fontWeight: '500' 
    },
    // NEW: Progress Bar Styles
    progressBarContainer: {
        width: '100%',
        height: '10px',
        background: '#e0e0e0',
        borderRadius: '5px',
        marginTop: '10px',
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        background: '#4CAF50',
        textAlign: 'center',
        lineHeight: '10px',
        color: 'white',
        fontSize: '8px',
        transition: 'width 0.3s ease-in-out',
    },
    fileList: { 
        listStyleType: 'none', 
        padding: '0' 
    },
    fileItem: { 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        borderBottom: '1px solid #f0f0f0', 
        padding: '15px 0', 
        flexWrap: 'wrap',
    },
    fileInfo: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        width: 'auto', 
        maxWidth: '65%', 
    },
    nameAndIcon: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        marginBottom: '5px',
    },
    // NEW: Icon Styles
    fileIcon: {
        width: '20px',
        height: '20px',
        color: '#a0c4ff',
        flexShrink: 0,
    },
    // NEW: Thumbnail Preview Style
    thumbnail: {
        width: '30px',
        height: '30px',
        borderRadius: '4px',
        objectFit: 'cover',
        border: '1px solid #ddd',
        flexShrink: 0,
    },
    fileName: { 
        fontWeight: '600', 
        color: '#333',
        fontSize: '1.1em',
        wordBreak: 'break-all',
        cursor: 'pointer',
    },
    // NEW: Rename input/form styles
    renameForm: {
        display: 'flex',
        gap: '5px',
        alignItems: 'center',
    },
    renameInput: {
        padding: '5px 8px',
        borderRadius: '4px',
        border: '1px solid #1a4f8f',
        fontSize: '1em',
    },
    renameSaveButton: {
        padding: '5px 10px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    renameCancelButton: {
        padding: '5px 10px',
        backgroundColor: '#ccc',
        color: '#333',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
    },
    fileStatus: {
        fontSize: '0.8em',
        fontWeight: '700',
        marginTop: '2px',
    },
    fileDate: {
        fontSize: '0.85em',
        color: '#888',
        marginTop: '3px'
    },
    buttonGroup: { 
        display: 'flex', 
        gap: '10px',
        marginTop: '10px',
    },
    downloadButton: { 
        padding: '10px 18px', 
        backgroundColor: '#38b2ac', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '500' 
    },
    deleteButton: { 
        padding: '10px 18px', 
        backgroundColor: '#e57373', 
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '500' 
    },
    renameEditButton: {
        padding: '10px 18px', 
        backgroundColor: '#ffc107', 
        color: '#333', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '500' 
    },
    noFiles: { 
        color: '#888', 
        padding: '10px 0' 
    },
    loading: {
        color: '#1a4f8f',
        padding: '10px 0'
    },
    // NEW: Filter bar styles
    filterBar: {
        marginBottom: '20px',
        display: 'flex',
        gap: '10px',
        flexWrap: 'wrap',
    },
    filterButton: {
        padding: '8px 15px',
        border: '1px solid #1a4f8f',
        borderRadius: '6px',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '0.9em',
        transition: 'background-color 0.2s, color 0.2s',
    },
    
    // NEW TOGGLE STYLES
    toggleContainer: {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '5px 0',
    },
    toggleLabel: {
        fontSize: '0.9em',
        color: '#555',
        flexShrink: 0,
    },
    toggleCheckbox: {
        height: 0,
        width: 0,
        visibility: 'hidden',
    },
    toggleSwitch: {
        cursor: 'pointer',
        width: '40px',
        height: '22px',
        display: 'block',
        borderRadius: '11px',
        position: 'relative',
        transition: 'background-color 0.2s',
        flexShrink: 0,
    }
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/files`;

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [uploadMessage, setUploadMessage] = useState({}); // { text, isError }
    const [isLoading, setIsLoading] = useState(true);
    const [isPublic, setIsPublic] = useState(false); // NEW STATE for sharing toggle
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('token');
    
    // Get the user ID from the JWT token (we need this to check ownership in the list)
    // NOTE: This is a simplified way to get the ID without decoding the whole token
    const getUserIdFromToken = () => {
        const token = getToken();
        if (token) {
            try {
                // Tokens are base64-encoded strings separated by dots. The second part is the payload.
                const payload = JSON.parse(atob(token.split('.')[1]));
                return payload.user.id;
            } catch (e) {
                console.error("Failed to decode token:", e);
                return null;
            }
        }
        return null;
    };
    
    const currentUserId = getUserIdFromToken();

    // ----------------------------------------------------
    // FETCH PROJECTS (Read operation)
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
        // Since we need the userId immediately, we rely on the helper above.
    }, []); 

    // ----------------------------------------------------
    // UPLOAD FILE (Create operation)
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
        formData.append('isPublic', isPublic); // Append the public state

        setUploadMessage({ text: 'Uploading...', isError: false });

        try {
            await axios.post(`${API_BASE_URL}/upload`, formData, {
                headers: {
                    'x-auth-token': getToken(),
                    'Content-Type': 'multipart/form-data' 
                }
            });

            setUploadMessage({ text: `Success: ${file.name} uploaded!`, isError: false });
            setFile(null); 
            setIsPublic(false); // Reset switch after successful upload
            document.getElementById('file-input').value = null; 
            fetchProjects(); 

        } catch (err) {
            setUploadMessage({ text: err.response?.data?.msg || 'Upload failed.', isError: true });
        }
    };

    // ----------------------------------------------------
    // DOWNLOAD FILE
    // ----------------------------------------------------
    const handleDownload = (projectId) => {
        window.location.href = `${API_BASE_URL}/download/${projectId}`;
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
    // LOGOUT
    // ----------------------------------------------------
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    // ----------------------------------------------------
    // UTILITIES
    // ----------------------------------------------------
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };
    
    // Helper to determine icon/label for file visibility
    const getVisibilityLabel = (project) => {
        // If the logged-in user is the owner, it's always "My File"
        if (project.userId === currentUserId) { 
             return project.isPublic ? 'My File (Shared)' : 'My File (Private)';
        }
        // If the logged-in user is NOT the owner, but sees the file, it must be public
        if (project.isPublic) {
            return 'Public (Shared by another user)';
        }
        return 'Private';
    };
    
    // Helper to determine if the delete button should be visible
    const canDelete = (project) => {
        // Only the original owner can delete the file
        return project.userId === currentUserId;
    };

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
                            
                            {/* NEW: Sharing Toggle */}
                            <div style={styles.toggleContainer}>
                                <span style={styles.toggleLabel}>Share Publicly</span>
                                <input 
                                    type="checkbox" 
                                    id="public-toggle" 
                                    checked={isPublic}
                                    onChange={(e) => setIsPublic(e.target.checked)}
                                    style={styles.toggleCheckbox}
                                />
                                {/* CRITICAL FIX: Inline style used to access isPublic state */}
                                <label 
                                    htmlFor="public-toggle" 
                                    style={{
                                        ...styles.toggleSwitch,
                                        backgroundColor: isPublic ? '#38b2ac' : '#ccc' // Green when public
                                    }} 
                                />
                            </div>

                        </div>
                        
                        <button type="submit" style={styles.uploadButton} disabled={!file}>
                            Upload File
                        </button>
                    </form>
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
                <div style={styles.card}>
                    {isLoading ? (
                        <p style={styles.loading}>Loading projects...</p>
                    ) : (
                        <ul style={styles.fileList}>
                            {projects.length > 0 ? (
                                projects.map(project => (
                                    <li key={project._id} style={styles.fileItem}>
                                        <div style={styles.fileInfo}>
                                            <span style={styles.fileName}>{project.fileName}</span>
                                            <span style={{
                                                ...styles.fileStatus,
                                                color: project.isPublic ? '#1a4f8f' : '#6c757d' 
                                            }}>
                                                {getVisibilityLabel(project)}
                                            </span>
                                            <span style={styles.fileDate}>Uploaded: {formatDate(project.uploadDate)}</span>
                                        </div>
                                        <div style={styles.buttonGroup}>
                                            <button 
                                                onClick={() => handleDownload(project._id)} 
                                                style={styles.downloadButton}>
                                                Download
                                            </button>
                                            {/* Only the owner of the file can delete it */}
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
                                <li style={styles.noFiles}>No projects found, but you can upload one!</li>
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- COZY COOL STYLES ---
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
    },
    fileInfo: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    fileName: { 
        fontWeight: '600', 
        color: '#333',
        fontSize: '1.1em' 
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
        gap: '10px' 
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
    noFiles: { 
        color: '#888', 
        padding: '10px 0' 
    },
    loading: {
        color: '#1a4f8f',
        padding: '10px 0'
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
        // The inline style for background color is applied in the JSX render function
    }
};

export default Dashboard;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_BASE_URL = `${import.meta.env.VITE_API_URL}/api/files`;

const Dashboard = () => {
    const [file, setFile] = useState(null);
    const [projects, setProjects] = useState([]);
    const [uploadMessage, setUploadMessage] = useState({}); // { text, isError }
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const getToken = () => localStorage.getItem('token');

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
        formData.append('projectFile', file); // 'projectFile' MUST match the key in your backend (multer)

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
            document.getElementById('file-input').value = null; // Reset input field
            fetchProjects(); // Refresh the list of files

        } catch (err) {
            setUploadMessage({ text: err.response?.data?.msg || 'Upload failed.', isError: true });
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
            setUploadMessage({ text: 'Download failed. File may not exist or permission denied.', isError: true });
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
    // LOGOUT
    // ----------------------------------------------------
    const handleLogout = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
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
                            style={styles.hiddenFileInput} // NEW STYLE
                        />
                        
                        {/* 2. The VISIBLE label that acts as the button */}
                        <label htmlFor="file-input" style={styles.fileLabel}>
                            {file ? file.name : 'Select File'}
                        </label>

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
                                            <span style={styles.fileDate}>Uploaded: {formatDate(project.uploadDate)}</span>
                                        </div>
                                        <div style={styles.buttonGroup}>
                                            <button 
                                                onClick={() => handleDownload(project._id, project.fileName)} 
                                                style={styles.downloadButton}>
                                                Download
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(project._id, project.fileName)} 
                                                style={styles.deleteButton}>
                                                Delete
                                            </button>
                                        </div>
                                    </li>
                                ))
                            ) : (
                                <li style={styles.noFiles}>No projects uploaded yet. Use the form above to add your first file!</li>
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
    // NEW STYLE: Hide the default input button
    hiddenFileInput: {
        display: 'none',
    },
    // NEW STYLE: Style the label to look like a file preview/button
    fileLabel: {
        padding: '12px 15px',
        border: '2px dashed #a0c4ff', // Light blue dashed line for soft border
        borderRadius: '6px',
        cursor: 'pointer',
        color: '#1a4f8f',
        backgroundColor: '#f5faff', // Very light blue background
        fontWeight: '500',
        flexGrow: 1,
        textAlign: 'left',
        minWidth: '280px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
    },
    uploadButton: { 
        padding: '12px 25px', 
        backgroundColor: '#1a4f8f', // Cool blue
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '600', 
        transition: 'background-color 0.2s' 
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
        backgroundColor: '#38b2ac', // Teal/Green for positive action
        color: 'white', 
        border: 'none', 
        borderRadius: '6px', 
        cursor: 'pointer', 
        fontWeight: '500' 
    },
    deleteButton: { 
        padding: '10px 18px', 
        backgroundColor: '#e57373', // Soft red for warning
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
    }
};

export default Dashboard;
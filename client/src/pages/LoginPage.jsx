import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// CRITICAL FIX: Ensure this API_URL points to the login endpoint
const API_URL = `${import.meta.env.VITE_API_URL}/api/auth/login`;

const LoginPage = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [message, setMessage] = useState('');
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');

        try {
            const res = await axios.post(API_URL, formData);
            localStorage.setItem('token', res.data.token);
            setMessage('Login successful! Redirecting...');
            navigate('/dashboard'); 

        } catch (err) {
            // Check if the error is the expected "Invalid Credentials" message from the backend /api/auth/login route
            setMessage(err.response?.data?.msg || 'Login failed. Please check credentials.');
        }
    };

    return (
        <div style={styles.outerContainer}>
            <div style={styles.card}>
                <h2 style={styles.title}>Welcome Back</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Email Address"
                        required
                        style={styles.input}
                    />
                    <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Password"
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Sign In</button>
                </form>
                {message && <p style={styles.message}>{message}</p>}
                <p style={styles.linkText}>
                    Don't have an account? <Link to="/register" style={styles.link}>Register here</Link>
                </p>
                <button 
                    onClick={() => { localStorage.removeItem('token'); navigate('/'); }} 
                    style={styles.logoutButton}>
                    Clear Token / Logout
                </button>
            </div>
        </div>
    );
};

const styles = {
    outerContainer: {
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        background: '#eef2f6', // Light, cool background
        fontFamily: 'Inter, sans-serif'
    },
    card: {
        background: 'white',
        padding: '40px',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
        width: '350px',
        textAlign: 'center'
    },
    title: {
        color: '#1a4f8f', // Deep blue for cool contrast
        marginBottom: '25px',
        fontWeight: '700'
    },
    form: { 
        display: 'flex', 
        flexDirection: 'column' 
    },
    input: { 
        padding: '14px', 
        margin: '8px 0', 
        border: '1px solid #e0e6ed', 
        borderRadius: '8px', 
        fontSize: '16px',
        transition: 'border-color 0.2s'
    },
    button: { 
        padding: '15px', 
        backgroundColor: '#1a4f8f', 
        color: 'white', 
        border: 'none', 
        borderRadius: '8px', 
        cursor: 'pointer', 
        marginTop: '20px',
        fontWeight: '600',
        transition: 'background-color 0.2s'
    },
    logoutButton: {
        marginTop: '15px',
        padding: '10px',
        backgroundColor: '#f5f5f5',
        color: '#666',
        border: '1px solid #ddd',
        borderRadius: '8px',
        cursor: 'pointer',
        fontSize: '12px'
    },
    message: { 
        marginTop: '15px', 
        color: '#dc3545',
        fontSize: '14px'
    },
    linkText: { 
        marginTop: '20px',
        color: '#666'
    },
    link: {
        color: '#1a4f8f',
        textDecoration: 'none',
        fontWeight: '600'
    }
};

export default LoginPage;

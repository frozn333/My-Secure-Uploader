import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

const API_URL = `${import.meta.env.VITE_API_URL}/api/auth/register`;

const RegisterPage = () => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '' });
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
            setMessage('Registration successful! Redirecting to dashboard...');
            navigate('/dashboard'); 

        } catch (err) {
            setMessage(err.response?.data?.msg || 'Registration failed. User may already exist.');
        }
    };

    return (
        <div style={styles.outerContainer}>
            <div style={styles.card}>
                <h2 style={styles.title}>Create Account</h2>
                <form onSubmit={handleSubmit} style={styles.form}>
                    <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleChange}
                        placeholder="Username"
                        required
                        style={styles.input}
                    />
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
                        placeholder="Choose Password"
                        required
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>Register</button>
                </form>
                {message && <p style={{ ...styles.message, color: message.includes('successful') ? '#28a745' : '#dc3545' }}>{message}</p>}
                <p style={styles.linkText}>
                    Already have an account? <Link to="/login" style={styles.link}>Login here</Link>
                </p>
            </div>
        </div>
    );
};

// Reusing the same 'Cozy Cool' styles for consistency
const styles = {
    outerContainer: {
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh', 
        background: '#eef2f6', 
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
        color: '#1a4f8f', 
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
    message: { 
        marginTop: '15px', 
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

export default RegisterPage;
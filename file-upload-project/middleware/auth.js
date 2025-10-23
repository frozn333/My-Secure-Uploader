// middleware/auth.js
const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    // Get token from header (the 'x-auth-token' we discussed)
    const token = req.header('x-auth-token');

    // Check if not token
    if (!token) {
        // 401: Unauthorized
        return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
        // Use the JWT_SECRET from your .env file to decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add the user payload (containing the user ID) to the request object
        req.user = decoded.user; 
        
        // Move to the next middleware/route handler
        next(); 

    } catch (err) {
        // 401: Token is not valid (e.g., expired or tampered with)
        res.status(401).json({ msg: 'Token is not valid' });
    }
};
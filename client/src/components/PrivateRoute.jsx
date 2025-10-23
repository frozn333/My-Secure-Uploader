// client/src/components/PrivateRoute.jsx
import { Navigate, Outlet } from 'react-router-dom';

const PrivateRoute = () => {
    // Check local storage for the JWT token
    const token = localStorage.getItem('token');

    // If a token exists, render the child route (Dashboard)
    // If not, redirect to the login page
    return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default PrivateRoute;
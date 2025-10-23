import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import PrivateRoute from './components/PrivateRoute';
import './index.css'; 

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes - User lands on /login if no path is given */}
          <Route path="/" element={<LoginPage />} /> 
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Route */}
          <Route path="/dashboard" element={<PrivateRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;

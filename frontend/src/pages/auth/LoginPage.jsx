import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, School, Users, Loader2 } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  
  // Form states
  const [adminForm, setAdminForm] = useState({
    email: '',
    schoolCode: '',
    registrationNumber: ''
  });  

  const [userForm, setUserForm] = useState({
    email: '',
    password: ''
  });

  const API_BASE_URL = 'http://localhost:5000/api';

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
  
    try {
      const response = await fetch("http://localhost:5000/api/auth/school-admin/login", {  
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: adminForm.email,
          school_code: adminForm.schoolCode,       // Changed to snake_case
          registration_number: adminForm.registrationNumber  
        })      
      });
  
      const data = await response.json();
  
      if (response.ok) {
        // ✅ Log the response to check the school ID
        console.log('Login data:', data);
        console.log('Redirecting to dashboard:', data.school?.id); // 👈 HERE
  
        // Store authentication data
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        localStorage.setItem('school_data', JSON.stringify(data.school));
  
        setSuccess('Login successful! Redirecting to dashboard...');
  
        // ✅ Redirect to dashboard
        navigate(`/school/${data.school.id}/dashboard`);
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };  

  const handleUserLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userForm.email,
          password: userForm.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication data
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('user_data', JSON.stringify(data.user));
        if (data.school) {
          localStorage.setItem('school_data', JSON.stringify(data.school));
        }

        setSuccess('Login successful! Redirecting...');
        
        // Redirect based on role
        if (data.user.role === 'teacher') {
          navigate('/teacher/dashboard');
        } else if (data.user.role === 'student') {
          navigate('/student/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(data.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (tab) => {
    setActiveTab(tab);
    setError('');
    setSuccess('');
  };

  const handleForgotPassword = () => {
    alert('Contact your school administrator for password reset.');
  };

  const handleRegisterClick = () => {
    navigate('/register');
  };

  // Demo data filler (remove in production)
  const fillDemoData = () => {
    if (activeTab === 'admin') {
      setAdminForm({
        email: 'admin@school.com',
        schoolCode: 'AB123456',
        registrationNumber: 'REG-20250613-1234'
      });
    } else {
      setUserForm({
        email: 'student@school.com',
        password: 'demo123'
      });
    }
  };

  return (
    <div className="login-container">
      {/* Demo button - remove in production */}
      <button
        onClick={fillDemoData}
        className="demo-button"
      >
        Fill Demo Data
      </button>

      <div className="login-card">
        {/* Decorative gradient border */}
        <div className="gradient-border"></div>
        
        {/* Logo and Header */}
        <div className="header">
          <div className="logo">
            <School className="logo-icon" />
          </div>
          <h1 className="title">
            ShuleHub
          </h1>
          <p className="subtitle">School Management System</p>
        </div>

        {/* Tab Navigation */}
        <div className="tab-container">
          <button
            onClick={() => switchTab('admin')}
            className={`tab-button ${activeTab === 'admin' ? 'tab-active' : 'tab-inactive'}`}
          >
            <School className="tab-icon" />
            Admin
          </button>
          <button
            onClick={() => switchTab('user')}
            className={`tab-button ${activeTab === 'user' ? 'tab-active' : 'tab-inactive'}`}
          >
            <Users className="tab-icon" />
            Users
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="message error-message">
            {error}
          </div>
        )}
        
        {success && (
          <div className="message success-message">
            {success}
          </div>
        )}

        {/* School Admin Login */}
        {activeTab === 'admin' && (
          <div className="form-container">
            <div className="form-field">
             <label htmlFor="adminEmail" className="form-label">
                Email Address
            </label>
            <input
             type="email"
             id="adminEmail"
             value={adminForm.email}
             onChange={(e) => setAdminForm({...adminForm, email: e.target.value})}
             className="form-input"
             placeholder="Enter admin email"
             required
            />
          </div>
            <div className="form-field">
              <label htmlFor="schoolCode" className="form-label">
                School Code
              </label>
              <input
                type="text"
                id="schoolCode"
                value={adminForm.schoolCode}
                onChange={(e) => setAdminForm({...adminForm, schoolCode: e.target.value})}
                className="form-input"
                placeholder="e.g., AB123456"
                required
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="registrationNumber" className="form-label">
                Registration Number
              </label>
              <input
                type="text"
                id="registrationNumber"
                value={adminForm.registrationNumber}
                onChange={(e) => setAdminForm({...adminForm, registrationNumber: e.target.value})}
                className="form-input"
                placeholder="e.g., REG-20250613-1234"
                required
              />
            </div>

            <button
              onClick={handleAdminLogin}
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <>
                  <Loader2 className="loading-spinner" />
                  Logging in...
                </>
              ) : (
                'Login to Dashboard'
              )}
            </button>
          </div>
        )}

        {/* User Login */}
        {activeTab === 'user' && (
          <div className="form-container">
            <div className="form-field">
              <label htmlFor="email" className="form-label">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                className="form-input"
                placeholder="Enter your email"
                required
              />
            </div>
            
            <div className="form-field">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                  className="form-input password-input"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff className="eye-icon" /> : <Eye className="eye-icon" />}
                </button>
              </div>
            </div>

            <button
              onClick={handleUserLogin}
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                <>
                  <Loader2 className="loading-spinner" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>

            <div className="forgot-password-container">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="forgot-password-button"
              >
                Forgot your password?
              </button>
            </div>
          </div>
        )}

        {/* Registration Link */}
        <div className="registration-section">
          <p className="registration-text">
            Don't have a school account?{' '}
            <button
              onClick={handleRegisterClick}
              className="registration-link"
            >
              Register Your School
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
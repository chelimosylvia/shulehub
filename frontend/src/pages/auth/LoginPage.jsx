import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, School, Users, Loader2, Lock, Check, User, BookOpen } from 'lucide-react';
import './LoginPage.css';

const LoginPage = () => {
  const [activeTab, setActiveTab] = useState('admin');
  const [userRole, setUserRole] = useState('student'); // 'student' or 'teacher'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [tempToken, setTempToken] = useState('');
  const [userData, setUserData] = useState(null);
  const navigate = useNavigate();
  
  // Form states
  const [adminForm, setAdminForm] = useState({
    email: '',
    schoolCode: '',
    registrationNumber: ''
  });  

  const [studentForm, setStudentForm] = useState({
    schoolId: '',
    admissionNumber: '',
    password: ''
  });

  const [teacherForm, setTeacherForm] = useState({
    schoolId: '',
    identifier: '',  // Can be TSC or National ID
    password: '',
    identifierType: 'tsc'  // Default to TSC
});


  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  });

  const API_BASE_URL = 'http://localhost:5000/api';

  const handleLoginSuccess = (responseData, role) => {
    // Safely destructure with defaults
    const {
      user = {},
      access_token,
      school,
      password_change_required = false
    } = responseData || {};
  
    // Validate minimum required data
    if (!access_token || !user.id || !user.role) {
      setError('Invalid login response from server');
      return;
    }
  
    // Store authentication data
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user_data', JSON.stringify(user));
    
    if (school) {
      localStorage.setItem('school_data', JSON.stringify(school));
    }
  
    setSuccess('Login successful! Redirecting...');
    
    // Handle password change requirement
    if (password_change_required || user.must_change_password) {
      setTempToken(access_token);
      setUserData(user);
      setPasswordChangeRequired(true);
      return;
    }
  
    // Role-based redirect
    const redirectPaths = {
      admin: `/school/${user.school_id}/dashboard`,
      teacher: `/school/${user.school_id}/teacher/dashboard`,
      student: `/school/${user.school_id}/student/dashboard`
    };
  
    navigate(redirectPaths[role] || '/');
  };

  // Admin Login Handler
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/school-admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: adminForm.email,
          school_code: adminForm.schoolCode,
          registration_number: adminForm.registrationNumber
        })
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'Login failed. Please check your credentials.');
      }

      handleLoginSuccess(responseData, 'admin');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Student Login Handler
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
  
    try {
      // Validate inputs
      if (!studentForm.schoolId || !studentForm.admissionNumber || !studentForm.password) {
        throw new Error('Please fill all fields');
      }
  
      const response = await fetch(`${API_BASE_URL}/auth/student/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: parseInt(studentForm.schoolId, 10),
          admission_number: studentForm.admissionNumber,
          password: studentForm.password
        })
      });
  
      const responseData = await response.json();
  
      if (!response.ok) {
        throw new Error(
          response.status === 401 
            ? 'Invalid credentials. Please check your details.'
            : responseData.error || 'Login failed'
        );
      }
  
      // Handle the standardized response
      handleLoginSuccess(responseData, 'student');
  
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  

  const handleTeacherLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
  
    try {
      // Validate inputs
      if (!teacherForm.schoolId || !teacherForm.identifier || !teacherForm.password) {
        throw new Error('Please fill all fields');
      }
  
      const payload = {
        school_id: teacherForm.schoolId,
        password: teacherForm.password
      };
  
      // Add identifier based on type
      if (teacherForm.identifierType === 'tsc') {
        if (!/^TSC\d{6}$/i.test(teacherForm.identifier)) {
          throw new Error('TSC number must be in format TSC123456');
        }
        payload.tsc_number = teacherForm.identifier.toUpperCase();
      } else {
        if (!/^\d{6,12}$/.test(teacherForm.identifier)) {
          throw new Error('National ID must be 6-12 digits');
        }
        payload.national_id = teacherForm.identifier;
      }
  
      const response = await fetch(`${API_BASE_URL}/auth/teacher/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          // Remove X-Requested-With if not needed
        },
        body: JSON.stringify(payload),
        credentials: 'include' // Only if using cookies/sessions
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Login failed. Please check your credentials.');
      }
  
      const responseData = await response.json();
      
      // Store token and user data
      localStorage.setItem('access_token', responseData.access_token);
      localStorage.setItem('user', JSON.stringify(responseData.user));
      
      // Redirect based on password change requirement
      if (responseData.user?.must_change_password) {
        navigate('/change-password', { state: { forceChange: true } });
      } else {
        navigate('/teacher/dashboard');
      }
  
      setSuccess('Login successful! Redirecting...');
  
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      
      // Auto-dismiss error after 5 seconds
      setTimeout(() => setError(''), 5000);
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
      if (userRole === 'student') {
        setStudentForm({
          schoolId: 'SCH12345',
          admissionNumber: 'ADM2023001',
          password: 'student123'
        });
      } else {
        setTeacherForm({
          schoolId: 'SCH12345',
          tscNumber: 'TSC98765',
          password: 'teacher123'
        });
      }
    }
  };
  
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
  
    try {
      // Validate passwords
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error("Passwords don't match");
      }
      if (passwordForm.newPassword.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
  
      // Get token from either temp storage or local storage
      const token = tempToken || localStorage.getItem('access_token');
      if (!token) {
        throw new Error("Authentication token missing");
      }
  
      const response = await fetch(`${API_BASE_URL}/auth/force-change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          new_password: passwordForm.newPassword
        }),
        credentials: 'include' // If using cookies
      });
  
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Password change failed');
      }
  
      const data = await response.json();
  
      // Store new token and user data
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user_data', JSON.stringify(data.user));
  
      setSuccess('Password changed successfully! Redirecting...');
      
      // Redirect after delay
      setTimeout(() => {
        navigate(`/school/${data.user.school_id}/${data.user.role}/dashboard`);
      }, 1500);
  
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  };

  // Password change form
  if (passwordChangeRequired) {
    return (
      <div className="login-container">
        <div className="password-change-card">
          {/* Decorative gradient border */}
          <div className="gradient-border"></div>
          
          {/* Logo and Header */}
          <div className="header">
            <div className="logo">
              <Lock className="logo-icon" />
            </div>
            <h1 className="title">
              Set New Password
            </h1>
            <p className="subtitle">Welcome, {userData?.first_name || 'User'}</p>
          </div>
  
          {/* Instructions */}
          <div className="password-instructions">
            <p>You need to set a new password before continuing.</p>
            <p>Your password must be at least 8 characters long.</p>
          </div>
  
          {/* Error/Success Messages */}
          {error && (
            <div className="message error-message">
              {error}
            </div>
          )}
          
          {success && (
            <div className="message success-message">
              <Check className="success-icon" /> {success}
            </div>
          )}
  
          {/* Password Change Form */}
          <form onSubmit={handlePasswordChange} className="form-container">
  <div className="form-field">
    <label htmlFor="newPassword" className="form-label">New Password</label>
    <div className="password-field">
      <input
        type={showPassword ? 'text' : 'password'}
        id="newPassword"
        value={passwordForm.newPassword}
        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
        className="form-input password-input"
        placeholder="Enter new password"
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

  <div className="form-field">
    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
    <div className="password-field">
      <input
        type={showPassword ? 'text' : 'password'}
        id="confirmPassword"
        value={passwordForm.confirmPassword}
        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
        className="form-input password-input"
        placeholder="Confirm new password"
        required
      />
    </div>
  </div>

  <button
    type="submit"
    disabled={loading}
    className="login-button"
  >
    {loading ? (
      <>
        <Loader2 className="loading-spinner" />
        Updating...
      </>
    ) : (
      'Change Password'
    )}
  </button>
</form>
        </div>
      </div>
    );
  }
  // Normal login form
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

    <div className="forgot-password-container">
      <button
        type="button"
        onClick={handleForgotPassword}
        className="forgot-password-button"
      >
        Forgot your credentials?
      </button>
    </div>
  </div>
)}

        {/* User Login */}
        {activeTab === 'user' && (
          <div className="form-container">
            {/* Role Selection */}
            <div className="role-selection">
              <button
                onClick={() => setUserRole('student')}
                className={`role-button ${userRole === 'student' ? 'role-active' : 'role-inactive'}`}
              >
                <BookOpen className="role-icon" />
                Student
              </button>
              <button
                onClick={() => setUserRole('teacher')}
                className={`role-button ${userRole === 'teacher' ? 'role-active' : 'role-inactive'}`}
              >
                <User className="role-icon" />
                Teacher
              </button>
            </div>

            {/* Student Login Form */}
            {userRole === 'student' && (
              <>
                <div className="form-field">
                  <label htmlFor="schoolId" className="form-label">
                    School ID
                  </label>
                  <input
                    type="text"
                    id="schoolId"
                    value={studentForm.schoolId}
                    onChange={(e) => setStudentForm({...studentForm, schoolId: e.target.value})}
                    className="form-input"
                    placeholder="Enter school ID"
                    required
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="admissionNumber" className="form-label">
                    Admission Number
                  </label>
                  <input
                    type="text"
                    id="admissionNumber"
                    value={studentForm.admissionNumber}
                    onChange={(e) => setStudentForm({...studentForm, admissionNumber: e.target.value})}
                    className="form-input"
                    placeholder="Enter admission number"
                    required
                  />
                </div>
                
                <div className="form-field">
                  <label htmlFor="studentPassword" className="form-label">
                    Password
                  </label>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="studentPassword"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({...studentForm, password: e.target.value})}
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
                  onClick={handleStudentLogin}
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="loading-spinner" />
                      Logging in...
                    </>
                  ) : (
                    'Login as Student'
                  )}
                </button>
              </>
            )}

            {/* Teacher Login Form */}
            {userRole === 'teacher' && (
              <>
<div className="form-field">
    <label>School ID</label>
    <input
        value={teacherForm.schoolId}
        onChange={(e) => setTeacherForm({...teacherForm, schoolId: e.target.value})}
        placeholder="SCHOOL123"
    />
</div>

<div className="form-field">
    <label>Identification</label>
    <div className="identifier-selector">
        <select 
            value={teacherForm.identifierType}
            onChange={(e) => setTeacherForm({...teacherForm, identifierType: e.target.value})}
        >
            <option value="tsc">TSC Number</option>
            <option value="national_id">National ID</option>
        </select>
        
        <input
            value={teacherForm.identifier}
            onChange={(e) => setTeacherForm({...teacherForm, identifier: e.target.value})}
            placeholder={
                teacherForm.identifierType === 'tsc' 
                    ? 'TSC123456' 
                    : 'National ID (e.g. 12345678)'
            }
        />
    </div>
</div>
                
                <div className="form-field">
                  <label htmlFor="teacherPassword" className="form-label">
                    Password
                  </label>
                  <div className="password-field">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="teacherPassword"
                      value={teacherForm.password}
                      onChange={(e) => setTeacherForm({...teacherForm, password: e.target.value})}
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
                  onClick={handleTeacherLogin}
                  disabled={loading}
                  className="login-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="loading-spinner" />
                      Logging in...
                    </>
                  ) : (
                    'Login as Teacher'
                  )}
                </button>
              </>
            )}

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
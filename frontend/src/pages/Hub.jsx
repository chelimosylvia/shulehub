import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StudentHub from './StudentHub';
import TeacherHub from './TeacherHub';
import './Hub.css';

const API_ROOT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const HUB_KEY = 'hub_access_token';
const USER_KEY = 'hub_user_data';

export default function Hub() {
  const navigate = useNavigate();
  const [loginForm, setLoginForm] = useState({ 
    role: 'student', 
    schoolId: '', 
    identifier: '', 
    password: '' 
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem(HUB_KEY);
  const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');

  const doLogin = async (e) => {
    e.preventDefault(); 
    setLoading(true); 
    setError('');
    try {
      const endpoint = loginForm.role === 'student' 
        ? '/auth/student/login' 
        : '/auth/teacher/login';
      
      const payload = loginForm.role === 'student'
        ? { 
            school_id: Number(loginForm.schoolId), 
            admission_number: loginForm.identifier, 
            password: loginForm.password 
          }
        : { 
            school_id: Number(loginForm.schoolId), 
            tsc_number: loginForm.identifier, 
            password: loginForm.password 
          };

      const res = await axios.post(`${API_ROOT}${endpoint}`, payload);
      localStorage.setItem(HUB_KEY, res.data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
      window.location.reload();
    } catch (err) { 
      setError(err.response?.data?.error || 'Login failed'); 
    } finally { 
      setLoading(false); 
    }
  };

  const logout = () => {
    localStorage.removeItem(HUB_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.reload();
  };

  if (!token || !user) {
    return (
      <div className="login-overlay">
        <div className="login-box">
          <h2>ShuleHub Login</h2>
          {error && <p className="error">{error}</p>}

          <form onSubmit={doLogin}>
            <select 
              value={loginForm.role} 
              onChange={(e) => setLoginForm({...loginForm, role: e.target.value})}
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
            <input 
              placeholder="School ID" 
              value={loginForm.schoolId} 
              onChange={(e) => setLoginForm({...loginForm, schoolId: e.target.value})} 
              required 
            />
            <input 
              placeholder={loginForm.role === 'teacher' ? 'TSC Number' : 'Admission Number'} 
              value={loginForm.identifier} 
              onChange={(e) => setLoginForm({...loginForm, identifier: e.target.value})} 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={loginForm.password} 
              onChange={(e) => setLoginForm({...loginForm, password: e.target.value})} 
              required 
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Logging…' : 'Login'}
            </button>
          </form>
          <button onClick={() => navigate('/')}>Back Home</button>
        </div>
      </div>
    );
  }

  return user.role === 'teacher' 
    ? <TeacherHub user={user} token={token} logout={logout} /> 
    : <StudentHub user={user} token={token} logout={logout} />;
}
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/Homepage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import Dashboard from './pages/dashboard/Dashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        
        {/* Main dashboard route with nested routes */}
        <Route 
          path="/school/:schoolId/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        >
          {/* Nested routes for different user types */}
          <Route path="student" element={<StudentDashboard />} />
          <Route path="teacher" element={<TeacherDashboard />} />
          
          {/* Default dashboard view based on user role */}
          <Route index element={<RoleBasedDashboard />} />
        </Route>

      </Routes>
    </Router>
  );
};

// Component to determine which dashboard to show based on user role
const RoleBasedDashboard = () => {
  // In a real app, you would get this from your auth context or user data
  const userRole = localStorage.getItem('user_role'); // 'student' or 'teacher'

  switch(userRole) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    default:
      return <div>Loading dashboard...</div>;
  }
};

export default App;
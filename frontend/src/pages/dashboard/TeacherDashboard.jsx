import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  Users, BookOpen, Calendar, Clipboard, Award, 
  UserCheck, Bell, Layout, BarChart2, PieChart as PieChartIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

const SchoolTeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }

        const decoded = jwtDecode(token);
        const schoolId = decoded.school_id;
        const teacherId = decoded.sub;

        const response = await fetch(`/api/schools/${schoolId}/teachers/${teacherId}/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load dashboard');

        const data = await response.json();
        setUser({
          id: teacherId,
          name: decoded.name,
          subjects: data.subjects,
          teacher_id: decoded.teacher_id
        });
        setSchool(data.school);
        setDashboardData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate]);

  if (isLoading) return <div className="loading">Loading your dashboard...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="teacher-dashboard-container">
      {/* Sidebar Navigation */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="teacher-avatar">
            <UserCheck size={32} />
          </div>
          <div className="teacher-info">
            <h3>{user.name}</h3>
            <p>{user.subjects.join(', ')} • {school.name}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={activeTab === 'dashboard' ? 'active' : ''}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layout size={18} /> Dashboard
          </button>
          <button 
            className={activeTab === 'classes' ? 'active' : ''}
            onClick={() => setActiveTab('classes')}
          >
            <BookOpen size={18} /> My Classes
          </button>
          <button 
            className={activeTab === 'students' ? 'active' : ''}
            onClick={() => setActiveTab('students')}
          >
            <Users size={18} /> Students
          </button>
          <button 
            className={activeTab === 'assignments' ? 'active' : ''}
            onClick={() => setActiveTab('assignments')}
          >
            <Clipboard size={18} /> Assignments
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="dashboard-main">
        {activeTab === 'dashboard' && (
          <>
            <div className="welcome-banner">
              <h2>Welcome, {user.name.split(' ')[0]}!</h2>
              <p>{school.name} • {user.subjects.join(', ')} Teacher</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <BookOpen size={24} />
                <h3>Classes</h3>
                <p>{dashboardData.classes.length}</p>
              </div>
              <div className="stat-card">
                <Users size={24} />
                <h3>Students</h3>
                <p>{dashboardData.students.total}</p>
              </div>
              <div className="stat-card">
                <Clipboard size={24} />
                <h3>Assignments Due</h3>
                <p>{dashboardData.assignments.upcoming.length}</p>
              </div>
            </div>

            <div className="chart-container">
              <h3>Class Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dashboardData.classes.map(cls => ({
                  name: cls.name,
                  average: cls.average_grade
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Bar dataKey="average" fill="#10B981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}

        {activeTab === 'classes' && (
          <div className="classes-section">
            <h2>Your Classes</h2>
            <div className="classes-grid">
              {dashboardData.classes.map(cls => (
                <div key={cls.id} className="class-card">
                  <h3>{cls.name}</h3>
                  <p>Subject: {cls.subject}</p>
                  <p>Students: {cls.student_count}</p>
                  <p>Average Grade: {cls.average_grade}%</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="students-section">
            <h2>Your Students</h2>
            <div className="students-table">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Average Grade</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.students.list.map(student => (
                    <tr key={student.id}>
                      <td>{student.name}</td>
                      <td>{student.class}</td>
                      <td>{student.average_grade}%</td>
                      <td>
                        <button className="view-btn">View Profile</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="assignments-section">
            <h2>Your Assignments</h2>
            <div className="assignments-tabs">
              <button className="active">Upcoming</button>
              <button>Past</button>
            </div>
            <div className="assignments-list">
              {dashboardData.assignments.upcoming.map(assignment => (
                <div key={assignment.id} className="assignment-card">
                  <h3>{assignment.title}</h3>
                  <p>Class: {assignment.class}</p>
                  <p>Due: {new Date(assignment.due_date).toLocaleDateString()}</p>
                  <p>Submissions: {assignment.submissions}/{assignment.total_students}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolTeacherDashboard;
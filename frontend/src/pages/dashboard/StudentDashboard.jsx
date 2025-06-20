import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  BookOpen, Calendar, Award, User, Bell, Layout, 
  Clipboard, BarChart2, PieChart as PieChartIcon, Bookmark
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './StudentDashboard.css';

const SchoolStudentDashboard = () => {
  const navigate = useNavigate();
  const { schoolId } = useParams();
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

        // Decode token to get user information
        const decoded = jwtDecode(token);
        
        // Verify required fields exist in token
        if (!decoded.admission_number || !decoded.school_id) {
          throw new Error('Missing required user information in token');
        }

        // Verify school ID matches route parameter
        if (parseInt(schoolId) !== decoded.school_id) {
          throw new Error('School ID mismatch');
        }

        // Fetch dashboard data using admission number
        const response = await fetch(
          `http://localhost:5000/api/schools/${schoolId}/students/${decoded.admission_number}/dashboard`,
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to load dashboard data');
        }

        const data = await response.json();
        
        setUser({
          id: decoded.sub,
          name: `${decoded.first_name} ${decoded.last_name}`,
          admission_number: decoded.admission_number,
          grade_level: data.grade_level || 'N/A'
        });
        
        setSchool({
          id: schoolId,
          name: data.school?.name || 'Unknown School'
        });
        
        setDashboardData({
          attendance: data.attendance || {},
          grades: data.grades || {},
          assignments: data.assignments || [],
          classes: data.classes || []
        });
        
      } catch (err) {
        setError(err.message);
        console.error('Dashboard initialization error:', err);
        // Redirect to login if token is invalid
        if (err.message.includes('token') || err.message.includes('authentication')) {
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };

    initializeDashboard();
  }, [navigate, schoolId]);

  if (isLoading) return (
    <div className="loading-container">
      <div className="loading-spinner"></div>
      <p>Loading your dashboard...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <h3>Error Loading Dashboard</h3>
      <p>{error}</p>
      <button 
        onClick={() => window.location.reload()} 
        className="retry-button"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="student-dashboard-container">
      {/* Sidebar Navigation */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="student-avatar">
            <User size={32} />
          </div>
          <div className="student-info">
            <h3>{user.name}</h3>
            <p className="admission-number">Admission: {user.admission_number}</p>
            <p className="grade-school">Grade {user.grade_level} • {school.name}</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button 
            className={`nav-button ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <Layout size={18} /> Dashboard
          </button>
          <button 
            className={`nav-button ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            <BookOpen size={18} /> My Classes
          </button>
          <button 
            className={`nav-button ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <Clipboard size={18} /> Assignments
          </button>
          <button 
            className={`nav-button ${activeTab === 'grades' ? 'active' : ''}`}
            onClick={() => setActiveTab('grades')}
          >
            <Award size={18} /> Grades
          </button>
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="dashboard-main-content">
        {activeTab === 'dashboard' && (
          <>
            <div className="welcome-banner">
              <h2>Welcome back, {user.name.split(' ')[0]}!</h2>
              <p>Here's what's happening today</p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <BookOpen size={24} />
                </div>
                <div className="stat-content">
                  <h3>Current Classes</h3>
                  <p>{dashboardData.classes.length}</p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Clipboard size={24} />
                </div>
                <div className="stat-content">
                  <h3>Pending Assignments</h3>
                  <p>
                    {dashboardData.assignments.filter(a => !a.completed).length}
                  </p>
                </div>
              </div>
              
              <div className="stat-card">
                <div className="stat-icon">
                  <Award size={24} />
                </div>
                <div className="stat-content">
                  <h3>Average Grade</h3>
                  <p>
                    {dashboardData.grades.average ? 
                      `${dashboardData.grades.average}%` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            {dashboardData.grades.trend && (
              <div className="chart-container">
                <h3>Your Grade Progress</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={dashboardData.grades.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Grade']}
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="grade" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {activeTab === 'classes' && (
          <div className="classes-section">
            <h2>Your Classes</h2>
            <div className="classes-grid">
              {dashboardData.classes.map(cls => (
                <div key={cls.id} className="class-card">
                  <h3>{cls.name}</h3>
                  <p><strong>Teacher:</strong> {cls.teacher_name}</p>
                  <p><strong>Schedule:</strong> {cls.schedule}</p>
                  <p><strong>Room:</strong> {cls.room_number || 'TBD'}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="assignments-section">
            <h2>Your Assignments</h2>
            <div className="assignments-list">
              {dashboardData.assignments.map(assignment => (
                <div 
                  key={assignment.id} 
                  className={`assignment-card ${assignment.completed ? 'completed' : ''}`}
                >
                  <div className="assignment-header">
                    <h3>{assignment.title}</h3>
                    <span className="due-date">
                      Due: {new Date(assignment.due_date).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="class-name">{assignment.class_name}</p>
                  <p className="assignment-status">
                    Status: {assignment.completed ? 'Completed' : 'Pending'}
                  </p>
                  {assignment.description && (
                    <p className="assignment-description">{assignment.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'grades' && (
          <div className="grades-section">
            <h2>Your Grades</h2>
            <div className="grades-table-container">
              <table className="grades-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Grade</th>
                    <th>Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardData.grades.details?.map((grade, index) => (
                    <tr key={index}>
                      <td>{grade.subject}</td>
                      <td className={`grade-value ${getGradeClass(grade.value)}`}>
                        {grade.value}%
                      </td>
                      <td className="grade-feedback">
                        {grade.feedback || 'No feedback available'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Helper function for grade styling
  function getGradeClass(grade) {
    if (grade >= 80) return 'excellent';
    if (grade >= 70) return 'good';
    if (grade >= 50) return 'average';
    return 'poor';
  }
};

export default SchoolStudentDashboard;
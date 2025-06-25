import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  Users, BookOpen, Calendar, TrendingUp, DollarSign, UserCheck, Bell,
  Settings, LogOut, Edit3, Save, X, Eye, EyeOff, Grid, BarChart3,
  PieChart as PieChartIcon, Activity, Upload, Palette, Layout, Plus, UserPlus, Bookmark
} from 'lucide-react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { SchoolContext } from '../../contexts/SchoolContext';
import './Dashboard.css';

const MultiSchoolDashboard = () => {
  const navigate = useNavigate();
  const { currentSchoolId, setCurrentSchoolId, isValidSchoolId } = useContext(SchoolContext);
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [error, setError] = useState(null);
  const [themeType, setThemeType] = useState('default');
  const [applyToAllUsers, setApplyToAllUsers] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);
    
        // 1. Get and validate token
        const token = localStorage.getItem('access_token');
        if (!token) {
          navigate('/login');
          return;
        }
    
        // 2. Decode token to get school ID
        let decoded;
        try {
          decoded = jwtDecode(token);
          if (!decoded?.sub) {
            throw new Error('Invalid token');
          }
        } catch (err) {
          localStorage.removeItem('access_token');
          navigate('/login');
          return;
        }
    
        const schoolId = decoded.school_id || decoded.sub;
        // Set the school ID in context
        setCurrentSchoolId(schoolId);
        
        const apiUrl = `/api/schools/${schoolId}/dashboard`;
    
        // 3. Fetch dashboard data
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
    
        if (!response.ok) {
          let errorMessage = 'Failed to load dashboard';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch (parseError) {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
    
        const dashboardData = await response.json();
    
        // 4. Validate response structure
        if (!dashboardData.school || !dashboardData.config) {
          throw new Error('Invalid dashboard data received');
        }
    
        // 5. Check for user-specific settings in local storage
        const userSettings = JSON.parse(localStorage.getItem('user_dashboard_settings') || 'null');
        
        setUser({
          id: decoded.sub,
          name: decoded.name || 'School Admin',
          role: decoded.role || 'user',
          school_id: schoolId
        });
        
        setSchool(dashboardData.school);
        setSchoolData(dashboardData);
        
        setDashboardSettings({
          school_branding: {
            ...dashboardData.config.school_branding,
            background: userSettings?.background || dashboardData.config.school_branding?.background || '#ffffff',
            font_color: userSettings?.font_color || dashboardData.config.school_branding?.font_color || '#333333',
            primary_color: dashboardData.config.school_branding?.primary_color || "#3B82F6",
            secondary_color: dashboardData.config.school_branding?.secondary_color || "#10B981",
            logo_url: dashboardData.config.school_branding?.logo_url || null,
            school_name_display: dashboardData.config.school_branding?.school_name_display || true
          },
          enabled_modules: dashboardData.config.enabled_modules || {
            attendance: true,
            fees: true,
            grades: true,
            events: true,
            announcements: true
          },
          enabled_widgets: dashboardData.config.enabled_widgets || {
            stats_overview: true,
            enrollment_chart: true,
            attendance_overview: true,
            activity_feed: true,
            quick_actions: true,
            fee_status: true,
            announcements: true,
            custom_links: false
          }
        });
    
        // Set theme type based on whether custom settings exist
        if (userSettings?.background || userSettings?.font_color || 
            dashboardData.config.school_branding?.background || dashboardData.config.school_branding?.font_color) {
          setThemeType('custom');
        }
    
      } catch (error) {
        console.error('Dashboard error:', error);
        setError(error.message);
        
        if (/unauthorized|invalid token|401|403/i.test(error.message)) {
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeDashboard();
  }, [navigate, setCurrentSchoolId]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    navigate('/login');
  };

  const toggleCustomizationMode = () => {
    setIsCustomizing(!isCustomizing);
  };

  const updateSchoolBranding = (brandingData) => {
    setDashboardSettings(prev => ({
      ...prev,
      school_branding: { ...prev.school_branding, ...brandingData }
    }));
  };

  const toggleWidget = (widgetName) => {
    setDashboardSettings(prev => ({
      ...prev,
      enabled_widgets: {
        ...prev.enabled_widgets,
        [widgetName]: !prev.enabled_widgets[widgetName]
      }
    }));
  };

  const toggleModule = (moduleName) => {
    setDashboardSettings(prev => ({
      ...prev,
      enabled_modules: {
        ...prev.enabled_modules,
        [moduleName]: !prev.enabled_modules[moduleName]
      }
    }));
  };

  const saveDashboardSettings = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare the payload
      const payload = {
        ...dashboardSettings,
        apply_to_all: applyToAllUsers
      };

      // Determine the correct API endpoint based on user role
      let endpoint;
      if (user.role === 'school_admin' || user.role === 'system_owner') {
        endpoint = `/api/schools/${school.id}/dashboard-settings`;
      } else {
        endpoint = `/api/users/${user.id}/dashboard-settings`;
      }

      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }

      // If it's a user-specific customization (not applied to all), save to local storage
      if (!applyToAllUsers && user.role !== 'school_admin') {
        localStorage.setItem('user_dashboard_settings', JSON.stringify({
          background: dashboardSettings.school_branding.background,
          font_color: dashboardSettings.school_branding.font_color
        }));
      }

      // Show success message
      setError(null);
      setIsCustomizing(false);
      
      // Refresh school data if admin
      if (user.role === 'school_admin' || user.role === 'system_owner') {
        const res = await fetch(`/api/schools/${school.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const updatedSchool = await res.json();
          setSchool(updatedSchool);
        }
      }

    } catch (error) {
      console.error('Failed to save settings:', error);
      setError(error.message || 'Failed to save settings. Please try again.');
      
      // If token is invalid/expired, redirect to login
      if (error.message.includes('token') || error.message.includes('401') || error.message.includes('403')) {
        localStorage.removeItem('access_token');
        navigate('/login');
      }
    }
  };

  const handleBackgroundChange = (e) => {
    updateSchoolBranding({ background: e.target.value });
  };

  const handleFontColorChange = (e) => {
    updateSchoolBranding({ font_color: e.target.value });
  };

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading school dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <h2>Error Loading Dashboard</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
        <div className="debug-info">
          <p>If the problem persists, please contact support with:</p>
          <ul>
            <li>School ID: {user?.school_id || 'Unknown'}</li>
            <li>User ID: {user?.id || 'Unknown'}</li>
          </ul>
        </div>
      </div>
    );
  }

  if (!user || !school || !dashboardSettings || !schoolData) {
    return (
      <div className="error-screen">
        <h2>Failed to Load Dashboard Data</h2>
        <p>Required data is missing. Please try again later.</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  const StatsCard = ({ title, value, icon: Icon }) => (
    <div className="stats-card">
      <div className="card-content">
        <div className="text-content">
          <p className="card-title">{title}</p>
          <p className="card-value">{value}</p>
        </div>
        <div className="card-icon">
          <Icon size={24} />
        </div>
      </div>
    </div>
  );

  const ActivityFeed = () => {
  const { currentSchoolId, isValidSchoolId } = useContext(SchoolContext);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchActivities = useCallback(async () => {
    if (!isValidSchoolId) {
      setError('Invalid school configuration');
      setLoading(false);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(
        `/api/schools/${currentSchoolId}/dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('access_token');
          throw new Error('Session expired. Please login again.');
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setActivities(data.activities || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Activity feed error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentSchoolId, isValidSchoolId]);

  useEffect(() => {
    if (!isValidSchoolId) return;

    const controller = new AbortController();
    setLoading(true);
    fetchActivities();

    const interval = setInterval(() => {
      setRetryCount(prev => prev + 1);
    }, 60000);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchActivities, isValidSchoolId, retryCount]);

    const getIconComponent = (iconName) => {
      const iconMap = {
        'Users': Users,
        'UserCheck': UserCheck,
        'DollarSign': DollarSign,
        'BookOpen': BookOpen,
        'default': Activity
      };
      return iconMap[iconName] || iconMap['default'];
    };

    if (!isValidSchoolId) {
      return (
        <div className="activity-feed">
          <div className="widget-header">
            <h3>Recent Activity</h3>
            <Bell />
          </div>
          <div className="invalid-school">
            Loading school information...
          </div>
        </div>
      );
    }

    if (loading) {
      return (
        <div className="activity-feed">
          <div className="widget-header">
            <h3>Recent Activity</h3>
            <Bell />
          </div>
          <div className="loading-activities">
            <div className="loading-spinner"></div>
            Loading activities...
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="activity-feed">
          <div className="widget-header">
            <h3>Recent Activity</h3>
            <Bell />
          </div>
          <div className="error-message">
            {error}
            <button 
              onClick={() => {
                setLoading(true);
                setError(null);
                fetchActivities();
              }}
              className="retry-button"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="activity-feed">
        <div className="widget-header">
          <h3>Recent Activity</h3>
          <Bell />
        </div>
        <div className="activities-list">
          {activities.length === 0 ? (
            <div className="no-activities">
              No recent activities found
            </div>
          ) : (
            activities.map((activity) => {
              const IconComponent = getIconComponent(activity.icon);
              return (
                <div key={activity.id} className="activity-item">
                  <div className="activity-content">
                    <div className="activity-icon">
                      <IconComponent size={18} />
                    </div>
                    <div className="activity-text">
                      <p>{activity.message}</p>
                      <span className="activity-time">
                        {activity.time} • {activity.user || 'System'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const QuickActions = () => {
    const [showAddModal, setShowAddModal] = useState(false);
    const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
    const [showAddClassModal, setShowAddClassModal] = useState(false);
    const [showScheduleEventModal, setShowScheduleEventModal] = useState(false);
    const [userType, setUserType] = useState('student');

    const handleAddClick = (type) => {
      setUserType(type);
      setShowAddModal(true);
    };

    const handleClassAdded = (newClass) => {
      console.log('Class added:', newClass);
    };

    const handleEventScheduled = (newEvent) => {
      console.log('Event scheduled:', newEvent);
    };

    if (!dashboardSettings || !dashboardSettings.enabled_modules) {
      return (
        <div className="quick-actions">
          <h3>Quick Actions</h3>
          <div className="loading-actions">Loading quick actions...</div>
        </div>
      );
    }

    return (
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="action-buttons">
          <button 
            className="action-btn"
            onClick={() => handleAddClick('student')}
          >
            <Users size={18} />
            <p>Add Student</p>
          </button>
          <button 
            className="action-btn"
            onClick={() => handleAddClick('teacher')}
          >
            <UserPlus size={18} />
            <p>Add Teacher</p>
          </button>
          <button 
            className="action-btn"
            onClick={() => setShowAddClassModal(true)}
          >
            <BookOpen size={18} />
            <p>Create Class</p>
          </button>
          <button 
            className="action-btn"
            onClick={() => setShowAddSubjectModal(true)}
          >
            <Bookmark size={18} />
            <p>Add Subject</p>
          </button>
          {dashboardSettings.enabled_modules.events && (
            <button 
              className="action-btn"
              onClick={() => setShowScheduleEventModal(true)}
            >
              <Calendar size={18} />
              <p>Schedule Event</p>
            </button>
          )}
        </div>

        {showAddModal && (
          <AddUserModal 
            userType={userType}
            schoolId={school.id}
            onClose={() => setShowAddModal(false)}
          />
        )}

        {showAddSubjectModal && (
          <AddSubjectModal
            schoolId={school.id}
            onClose={() => setShowAddSubjectModal(false)}
            onSubjectAdded={() => {
              setShowAddSubjectModal(false);
            }}
          />
        )}

        {showAddClassModal && (
          <AddClassModal
            schoolId={school.id}
            onClose={() => setShowAddClassModal(false)}
            onClassAdded={handleClassAdded}
          />
        )}

        {showScheduleEventModal && (
          <ScheduleEventModal
            schoolId={school.id}
            onClose={() => setShowScheduleEventModal(false)}
            onEventScheduled={handleEventScheduled}
          />
        )}
      </div>
    );
  };
  const UserManagement = ({ schoolId }) => {
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [userToEdit, setUserToEdit] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [userToView, setUserToView] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoading(true);
        const token = localStorage.getItem('access_token');
        
        // Fetch students with class information
        const studentsResponse = await fetch(
          `/api/schools/${schoolId}/students?include_class=true`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        
        // Fetch teachers
        const teachersResponse = await fetch(
          `/api/schools/${schoolId}/teachers`, 
          { headers: { 'Authorization': `Bearer ${token}` } }
        );

        if (!studentsResponse.ok || !teachersResponse.ok) {
          throw new Error('Failed to fetch user data');
        }

        const studentsData = await studentsResponse.json();
        const teachersData = await teachersResponse.json();

        // Transform student data to ensure class information is properly formatted
        const formattedStudents = studentsData.students.map(student => ({
          ...student,
          class_name: student.class?.name || 
                     student.class_name || 
                     (student.class_id ? `Class ID: ${student.class_id}` : 'Not assigned')
        }));

        setStudents(formattedStudents);
        setTeachers(teachersData.teachers);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError(err.message);
        setIsLoading(false);
      }
    };
    
    fetchUsers();
  }, [schoolId]);

  // Rest of your existing functions remain the same:
  const handleDelete = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const endpoint = userToDelete.role === 'student' 
        ? `/api/schools/${schoolId}/students/${userToDelete.id}`
        : `/api/schools/${schoolId}/teachers/${userToDelete.id}`;
      
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error('Failed to delete user');
      
      if (userToDelete.role === 'student') {
        setStudents(students.filter(s => s.id !== userToDelete.id));
      } else {
        setTeachers(teachers.filter(t => t.id !== userToDelete.id));
      }
      
      setShowDeleteModal(false);
      setUserToDelete(null);
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err.message);
    }
  };

  const handleEdit = (user) => {
    setUserToEdit(user);
    setShowEditModal(true);
  };

  const handleView = (user) => {
    setUserToView(user);
    setShowViewModal(true);
  };

  const handleUpdateUser = (updatedUser) => {
    if (updatedUser.role === 'student') {
      setStudents(students.map(s => 
        s.id === updatedUser.id ? { 
          ...updatedUser,
          class_name: updatedUser.class?.name || updatedUser.class_name || 'Not assigned'
        } : s
      ));
    } else {
      setTeachers(teachers.map(t => t.id === updatedUser.id ? updatedUser : t));
    }
    setShowEditModal(false);
  };

  if (isLoading) return <div className="loading">Loading users...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="user-management">
      <h2>User Management</h2>
      
      {/* Teachers Section (unchanged) */}
      <div className="user-section">
        <h3>Teachers</h3>
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>TSC/National ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teacher => (
                <tr key={teacher.id}>
                  <td>
                    {teacher.tsc_number 
                      ? `TSC: ${teacher.tsc_number}` 
                      : teacher.national_id 
                        ? `ID: ${teacher.national_id}` 
                        : 'N/A'}
                  </td>
                  <td>{teacher.first_name} {teacher.last_name}</td>
                  <td>{teacher.email}</td>
                  <td className="actions">
                    <button onClick={() => handleView(teacher)} className="action-btn view">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEdit(teacher)} className="action-btn edit">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(teacher)} className="action-btn delete">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Students Section with improved class display */}
      <div className="user-section">
        <h3>Students</h3>
        <div className="user-table-container">
          <table className="user-table">
            <thead>
              <tr>
                <th>Admission No.</th>
                <th>Name</th>
                <th>Class</th>
                <th>Parent Contact</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id}>
                  <td>{student.admission_number}</td>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>
                    {student.class_name || 'Not assigned'}
                  </td>
                  <td>{student.parent_contact || 'N/A'}</td>
                  <td className="actions">
                    <button onClick={() => handleView(student)} className="action-btn view">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => handleEdit(student)} className="action-btn edit">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(student)} className="action-btn delete">
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Modals (unchanged) */}
      {showDeleteModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Confirm Deletion</h3>
              <button onClick={() => setShowDeleteModal(false)} className="close-btn">
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete {userToDelete.first_name} {userToDelete.last_name}?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                Cancel
              </button>
              <button onClick={confirmDelete} className="delete-btn">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showEditModal && (
        <EditUserModal
          user={userToEdit}
          schoolId={schoolId}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleUpdateUser}
        />
      )}
      
      {showViewModal && (
        <ViewUserModal
          user={userToView}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
};

  const EditUserModal = ({ user, schoolId, onClose, onUpdate }) => {
    const [formData, setFormData] = useState({ ...user });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');
      
      try {
        const token = localStorage.getItem('access_token');
        const endpoint = user.role === 'student'
          ? `/api/schools/${schoolId}/students/${user.id}`
          : `/api/schools/${schoolId}/teachers/${user.id}`;
        
        const response = await fetch(endpoint, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        
        if (!response.ok) {
          throw new Error('Failed to update user');
        }
        
        const updatedUser = await response.json();
        onUpdate(updatedUser);
        onClose();
      } catch (err) {
        console.error('Error updating user:', err);
        setError(err.message);
      } finally {
        setIsSubmitting(false);
      }
    };
  
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Edit {user.role === 'student' ? 'Student' : 'Teacher'}</h3>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
              />
            </div>
            
            {user.role === 'student' ? (
              <>
                <div className="form-group">
                  <label>Admission Number</label>
                  <input
                    type="text"
                    name="admission_number"
                    value={formData.admission_number}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Class</label>
                  <input
                    type="text"
                    name="class_name"
                    value={formData.class_name}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label>Parent Contact</label>
                  <input
                    type="text"
                    name="parent_contact"
                    value={formData.parent_contact}
                    onChange={handleInputChange}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>TSC/National ID</label>
                  <input
                    type="text"
                    name={formData.teacher_id ? 'teacher_id' : 'national_id'}
                    value={formData.teacher_id || formData.national_id}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </>
            )}
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={onClose} 
                className="cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  const ViewUserModal = ({ user, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>{user.role === 'student' ? 'Student' : 'Teacher'} Details</h3>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          </div>
          
          <div className="user-details">
            <div className="detail-row">
              <span className="detail-label">Name:</span>
              <span className="detail-value">{user.first_name} {user.last_name}</span>
            </div>
            
            {user.role === 'student' ? (
              <>
                <div className="detail-row">
                  <span className="detail-label">Admission Number:</span>
                  <span className="detail-value">{user.admission_number}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Class:</span>
                  <span className="detail-value">{user.class_name || 'Not assigned'}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Parent Contact:</span>
                  <span className="detail-value">{user.parent_contact || 'N/A'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="detail-row">
                  <span className="detail-label">Email:</span>
                  <span className="detail-value">{user.email}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">{user.teacher_id ? 'TSC Number' : 'National ID'}:</span>
                  <span className="detail-value">{user.teacher_id || user.national_id}</span>
                </div>
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button onClick={onClose} className="confirm-btn">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };
  const AddClassModal = ({ schoolId, onClose, onClassAdded }) => {
    const [formData, setFormData] = useState({
      name: '',
      grade_level: '',
      class_teacher: ''
    });
  
    const [teachersOptions, setTeachersOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
  
    useEffect(() => {
      const fetchTeachers = async () => {
        try {
          const token = localStorage.getItem('access_token');
          const response = await fetch(`/api/schools/${schoolId}/teachers`, {
            headers: { Authorization: `Bearer ${token}` }
          });
      
          const data = await response.json();
      
          if (!response.ok || !Array.isArray(data.teachers)) {
            console.error('Invalid teachers response:', data);
            throw new Error('Invalid response while fetching teachers');
          }
      
          setTeachersOptions(data.teachers.map(teacher => ({
            value: teacher.id,
            label: `${teacher.first_name} ${teacher.last_name} (${teacher.tsc_number || teacher.national_id || 'No ID'})`
          })));
        } catch (err) {
          console.error('Failed to fetch teachers:', err);
        }
      };      
  
      fetchTeachers();
    }, [schoolId]);
  
    const handleInputChange = (e) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };
  
    const handleTeacherChange = (selectedOption) => {
      setFormData(prev => ({
        ...prev,
        class_teacher: selectedOption ? selectedOption.value : ''
      }));
    };
  
    const validateForm = () => {
      if (!formData.name.trim()) {
        setError('Class name is required');
        return false;
      }
      if (!formData.grade_level) {
        setError('Grade level is required');
        return false;
      }
      if (!formData.class_teacher) {
        setError('Please assign a teacher to this class');
        return false;
      }
      return true;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      setIsSubmitting(true);
      setError('');
    
      try {
        const token = localStorage.getItem('access_token');
    
        const payload = {
          name: formData.name.trim(),
          level: formData.grade_level.toString(), // Ensure `level` is sent (not `grade_level`)
          class_teacher_id: formData.class_teacher, // Must not be empty
          school_id: schoolId,
        };
    
        console.log("Payload:", payload); // Debug: Check the payload before sending
    
        const response = await fetch(`/api/schools/${schoolId}/classes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || 'Failed to add class');
        }
    
        onClassAdded?.(data.class);
        onClose();
      } catch (err) {
        console.error('Error creating class:', err);
        setError(err.message || 'Unexpected error while creating class');
      } finally {
        setIsSubmitting(false);
      }
    };  
  
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h2><BookOpen size={20} /> Create New Class</h2>
            <button onClick={onClose} className="close-btn"><X size={20} /></button>
          </div>
  
          {error && <div className="error-message">{error}</div>}
  
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Class Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Grade 8A, Grade 10 East"
                required
              />
            </div>
  
            <div className="form-group">
              <label>Grade Level *</label>
              <select
                name="grade_level"
                value={formData.grade_level}
                onChange={handleInputChange}
                required
              >
                <option value="">Select grade</option>
                {[7, 8, 9, 10, 11, 12].map(grade => (
                  <option key={grade} value={grade}>Grade {grade}</option>
                ))}
              </select>
            </div>
  
            <div className="form-group">
              <label>Assign Teacher *</label>
              <Select
                options={teachersOptions}
                value={teachersOptions.find(opt => opt.value === formData.class_teacher) || null}
                onChange={handleTeacherChange}
                placeholder="Select a teacher"
                isClearable
                className="single-select"
              />
            </div>
  
            <div className="form-actions">
              <button 
                type="button" 
                onClick={onClose} 
                className="cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  const ScheduleEventModal = ({ schoolId, onClose, onEventScheduled }) => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      event_type: '',
      start_date: '',
      end_date: '',
      start_time: '',
      end_time: '',
      location: '',
      target_audience: '',
      is_recurring: false,
      recurrence_pattern: '',
      max_participants: '',
      registration_required: false,
      registration_deadline: ''
    });
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const eventTypes = [
      { value: 'academic', label: 'Academic' },
      { value: 'sports', label: 'Sports' },
      { value: 'cultural', label: 'Cultural' },
      { value: 'meeting', label: 'Meeting' },
      { value: 'examination', label: 'Examination' },
      { value: 'holiday', label: 'Holiday' },
      { value: 'workshop', label: 'Workshop' },
      { value: 'assembly', label: 'Assembly' },
      { value: 'other', label: 'Other' }
    ];

    const targetAudiences = [
      { value: 'all', label: 'All School' },
      { value: 'students', label: 'Students Only' },
      { value: 'teachers', label: 'Teachers Only' },
      { value: 'parents', label: 'Parents Only' },
      { value: 'grade_specific', label: 'Specific Grade' },
      { value: 'staff', label: 'Staff Only' }
    ];

    const recurrencePatterns = [
      { value: 'daily', label: 'Daily' },
      { value: 'weekly', label: 'Weekly' },
      { value: 'monthly', label: 'Monthly' },
      { value: 'yearly', label: 'Yearly' }
    ];

    const handleInputChange = (e) => {
      const { name, value, type, checked } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    };

    const validateForm = () => {
      if (!formData.title.trim()) {
        setError('Event title is required');
        return false;
      }
      if (!formData.event_type) {
        setError('Event type is required');
        return false;
      }
      if (!formData.start_date) {
        setError('Start date is required');
        return false;
      }
      if (!formData.start_time) {
        setError('Start time is required');
        return false;
      }
      if (formData.end_date && formData.end_date < formData.start_date) {
        setError('End date cannot be before start date');
        return false;
      }
      if (formData.registration_required && !formData.registration_deadline) {
        setError('Registration deadline is required when registration is enabled');
        return false;
      }
      return true;
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      
      if (!validateForm()) return;

      setIsSubmitting(true);
      setError('');

      try {
        const token = localStorage.getItem('access_token');
        const payload = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          event_type: formData.event_type,
          start_date: formData.start_date,
          end_date: formData.end_date || formData.start_date,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location.trim(),
          target_audience: formData.target_audience,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.is_recurring ? formData.recurrence_pattern : null,
          max_participants: formData.max_participants ? parseInt(formData.max_participants) : null,
          registration_required: formData.registration_required,
          registration_deadline: formData.registration_required ? formData.registration_deadline : null,
          school_id: schoolId
        };

        const response = await fetch(`/api/schools/${schoolId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to schedule event');
        }

        onEventScheduled && onEventScheduled(data.event);
        onClose();
      } catch (err) {
        console.error('Error scheduling event:', err);
        setError(err.message || 'Failed to schedule event. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    };

    return (
      <div className="modal-overlay">
        <div className="modal-content large-modal">
          <div className="modal-header">
            <h2>
              <Calendar size={20} />
              Schedule New Event
            </h2>
            <button onClick={onClose} className="close-btn">
              <X size={20} />
            </button>
          </div>

          {error && <div className="error-message">{error}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Annual Sports Day"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Event Type *</label>
                <select
                  name="event_type"
                  value={formData.event_type}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select event type</option>
                  {eventTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief description of the event"
                rows="3"
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date *</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Time *</label>
                <input
                  type="time"
                  name="start_time"
                  value={formData.start_time}
                  onChange={handleInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>End Time</label>
                <input
                  type="time"
                  name="end_time"
                  value={formData.end_time}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Location</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Main Hall, Sports Field"
                />
              </div>
              
              <div className="form-group">
                <label>Target Audience</label>
                <select
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                >
                  <option value="">Select audience</option>
                  {targetAudiences.map(audience => (
                    <option key={audience.value} value={audience.value}>{audience.label}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="is_recurring"
                    checked={formData.is_recurring}
                    onChange={handleInputChange}
                  />
                  Recurring Event
                </label>
              </div>
              
              {formData.is_recurring && (
                <select
                  name="recurrence_pattern"
                  value={formData.recurrence_pattern}
                  onChange={handleInputChange}
                  className="mt-2"
                >
                  <option value="">Select recurrence pattern</option>
                  {recurrencePatterns.map(pattern => (
                    <option key={pattern.value} value={pattern.value}>{pattern.label}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    name="registration_required"
                    checked={formData.registration_required}
                    onChange={handleInputChange}
                  />
                  Registration Required
                </label>
              </div>
              
              {formData.registration_required && (
                <div className="form-row mt-2">
                  <div className="form-group">
                    <label>Max Participants</label>
                    <input
                      type="number"
                      name="max_participants"
                      value={formData.max_participants}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="Leave blank for unlimited"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Registration Deadline</label>
                    <input
                      type="date"
                      name="registration_deadline"
                      value={formData.registration_deadline}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <div className="form-actions">
              <button 
                type="button" 
                onClick={onClose} 
                className="cancel-btn"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="submit-btn" 
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Scheduling...' : 'Schedule Event'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };


 const AddUserModal = ({ userType, schoolId, onClose }) => {
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        ...(userType === 'student' ? { 
            admission_number: '',
            class_id: '',
            parent_phone: '' 
        } : { 
            email: '',
            phone_number: '',
            teacher_id: '',
            subjects: [],
            classes: [] 
        })
    });
    
    const [subjectsOptions, setSubjectsOptions] = useState([]);
    const [classesOptions, setClassesOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [tempPassword, setTempPassword] = useState('');

    useEffect(() => {
        const fetchClasses = async () => {
            try {
                const token = localStorage.getItem('access_token');
                const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/classes`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    setClassesOptions(
                        (Array.isArray(data) ? data : data.classes || [])
                        .map(cls => ({
                            value: cls.id,
                            label: `${cls.name} (${cls.level}${cls.stream ? ` - ${cls.stream}` : ''})`,
                            capacity: cls.capacity,
                            current: cls.current_enrollment
                        }))
                    );
                }
            } catch (err) {
                console.error('Failed to fetch classes:', err);
            }
        };

        if (schoolId) {
            fetchClasses();
            
            if (userType === 'teacher') {
                const fetchSubjects = async () => {
                    try {
                        const token = localStorage.getItem('access_token');
                        const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/subjects`, {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            setSubjectsOptions(
                                (Array.isArray(data) ? data : data.subjects || [])
                                .map(subject => ({
                                    value: subject.id,
                                    label: subject.name
                                }))
                            );
                        }
                    } catch (err) {
                        console.error('Failed to fetch subjects:', err);
                    }
                };
                fetchSubjects();
            }
        }
    }, [userType, schoolId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubjectsChange = (selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            subjects: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    const handleClassesChange = (selectedOption) => {
        setFormData(prev => ({
            ...prev,
            class_id: selectedOption ? selectedOption.value : ''
        }));
    };

    const handleTeacherClassesChange = (selectedOptions) => {
        setFormData(prev => ({
            ...prev,
            classes: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    const validateForm = () => {
        if (!formData.first_name.trim()) {
            setError('First name is required');
            return false;
        }
        if (!formData.last_name.trim()) {
            setError('Last name is required');
            return false;
        }
        if (userType === 'student') {
            if (!formData.admission_number.trim()) {
                setError('Admission number is required');
                return false;
            }
            if (!formData.class_id) {
                setError('Class is required');
                return false;
            }
            if (!formData.parent_phone.trim()) {
                setError('Parent phone number is required');
                return false;
            }
            if (!/^\+?[\d\s-]{10,15}$/.test(formData.parent_phone)) {
                setError('Invalid parent phone number format');
                return false;
            }
        }
        if (userType === 'teacher') {
            if (!formData.teacher_id.trim()) {
                setError('Teacher ID (TSC or National ID) is required');
                return false;
            }
            const teacherId = formData.teacher_id.trim().toUpperCase();
            if (!teacherId.startsWith('TSC') && !/^\d{6,12}$/.test(teacherId)) {
                setError('Teacher ID must be TSC (TSC12345) or National ID (6-12 digits)');
                return false;
            }
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;
    
        setIsSubmitting(true);
        setError('');
    
        try {
            const payload = {
                first_name: formData.first_name.trim(),
                last_name: formData.last_name.trim(),
                role: userType,
                school_id: schoolId,
                ...(userType === 'teacher' && {
                    email: formData.email.trim(),
                    phone: formData.phone_number.trim(),
                    teacher_id: formData.teacher_id.trim(),
                    subjects: formData.subjects,
                    classes: formData.classes
                }),
                ...(userType === 'student' && {
                    admission_number: formData.admission_number.trim(),
                    class_id: formData.class_id,
                    parent_phone: formData.parent_phone.trim()
                })
            };
    
            const token = localStorage.getItem('access_token');
            if (!token) {
                throw new Error('No authentication token found');
            }
    
            const response = await fetch(`http://localhost:5000/api/users/${schoolId}/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });
    
            const data = await response.json();
    
            if (!response.ok) {
                throw new Error(data.error || 'Failed to create user');
            }
    
            setTempPassword(data.temporary_password);
            setShowPasswordModal(true);
            
            setFormData({
                first_name: '',
                last_name: '',
                ...(userType === 'student' ? { 
                    admission_number: '',
                    class_id: '',
                    parent_phone: ''
                } : { 
                    email: '',
                    phone_number: '',
                    teacher_id: '',
                    subjects: [],
                    classes: []
                })
            });
    
        } catch (err) {
            console.error('Creation error:', err);
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePasswordModalClose = () => {
        setShowPasswordModal(false);
        onClose();
    };

    const formatOptionLabel = ({ label, capacity, current }) => (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>{label}</span>
            <span style={{ color: '#666', fontSize: '0.8em' }}>
                {current}/{capacity} students
            </span>
        </div>
    );

    return (
        <>
            <div className="modal-overlay">
                <div className="modal-content">
                    <div className="modal-header">
                        <h2>
                            {userType === 'student' ? <Users size={20} /> : <UserPlus size={20} />}
                            Add New {userType === 'student' ? 'Student' : 'Teacher'}
                        </h2>
                        <button onClick={onClose} className="close-btn">
                            <X size={20} />
                        </button>
                    </div>

                    {error && <div className="error-message">{error}</div>}
                    
                    <form onSubmit={handleSubmit}>
                        <div className="form-row">
                            <div className="form-group">
                                <label>First Name</label>
                                <input
                                    type="text"
                                    name="first_name"
                                    value={formData.first_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                            
                            <div className="form-group">
                                <label>Last Name</label>
                                <input
                                    type="text"
                                    name="last_name"
                                    value={formData.last_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>
                        </div>
                        
                        {userType === 'teacher' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Email</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            name="phone_number"
                                            value={formData.phone_number || ""}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        
                        {userType === 'student' ? (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Admission Number</label>
                                        <input
                                            type="text"
                                            name="admission_number"
                                            value={formData.admission_number}
                                            onChange={handleInputChange}
                                            required
                                            placeholder="e.g., ADM2023001"
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Parent's Phone Number</label>
                                        <input
                                            type="tel"
                                            name="parent_phone"
                                            value={formData.parent_phone}
                                            onChange={handleInputChange}
                                            placeholder="+254700123456"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="form-group">
                                    <label>Class</label>
                                    <Select
                                        options={classesOptions}
                                        value={classesOptions.find(option => option.value === formData.class_id)}
                                        onChange={handleClassesChange}
                                        className="single-select"
                                        placeholder="Select class..."
                                        formatOptionLabel={formatOptionLabel}
                                        isClearable
                                        required
                                    />
                                </div>
                            </>
                        ) : (
                            <div className="form-group">
                                <label>Teacher ID (TSC/National ID)</label>
                                <input
                                    type="text"
                                    name="teacher_id"
                                    value={formData.teacher_id}
                                    onChange={handleInputChange}
                                    placeholder="TSC12345 or 12345678 (National ID)"
                                    required
                                />
                                <small className="form-hint">
                                    Enter either TSC number (format: TSC12345) or National ID (digits only)
                                </small>
                            </div>
                        )}
                        
                        {userType === 'teacher' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Subjects</label>
                                        <Select
                                            isMulti
                                            options={subjectsOptions}
                                            value={subjectsOptions.filter(option => 
                                                formData.subjects.includes(option.value)
                                            )}
                                            onChange={handleSubjectsChange}
                                            className="multi-select"
                                            placeholder="Select subjects..."
                                            closeMenuOnSelect={false}
                                        />
                                    </div>
                                    
                                    <div className="form-group">
                                        <label>Classes (Optional)</label>
                                        <Select
                                            isMulti
                                            options={classesOptions}
                                            value={classesOptions.filter(option => 
                                                formData.classes.includes(option.value)
                                            )}
                                            onChange={handleTeacherClassesChange}
                                            className="multi-select"
                                            placeholder="Assign classes (optional)..."
                                            formatOptionLabel={formatOptionLabel}
                                            closeMenuOnSelect={false}
                                        />
                                    </div>
                                </div>
                            </>
                        )}
                        
                        <div className="form-actions">
                            <button 
                                type="button" 
                                onClick={onClose} 
                                className="cancel-btn"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                className="submit-btn" 
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? (
                                    <span>Adding...</span>
                                ) : (
                                    <span>Add {userType === 'student' ? 'Student' : 'Teacher'}</span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {showPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal-content password-modal">
                        <div className="modal-header">
                            <h2>✅ User Created Successfully</h2>
                            <button onClick={handlePasswordModalClose} className="close-btn">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="modal-body">
                            <p>
                                {userType === 'student' ? 'Student' : 'Teacher'} {formData.first_name} {formData.last_name} 
                                has been successfully created.
                            </p>
                            
                            <div className="password-display">
                                <p>Temporary Password:</p>
                                <div className="password-value">{tempPassword}</div>
                            </div>
                            
                            <p className="password-instruction">
                                Please provide this password to the user. They will be required to change it on first login.
                            </p>
                        </div>
                        
                        <div className="modal-footer">
                            <button 
                                onClick={handlePasswordModalClose}
                                className="confirm-btn"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

  const AddSubjectModal = ({ schoolId, onClose, onSubjectAdded }) => {
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        description: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!formData.name.trim()) {
            setError('Subject name is required');
            return false;
        }
        
        // Optional: Validate code format if needed
        if (formData.code && !/^[A-Za-z0-9]{1,10}$/.test(formData.code)) {
            setError('Subject code should be alphanumeric (max 10 characters)');
            return false;
        }
        
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) return;

        setIsSubmitting(true);
        setError('');

        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/subjects`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: formData.name.trim(),
                    code: formData.code.trim().toUpperCase(), // Convert code to uppercase
                    description: formData.description.trim()
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to add subject');
            }

            onSubjectAdded(data.subject);
            onClose();
        } catch (err) {
            console.error('Error adding subject:', err);
            setError(err.message || 'Failed to add subject. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h2>Add New Subject</h2>
                    <button onClick={onClose} className="close-btn">
                        &times;
                    </button>
                </div>

                {error && <div className="error-message">{error}</div>}
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>Subject Name *</label>
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            required
                            placeholder="e.g., Mathematics"
                        />
                    </div>
                    
                    <div className="form-group">
                        <label>Subject Code</label>
                        <input
                            type="text"
                            name="code"
                            value={formData.code}
                            onChange={handleInputChange}
                            placeholder="e.g., MATH (optional)"
                            maxLength="10"
                        />
                        <small className="form-hint">
                            Short code for the subject (max 10 characters)
                        </small>
                    </div>
                    
                    <div className="form-group">
                        <label>Description</label>
                        <textarea
                            name="description"
                            value={formData.description}
                            onChange={handleInputChange}
                            placeholder="Optional description"
                            rows="3"
                        />
                    </div>
                    
                    <div className="form-actions">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="cancel-btn"
                            disabled={isSubmitting}
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            className="submit-btn" 
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Adding...' : 'Add Subject'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

  const AnnouncementsWidget = () => (
    <div className="announcements-widget">
      <div className="widget-header">
        <h3>School Announcements</h3>
        {user.role === 'school_admin' && (
          <button className="add-btn">
            <Plus size={18} />
            Add
          </button>
        )}
      </div>
      <div className="announcements-list">
        {schoolData.announcements.map((announcement) => (
          <div key={announcement.id} className={`announcement-item ${announcement.priority}`}>
            <div className="announcement-header">
              <h4>{announcement.title}</h4>
              <span className={`priority-badge ${announcement.priority}`}>
                {announcement.priority}
              </span>
            </div>
            <p className="announcement-content">{announcement.content}</p>
          </div>
        ))}
      </div>
    </div>
  );

  const CustomizationPanel = () => (
    <div className="customization-panel">
      <div className="panel-header">
        <h3>Customize Dashboard</h3>
        <button onClick={() => setIsCustomizing(false)}>
          <X />
        </button>
      </div>

      <div className="panel-section">
        <h4><Palette /> Theme Options</h4>
        <div className="theme-options">
          <div className="theme-option">
            <input
              type="radio"
              id="default-theme"
              name="theme"
              checked={themeType === 'default'}
              onChange={() => setThemeType('default')}
            />
            <label htmlFor="default-theme">Default Theme</label>
          </div>
          <div className="theme-option">
            <input
              type="radio"
              id="custom-theme"
              name="theme"
              checked={themeType === 'custom'}
              onChange={() => setThemeType('custom')}
            />
            <label htmlFor="custom-theme">Custom Theme</label>
          </div>
        </div>

        {themeType === 'custom' && (
          <div className="custom-theme-options">
            <div className="color-picker">
              <label>Background</label>
              <input
                type="color"
                value={dashboardSettings.school_branding.background || '#ffffff'}
                onChange={handleBackgroundChange}
              />
            </div>
            <div className="color-picker">
              <label>Font Color</label>
              <input
                type="color"
                value={dashboardSettings.school_branding.font_color || '#333333'}
                onChange={handleFontColorChange}
              />
            </div>
            {user.role === 'school_admin' && (
              <div className="apply-to-all">
                <input
                  type="checkbox"
                  id="apply-to-all"
                  checked={applyToAllUsers}
                  onChange={() => setApplyToAllUsers(!applyToAllUsers)}
                />
                <label htmlFor="apply-to-all">
                  Apply to all {school.name} users
                </label>
              </div>
            )}
          </div>
        )}
      </div>

      {user.role === 'school_admin' && (
        <div className="panel-section">
          <h4><Grid /> School Modules</h4>
          <div className="module-toggles">
            {Object.entries(dashboardSettings.enabled_modules).map(([module, enabled]) => (
              <div key={module} className="toggle-item">
                <span>{module.replace('_', ' ')}</span>
                <button
                  className={`toggle-btn ${enabled ? 'active' : ''}`}
                  onClick={() => toggleModule(module)}
                >
                  <div className="toggle-switch" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel-section">
        <h4><Layout /> Dashboard Widgets</h4>
        <div className="widget-toggles">
          {Object.entries(dashboardSettings.enabled_widgets).map(([widget, enabled]) => (
            <div key={widget} className="toggle-item">
              <span>{widget.replace(/_/g, ' ')}</span>
              <button
                className="icon-btn"
                onClick={() => toggleWidget(widget)}
              >
                {enabled ? <Eye /> : <EyeOff />}
              </button>
            </div>
          ))}
        </div>
      </div>

      <button className="save-btn" onClick={saveDashboardSettings}>
        <Save />
        Save Changes
      </button>
    </div>
  );

   return (
    <div 
      className="dashboard-container" 
      style={{
        '--primary-color': dashboardSettings.school_branding.primary_color,
        '--secondary-color': dashboardSettings.school_branding.secondary_color,
        '--background-color': dashboardSettings.school_branding.background || '#ffffff',
        '--font-color': dashboardSettings.school_branding.font_color || '#333333',
        backgroundColor: dashboardSettings.school_branding.background || '#ffffff',
        color: dashboardSettings.school_branding.font_color || '#333333'
      }}
    >
      <header className="dashboard-header">
        <div className="header-content">
          <div className="school-info">
            <div className="school-logo">
              {dashboardSettings.school_branding.logo_url ? (
                <img 
                  src={dashboardSettings.school_branding.logo_url} 
                  alt={`${school.name} Logo`} 
                />
              ) : (
                <BookOpen size={32} />
              )}
            </div>
            <div className="school-text">
              <h1>{school.name}</h1>
              <p>School Dashboard</p>
            </div>
          </div>
          
          <div className="user-actions">
            <div className="user-info">
              <p className="user-name">{user.name}</p>
              <p className="user-role">{user.role.replace('_', ' ')}</p>
            </div>
            
            {(user.role === 'school_admin' || user.role === 'system_owner') && (
              <button 
                className="icon-btn"
                onClick={toggleCustomizationMode}
                title="Customize Dashboard"
              >
                <Edit3 size={20} />
              </button>
            )}
            
            <button className="icon-btn">
              <Settings size={20} />
            </button>
            <button className="icon-btn" onClick={handleLogout}>
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* TAB NAVIGATION */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <BarChart3 size={18} className="tab-icon" />
            Dashboard
          </button>
          <button 
            className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={18} className="tab-icon" />
            User Management
          </button>
        </div>

        {/* MAIN CONTENT AREA */}
        {activeTab === 'dashboard' ? (
          <>
            {/* DASHBOARD CONTENT */}
            {dashboardSettings.enabled_widgets.stats_overview && (
              <div className="stats-grid">
                <StatsCard
                  title="Total Students"
                  value={schoolData.stats.students.toLocaleString()}
                  icon={Users}
                />
                <StatsCard
                  title="Teachers"
                  value={schoolData.stats.teachers}
                  icon={UserCheck}
                />
                <StatsCard
                  title="Classes"
                  value={schoolData.stats.classes}
                  icon={BookOpen}
                />
                {dashboardSettings.enabled_modules.attendance && (
                  <>
                    <StatsCard
                      title="Daily Attendance"
                      value={`${schoolData.stats.attendance.daily}%`}
                      icon={TrendingUp}
                    />
                    <StatsCard
                      title="Weekly Attendance"
                      value={`${schoolData.stats.attendance.weekly}%`}
                      icon={Calendar}
                    />
                  </>
                )}
              </div>
            )}

            <div className="dashboard-content">
              <div className="main-content">
                {dashboardSettings.enabled_widgets.enrollment_chart && (
                  <div className="chart-widget">
                    <h3>Student Enrollment Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={schoolData.analytics.enrollment.labels.map((label, index) => ({
                        month: label,
                        students: schoolData.analytics.enrollment.data[index]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line 
                          type="monotone" 
                          dataKey="students" 
                          stroke={dashboardSettings.school_branding.primary_color} 
                          strokeWidth={2} 
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {dashboardSettings.enabled_widgets.attendance_overview && dashboardSettings.enabled_modules.attendance && (
                  <div className="chart-widget">
                    <h3>Weekly Attendance</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={schoolData.analytics.attendance.labels.map((label, index) => ({
                        day: label,
                        attendance: schoolData.analytics.attendance.data[index]
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="attendance" fill={dashboardSettings.school_branding.secondary_color} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              <div className="sidebar-content">
                {dashboardSettings.enabled_widgets.activity_feed && <ActivityFeed />}
                {dashboardSettings.enabled_widgets.quick_actions && <QuickActions />}
                {dashboardSettings.enabled_widgets.announcements && dashboardSettings.enabled_modules.announcements && (
                  <AnnouncementsWidget />
                )}
              </div>
            </div>

            {dashboardSettings.enabled_widgets.fee_status && dashboardSettings.enabled_modules.fees && (
              <div className="chart-widget">
                <h3>Fee Collection Status</h3>
                <div className="fee-chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsPieChart>
                      <Pie
                        data={schoolData.analytics.fees}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        dataKey="value"
                        label
                      >
                        {schoolData.analytics.fees.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                  <div className="fee-legend">
                    {schoolData.analytics.fees.map((item, index) => (
                      <div key={index} className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* USER MANAGEMENT CONTENT */
          <UserManagement schoolId={school.id} />
        )}
      </main>

      {isCustomizing && <CustomizationPanel />}
    </div>
  );
};

export default MultiSchoolDashboard;
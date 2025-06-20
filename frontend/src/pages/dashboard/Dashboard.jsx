import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  Users, BookOpen, Calendar, TrendingUp, DollarSign, UserCheck, Bell,
  Settings, LogOut, Edit3, Save, X, Eye, EyeOff, Grid, BarChart3,
  PieChart as PieChartIcon, Activity, Upload, Palette, Layout, Plus, UserPlus, Bookmark
} from 'lucide-react';
import Select from 'react-select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import './Dashboard.css';

const MultiSchoolDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [dashboardSettings, setDashboardSettings] = useState(null);
  const [schoolData, setSchoolData] = useState(null);
  const [error, setError] = useState(null);

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
            // If we can't parse the error response, use the status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
    
        const dashboardData = await response.json();
    
        // 4. Validate response structure
        if (!dashboardData.school || !dashboardData.config) {
          throw new Error('Invalid dashboard data received');
        }
    
        // 5. Update state with safe defaults
        setUser({
          id: decoded.sub,
          name: decoded.name || 'School Admin',
          role: decoded.role || 'user',
          school_id: schoolId
        });
        
        setSchool(dashboardData.school);
        setSchoolData(dashboardData);
        
        setDashboardSettings({
          school_branding: dashboardData.config.school_branding || {
            primary_color: "#3B82F6",
            secondary_color: "#10B981",
            logo_url: null,
            school_name_display: true
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
    
      } catch (error) {
        console.error('Dashboard error:', error);
        setError(error.message);
        
        // Only redirect to login for auth-related errors
        if (/unauthorized|invalid token|401|403/i.test(error.message)) {
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    // Token refresh function
    const refreshToken = async () => {
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) throw new Error('No refresh token available');
    
        const response = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${refreshToken}`
          }
        });
    
        if (!response.ok) {
          throw new Error('Token refresh failed');
        }
    
        const { access_token } = await response.json();
        localStorage.setItem('access_token', access_token);
        return access_token;
      } catch (error) {
        console.error('Token refresh failed:', error);
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        navigate('/login');
        throw error;
      }
    };

    initializeDashboard();
  }, [navigate]);
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
      const response = await fetch(`/api/dashboard/${school.id}/settings`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(dashboardSettings)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save settings');
      }
      setIsCustomizing(false);
      const res = await fetch(`/api/schools/${school.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const updatedSchool = await res.json();
      setSchool(updatedSchool);
    } catch (error) {
      setError(error.message);
      console.error('Failed to save settings:', error);
    }
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

  const ActivityFeed = () => (
    <div className="activity-feed">
      <div className="widget-header">
        <h3>Recent Activity</h3>
        <Bell />
      </div>
      <div className="activities-list">
        {schoolData.activities.map((activity) => {
          const IconComponent = activity.icon === 'Users' ? Users :
                              activity.icon === 'UserCheck' ? UserCheck :
                              activity.icon === 'DollarSign' ? DollarSign :
                              activity.icon === 'BookOpen' ? BookOpen : Activity;
          return (
            <div key={activity.id} className="activity-item">
              <div className="activity-content">
                <div className="activity-icon">
                  <IconComponent size={18} />
                </div>
                <div className="activity-text">
                  <p>{activity.message}</p>
                  <p className="activity-time">{activity.time}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

// Updated QuickActions component with all modals
const QuickActions = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false);
  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [showScheduleEventModal, setShowScheduleEventModal] = useState(false);
  const [userType, setUserType] = useState('student'); // 'student' or 'teacher'

  const handleAddClick = (type) => {
    setUserType(type);
    setShowAddModal(true);
  };

  const handleClassAdded = (newClass) => {
    console.log('Class added:', newClass);
    // You can add logic here to refresh the dashboard data
    // or show a success message
  };

  const handleEventScheduled = (newEvent) => {
    console.log('Event scheduled:', newEvent);
    // You can add logic here to refresh the dashboard data
    // or show a success message
  };

  // Add null checks for dashboardSettings
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

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal 
          userType={userType}
          schoolId={school.id}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <AddSubjectModal
          schoolId={school.id}
          onClose={() => setShowAddSubjectModal(false)}
          onSubjectAdded={() => {
            setShowAddSubjectModal(false);
            // You might want to refresh subjects list here if needed
          }}
        />
      )}

      {/* Add Class Modal */}
      {showAddClassModal && (
        <AddClassModal
          schoolId={school.id}
          onClose={() => setShowAddClassModal(false)}
          onClassAdded={handleClassAdded}
        />
      )}

      {/* Schedule Event Modal */}
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
// Add Class Modal Component
const AddClassModal = ({ schoolId, onClose, onClassAdded }) => {
  const [formData, setFormData] = useState({
    name: '',
    grade_level: '',
    class_teacher: ''
  });
  
  const [teachersOptions, setTeachersOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch teachers when component mounts
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        const response = await fetch(`/api/schools/${schoolId}/teachers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
          const teachersData = await response.json();
          setTeachersOptions(teachersData.map(teacher => ({
            value: teacher.id,
            label: `${teacher.first_name} ${teacher.last_name}`
          })));
        }
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      }
    };

    fetchTeachers();
  }, [schoolId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        name: formData.name.trim(),
        grade_level: parseInt(formData.grade_level),
        class_teacher_id: formData.class_teacher,
        school_id: schoolId
      };

      const response = await fetch(`/api/schools/${schoolId}/classes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create class');
      }

      onClassAdded && onClassAdded(data.class);
      onClose();
    } catch (err) {
      console.error('Error creating class:', err);
      setError(err.message || 'Failed to create class. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>
            <BookOpen size={20} />
            Create New Class
          </h2>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
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
              value={teachersOptions.find(option => option.value === formData.class_teacher)}
              onChange={handleTeacherChange}
              className="single-select"
              placeholder="Select a teacher for this class"
              required
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

// Schedule Event Modal Component
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
  const PasswordDisplayModal = ({ open, onClose, userData }) => {
    return (
      <Dialog open={open} onClose={onClose}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <CheckCircle color="success" sx={{ mr: 1 }} />
            User Created Successfully
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            {userData.role === 'student' ? 'Student' : 'Teacher'} {userData.first_name} {userData.last_name} has been created.
          </Typography>
          
          <Typography variant="body1" gutterBottom>
            <strong>Temporary Password:</strong>
          </Typography>
          
          <Box 
            sx={{
              p: 2,
              my: 2,
              bgcolor: '#f5f5f5',
              borderRadius: 1,
              textAlign: 'center',
              fontSize: '1.2rem',
              fontWeight: 'bold'
            }}
          >
            {userData.temporary_password}
          </Box>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Please provide this password to the user. They will be required to change it on first login.
          </Typography>
          
          <Box mt={2} display="flex" justifyContent="flex-end">
            <Button 
              variant="contained" 
              color="primary" 
              onClick={onClose}
            >
              Close
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    );
  };
  
  const AddUserModal = ({ userType, schoolId, onClose }) => {
    const [formData, setFormData] = useState({
      first_name: '',
      last_name: '',
      ...(userType === 'student' ? { 
        admission_number: '',
        grade_level: '' 
      } : { 
        email: '',
        phone_number: '',
        teacher_id: '', // Changed from tsc_number
        subjects: []   // Changed from single subject to array
      })
    });
    
    const [subjectsOptions, setSubjectsOptions] = useState([]); // Add state for subjects
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [tempPassword, setTempPassword] = useState('');
  
    // Fetch subjects when component mounts and when schoolId changes
    useEffect(() => {
      if (userType === 'teacher' && schoolId) {
        const fetchSubjects = async () => {
          try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/subjects`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              // Check the response structure here
              console.log("Subjects data:", data);
              
              // Handle both array and object responses
              const subjectsArray = Array.isArray(data) ? data : 
                                  (data.subjects || []);
              
              setSubjectsOptions(subjectsArray.map(subject => ({
                value: subject.id,
                label: subject.name
              })));
            } else {
              console.error('Failed to fetch subjects:', response.status);
            }
          } catch (err) {
            console.error('Failed to fetch subjects:', err);
          }
        };
        
        fetchSubjects();
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
        if (!formData.grade_level) {
          setError('Grade level is required');
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
        if (formData.subjects.length === 0) {
          setError('At least one subject is required');
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
        // Debug logs
        console.log('Current user role:', user.role);
        console.log('JWT token:', localStorage.getItem('access_token'));
        console.log('Creating user for school:', schoolId);
    
        const payload = {
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          role: userType,
          school_id: schoolId,
          ...(userType === 'teacher' && {
            email: formData.email.trim(),
            phone: formData.phone_number.trim(),
            teacher_id: formData.teacher_id.trim(),
            subjects: formData.subjects
          }),
          ...(userType === 'student' && {
            admission_number: formData.admission_number.trim(),
            grade_level: parseInt(formData.grade_level)
          })
        };
    
        console.log('Request payload:', payload);
    
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
        console.log('Response:', data);
    
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create user');
        }
    
        setTempPassword(data.temporary_password);
        setShowPasswordModal(true);
        
        // Reset form
        setFormData({
          first_name: '',
          last_name: '',
          ...(userType === 'student' ? { 
            admission_number: '',
            grade_level: '' 
          } : { 
            email: '',
            phone_number: '',
            teacher_id: '',
            subjects: []
          })
        });
    
      } catch (err) {
        console.error('Creation error:', err);
        setError(err.message);
        
        // If token is invalid/expired, redirect to login
        if (err.message.includes('token') || err.message.includes('401') || err.message.includes('403')) {
          localStorage.removeItem('access_token');
          navigate('/login');
        }
      } finally {
        setIsSubmitting(false);
      }
    };

  const handlePasswordModalClose = () => {
    setShowPasswordModal(false);
    onClose(); // Close the entire modal after showing password
  };

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
            {/* Your form fields here */}
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
            
            {userType === 'teacher' && (
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
                  <label>Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    required
                    placeholder="e.g., +254712345678"
                  />
                </div>
              </>
            )}
            
            {userType === 'student' ? (
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
            
            {userType === 'student' && (
              <div className="form-group">
                <label>Grade Level</label>
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
            )}
            
            {userType === 'teacher' && (
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
                    required
                  />
                </div>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError('Subject name is required');
      return;
    }

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
          code: formData.code.trim(),
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
            />
          </div>
          
          <div className="form-group">
            <label>Subject Code</label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
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

      {user.role === 'school_admin' && (
        <div className="panel-section">
          <h4><Palette /> School Branding</h4>
          <div className="branding-options">
            <div className="color-picker">
              <label>Primary Color</label>
              <input
                type="color"
                value={dashboardSettings.school_branding.primary_color}
                onChange={(e) => updateSchoolBranding({ primary_color: e.target.value })}
              />
            </div>
            <div className="color-picker">
              <label>Secondary Color</label>
              <input
                type="color"
                value={dashboardSettings.school_branding.secondary_color}
                onChange={(e) => updateSchoolBranding({ secondary_color: e.target.value })}
              />
            </div>
            <button className="upload-button">
              <Upload />
              <span>Upload School Logo</span>
            </button>
          </div>
        </div>
      )}

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
    <div className="dashboard-container" style={{
      '--primary-color': dashboardSettings.school_branding.primary_color,
      '--secondary-color': dashboardSettings.school_branding.secondary_color
    }}>
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
              <StatsCard
                title="Attendance Rate"
                value={`${schoolData.stats.attendance.daily}%`}
                icon={TrendingUp}
              />
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
      </main>

      {isCustomizing && <CustomizationPanel />}
    </div>
  );
};

export default MultiSchoolDashboard;
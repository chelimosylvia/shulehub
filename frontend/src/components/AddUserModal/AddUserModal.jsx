import { useState } from 'react';
import { Users, BookOpen, Calendar, UserPlus } from 'lucide-react';

const QuickActions = ({ school, dashboardSettings }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [userType, setUserType] = useState('student'); // 'student' or 'teacher'

  const handleAddClick = (type) => {
    setUserType(type);
    setShowAddModal(true);
  };

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
        <button className="action-btn">
          <BookOpen size={18} />
          <p>Create Class</p>
        </button>
        {dashboardSettings.enabled_modules.events && (
          <button className="action-btn">
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
    </div>
  );
};

// Add this modal component in the same file or import it
const AddUserModal = ({ userType, schoolId, onClose }) => {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    ...(userType === 'student' ? { grade_level: '' } : { subject: '' })
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`/api/users/${schoolId}/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          role: userType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add user');
      }

      setSuccess(`${userType === 'student' ? 'Student' : 'Teacher'} added successfully!`);
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          ...(userType === 'student' ? { grade_level: '' } : { subject: '' })
        });
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
        {success && <div className="success-message">{success}</div>}
        
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
          
          {userType === 'student' ? (
            <div className="form-group">
              <label>Grade Level</label>
              <select
                name="grade_level"
                value={formData.grade_level}
                onChange={handleInputChange}
                required
              >
                <option value="">Select grade</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i+1} value={i+1}>Grade {i+1}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                required
              />
            </div>
          )}
          
          <div className="form-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Cancel
            </button>
            <button type="submit" className="submit-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : `Add ${userType === 'student' ? 'Student' : 'Teacher'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
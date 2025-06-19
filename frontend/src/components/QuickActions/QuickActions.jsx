import { useState } from 'react';
import { Users, BookOpen, Calendar, UserPlus } from 'lucide-react';
import AddUserModal from './AddUserModal';

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

export default QuickActions;
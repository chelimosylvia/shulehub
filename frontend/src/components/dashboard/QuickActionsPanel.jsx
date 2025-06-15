// src/components/dashboard/QuickActionsPanel.jsx
import React from 'react';
import { Link } from 'react-router-dom';

const QuickActionsPanel = ({ schoolId }) => {
  return (
    <div className="quick-actions-panel">
      <h3>Quick Actions</h3>
      <div className="actions-grid">
        <Link to={`/school/${schoolId}/students/new`} className="action-card">
          <span>👤</span>
          <p>Add Student</p>
        </Link>
        <Link to={`/school/${schoolId}/teachers/new`} className="action-card">
          <span>👩‍🏫</span>
          <p>Add Teacher</p>
        </Link>
        <Link to={`/school/${schoolId}/classes/new`} className="action-card">
          <span>📚</span>
          <p>Create Class</p>
        </Link>
        <Link to={`/school/${schoolId}/reports`} className="action-card">
          <span>📊</span>
          <p>Generate Reports</p>
        </Link>
      </div>
    </div>
  );
};

export default QuickActionsPanel;
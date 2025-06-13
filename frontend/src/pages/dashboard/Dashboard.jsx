import React from 'react';
import { School } from 'lucide-react';
import './Dashboard.css';

const AdminDashboard = () => {
  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <School className="dashboard-icon" />
        <h1>Admin Dashboard</h1>
      </header>
      <main className="dashboard-main">
        <p>Welcome, School Admin!</p>
        <p>Here you can manage teachers, students, classes, and more.</p>
      </main>
    </div>
  );
};

export default AdminDashboard;

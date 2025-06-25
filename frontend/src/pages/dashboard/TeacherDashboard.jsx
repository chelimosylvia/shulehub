import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  Users, BookOpen, Calendar, Clipboard, Layout, UserCheck 
} from 'lucide-react';
import './TeacherDashboard.css';

const SchoolTeacherDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [school, setSchool] = useState(null);
  const [dashboardData, setDashboardData] = useState({ classes: [], students: [], assignments: [] });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [attendanceClassId, setAttendanceClassId] = useState(null);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [attendanceDate, setAttendanceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [loadingStudents, setLoadingStudents] = useState(false);

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return navigate('/login');
        const decoded = jwtDecode(token);

        const res = await fetch(`/api/schools/${decoded.school_id}/teacher/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!res.ok) throw new Error('Failed to load dashboard');
        const data = await res.json();

        setUser({
          id: decoded.sub,
          name: data.teacher?.full_name || 'Teacher',
          tscNumber: data.teacher?.tsc_number,
          nationalId: data.teacher?.national_id
        });

        setSchool(data.school);
        setDashboardData(data);

      } catch (err) {
        console.error('Dashboard error:', err);
      }
    };
    initializeDashboard();
  }, [navigate]);

  const fetchStudentsForClass = async (classId) => {
    setLoadingStudents(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/schools/${school.id}/classes/${classId}/students`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const students = await res.json();
      setAttendanceRecords(students.map(s => ({
        student_id: s.id,
        name: s.name,
        status: 'present',
        remarks: ''
      })));
    } catch (err) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAttendanceChange = (index, field, value) => {
    setAttendanceRecords(prev =>
      prev.map((rec, i) => (i === index ? { ...rec, [field]: value } : rec))
    );
  };

  const handleSubmitAttendance = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/api/schools/${school.id}/teacher/attendance`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          date: attendanceDate,
          class_id: attendanceClassId,
          records: attendanceRecords
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      alert('Attendance recorded successfully');
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  return (
    <div className="teacher-dashboard">
      {/* Sidebar */}
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <UserCheck size={40} />
          <h3>{user?.name}</h3>
        </div>
        <nav>
          <button onClick={() => setActiveTab('dashboard')}>Dashboard</button>
          <button onClick={() => setActiveTab('attendance')}>Record Attendance</button>
        </nav>
      </div>

      {/* Main content */}
      <div className="dashboard-main">
        {activeTab === 'dashboard' && (
          <>
            <h1>Welcome back, {user?.name.split(' ')[0]}</h1>
            <div className="stats-grid">
              <div className="stat-card"><BookOpen /> Classes: {dashboardData.classes.length}</div>
              <div className="stat-card"><Users /> Students: {dashboardData.students.total}</div>
              <div className="stat-card"><Clipboard /> Assignments: {dashboardData.assignments?.upcoming?.length || 0}</div>
            </div>
          </>
        )}

        {activeTab === 'attendance' && (
          <div className="attendance-section">
            <h2>Record Attendance</h2>

            <label>Select Class</label>
            <select
              value={attendanceClassId || ''}
              onChange={(e) => {
                const selected = parseInt(e.target.value);
                setAttendanceClassId(selected);
                fetchStudentsForClass(selected);
              }}
            >
              <option value="">-- Select Class --</option>
              {dashboardData.classes.map(cls => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>

            <label>Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={e => setAttendanceDate(e.target.value)}
            />

            {loadingStudents ? (
              <p>Loading students...</p>
            ) : attendanceRecords.length > 0 && (
              <table className="attendance-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Status</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceRecords.map((rec, index) => (
                    <tr key={rec.student_id}>
                      <td>{rec.name}</td>
                      <td>
                        <select
                          value={rec.status}
                          onChange={e => handleAttendanceChange(index, 'status', e.target.value)}
                        >
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                          <option value="late">Late</option>
                          <option value="excused">Excused</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={rec.remarks}
                          onChange={e => handleAttendanceChange(index, 'remarks', e.target.value)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {attendanceRecords.length > 0 && (
              <button className="submit-btn" onClick={handleSubmitAttendance}>
                Submit Attendance
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SchoolTeacherDashboard;

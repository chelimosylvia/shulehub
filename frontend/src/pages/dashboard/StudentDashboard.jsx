import React, { useState, useEffect } from 'react';
import { 
  Layout, BookOpen, Clipboard, Award, UserCheck, Calendar, User 
} from 'react-feather';

const StudentDashboard = ({ user, school, schoolData }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    const fetchStudentData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        const assignmentsRes = await fetch(`/api/students/${user.id}/assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setAssignments(await assignmentsRes.json());
        
        const gradesRes = await fetch(`/api/students/${user.id}/grades`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const gradesData = await gradesRes.json();
        setGrades(gradesData);
        
        if (gradesData.length > 0) {
          setSelectedClass(gradesData[0].class_id);
        }
        
        const attendanceRes = await fetch(`/api/students/${user.id}/attendance`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setAttendance(await attendanceRes.json());
      } catch (error) {
        console.error('Error fetching student data:', error);
      }
    };
    
    fetchStudentData();
  }, [user.id]);

  return (
    <div className="student-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="student-avatar">
            <User size={32} />
          </div>
          <div className="student-info">
            <h3>{user.name}</h3>
            <p>Grade {user.grade_level}</p>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          <ul>
            <li className={activeTab === 'dashboard' ? 'active' : ''}>
              <button onClick={() => setActiveTab('dashboard')}>
                <Layout size={18} />
                <span>Dashboard</span>
              </button>
            </li>
            <li className={activeTab === 'classes' ? 'active' : ''}>
              <button onClick={() => setActiveTab('classes')}>
                <BookOpen size={18} />
                <span>My Classes</span>
              </button>
            </li>
            <li className={activeTab === 'assignments' ? 'active' : ''}>
              <button onClick={() => setActiveTab('assignments')}>
                <Clipboard size={18} />
                <span>Assignments</span>
              </button>
            </li>
            <li className={activeTab === 'grades' ? 'active' : ''}>
              <button onClick={() => setActiveTab('grades')}>
                <Award size={18} />
                <span>Grades</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      
      <div className="dashboard-content">
        {activeTab === 'dashboard' && (
          <StudentOverview 
            user={user} 
            school={school} 
            assignments={assignments} 
            grades={grades}
            attendance={attendance}
          />
        )}
        
        {activeTab === 'classes' && (
          <StudentClasses 
            classes={grades.map(g => ({ 
              id: g.class_id, 
              name: g.class_name,
              teacher: g.teacher_name 
            }))}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
          />
        )}
        
        {activeTab === 'assignments' && (
          <StudentAssignments 
            assignments={assignments} 
            selectedClass={selectedClass}
          />
        )}
        
        {activeTab === 'grades' && (
          <StudentGrades 
            grades={grades} 
            selectedClass={selectedClass}
          />
        )}
      </div>
    </div>
  );
};

// Student Sub-Components
const StudentOverview = ({ user, school, assignments, grades, attendance }) => {
  const upcomingAssignments = assignments
    .filter(a => new Date(a.due_date) > new Date())
    .slice(0, 3);

  const averageGrade = grades.length > 0 
    ? (grades.reduce((sum, g) => sum + g.grade, 0) / grades.length).toFixed(1)
    : 'N/A';

  const attendanceRate = attendance.length > 0
    ? ((attendance.filter(a => a.status === 'present').length / attendance.length) * 100).toFixed(1)
    : 'N/A';

  return (
    <div className="student-overview">
      <div className="welcome-banner">
        <h2>Welcome back, {user.name.split(' ')[0]}!</h2>
        <p>{school.name} • Grade {user.grade_level}</p>
      </div>
      
      <div className="stats-grid">
        <StatCard 
          icon={<Award size={24} />} 
          title="Average Grade" 
          value={`${averageGrade}%`} 
        />
        <StatCard 
          icon={<UserCheck size={24} />} 
          title="Attendance" 
          value={`${attendanceRate}%`} 
        />
        <StatCard 
          icon={<Clipboard size={24} />} 
          title="Pending Assignments" 
          value={assignments.filter(a => !a.submitted).length} 
        />
      </div>
      
      <div className="overview-sections">
        <UpcomingAssignments assignments={upcomingAssignments} />
        <RecentGrades grades={grades} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, title, value }) => (
  <div className="stat-card">
    <div className="stat-content">
      <h3>{title}</h3>
      <p className="stat-value">{value}</p>
    </div>
    <div className="stat-icon">{icon}</div>
  </div>
);

const UpcomingAssignments = ({ assignments }) => (
  <div className="upcoming-assignments">
    <h3>Upcoming Assignments</h3>
    {assignments.length > 0 ? (
      <div className="assignments-list">
        {assignments.map(assignment => (
          <div key={assignment.id} className="assignment-item">
            <div className="assignment-info">
              <h4>{assignment.title}</h4>
              <p className="assignment-class">{assignment.class_name}</p>
              <p className="assignment-due">
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </p>
            </div>
            <div className="assignment-status">
              {assignment.submitted ? (
                <span className="status-submitted">Submitted</span>
              ) : (
                <span className="status-pending">Pending</span>
              )}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="no-assignments">No upcoming assignments</p>
    )}
  </div>
);

const RecentGrades = ({ grades }) => (
  <div className="recent-grades">
    <h3>Recent Grades</h3>
    {grades.length > 0 ? (
      <div className="grades-list">
        {grades.slice(0, 3).map(grade => (
          <div key={grade.assignment_id} className="grade-item">
            <div className="grade-info">
              <h4>{grade.assignment_name}</h4>
              <p className="grade-class">{grade.class_name}</p>
            </div>
            <div className="grade-value">
              <span className={`grade-badge ${getGradeClass(grade.grade)}`}>
                {grade.grade}%
              </span>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="no-grades">No grades available</p>
    )}
  </div>
);

const StudentClasses = ({ classes, selectedClass, onSelectClass }) => {
  return (
    <div className="student-classes">
      <h2>My Classes</h2>
      
      <div className="classes-grid">
        {classes.map(classItem => (
          <div 
            key={classItem.id} 
            className={`class-card ${selectedClass === classItem.id ? 'active' : ''}`}
            onClick={() => onSelectClass(classItem.id)}
          >
            <div className="class-icon">
              <BookOpen size={24} />
            </div>
            <div className="class-info">
              <h3>{classItem.name}</h3>
              <p>Teacher: {classItem.teacher}</p>
            </div>
          </div>
        ))}
      </div>
      
      {selectedClass && (
        <ClassDetails 
          classId={selectedClass} 
          classInfo={classes.find(c => c.id === selectedClass)} 
        />
      )}
    </div>
  );
};

const StudentAssignments = ({ assignments, selectedClass }) => {
  const [activeTab, setActiveTab] = useState('pending');

  const filteredAssignments = selectedClass
    ? assignments.filter(a => a.class_id === selectedClass)
    : assignments;

  const pendingAssignments = filteredAssignments.filter(a => !a.submitted);
  const completedAssignments = filteredAssignments.filter(a => a.submitted);

  return (
    <div className="student-assignments">
      <div className="assignments-header">
        <h2>Assignments</h2>
        <div className="assignment-filters">
          <button 
            className={`filter-btn ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            Pending ({pendingAssignments.length})
          </button>
          <button 
            className={`filter-btn ${activeTab === 'completed' ? 'active' : ''}`}
            onClick={() => setActiveTab('completed')}
          >
            Completed ({completedAssignments.length})
          </button>
        </div>
      </div>
      
      <div className="assignments-container">
        {activeTab === 'pending' ? (
          pendingAssignments.length > 0 ? (
            pendingAssignments.map(assignment => (
              <AssignmentCard 
                key={assignment.id}
                assignment={assignment}
                type="pending"
              />
            ))
          ) : (
            <p className="no-assignments">No pending assignments</p>
          )
        ) : (
          completedAssignments.length > 0 ? (
            completedAssignments.map(assignment => (
              <AssignmentCard 
                key={assignment.id}
                assignment={assignment}
                type="completed"
              />
            ))
          ) : (
            <p className="no-assignments">No completed assignments</p>
          )
        )}
      </div>
    </div>
  );
};

const StudentGrades = ({ grades, selectedClass }) => {
  const filteredGrades = selectedClass
    ? grades.filter(g => g.class_id === selectedClass)
    : grades;

    const averageGrade = filteredGrades.length > 0
    ? (filteredGrades.reduce((sum, g) => sum + g.grade, 0) / filteredGrades.length)
    : 0;

  return (
    <div className="student-grades">
      <h2>Grades</h2>
      
      <div className="grades-summary">
        <div className="average-grade">
          <h3>Class Average</h3>
          <div className="grade-circle">
            {averageGrade.toFixed(1)}%
          </div>
        </div>
        
        <div className="grades-list">
          <table>
            <thead>
              <tr>
                <th>Assignment</th>
                <th>Grade</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.map(grade => (
                <tr key={grade.assignment_id}>
                  <td>{grade.assignment_name}</td>
                  <td>
                    <span className={`grade-badge ${getGradeClass(grade.grade)}`}>
                      {grade.grade}%
                    </span>
                  </td>
                  <td>{grade.feedback || 'No feedback'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Helper function
const getGradeClass = (grade) => {
  if (grade >= 90) return 'excellent';
  if (grade >= 80) return 'good';
  if (grade >= 70) return 'average';
  if (grade >= 60) return 'below-average';
  return 'poor';
};

export default StudentDashboard;
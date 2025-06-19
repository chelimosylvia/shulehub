import React, { useState, useEffect } from 'react';
import { 
  Layout, BookOpen, Users, Clipboard, Award, UserCheck, Calendar, Plus 
} from 'react-feather';

const TeacherDashboard = ({ user, school, schoolData }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedClass, setSelectedClass] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const token = localStorage.getItem('access_token');
        
        // Fetch classes
        const classesRes = await fetch(`/api/teachers/${user.id}/classes`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const classesData = await classesRes.json();
        setClasses(classesData);
        
        if (classesData.length > 0) {
          setSelectedClass(classesData[0].id);
        }
        
        // Fetch students
        const studentsRes = await fetch(`/api/teachers/${user.id}/students`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
        
        // Fetch assignments
        const assignmentsRes = await fetch(`/api/teachers/${user.id}/assignments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData);
      } catch (error) {
        console.error('Error fetching teacher data:', error);
      }
      
    };
    
    fetchTeacherData();
  }, [user.id]);

  return (
    <div className="teacher-dashboard">
      <div className="dashboard-sidebar">
        <div className="sidebar-header">
          <div className="teacher-avatar">
            <UserCheck size={32} />
          </div>
          <div className="teacher-info">
            <h3>{user.name}</h3>
            <p>{user.subject || 'Teacher'}</p>
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
            <li className={activeTab === 'students' ? 'active' : ''}>
              <button onClick={() => setActiveTab('students')}>
                <Users size={18} />
                <span>Students</span>
              </button>
            </li>
            <li className={activeTab === 'assignments' ? 'active' : ''}>
              <button onClick={() => setActiveTab('assignments')}>
                <ClipboardList size={18} />
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
          <TeacherOverview 
            user={user} 
            school={school} 
            classes={classes} 
            students={students}
            assignments={assignments}
          />
        )}
        
        {activeTab === 'classes' && (
          <TeacherClasses 
            classes={classes} 
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
          />
        )}
        
        {activeTab === 'students' && (
          <TeacherStudents 
            students={students} 
            classes={classes}
            selectedClass={selectedClass}
          />
        )}
        
        {activeTab === 'assignments' && (
          <TeacherAssignments 
            assignments={assignments} 
            classes={classes}
            selectedClass={selectedClass}
            setAssignments={setAssignments}
          />
        )}
        
        {activeTab === 'grades' && (
          <TeacherGrades 
            students={students} 
            assignments={assignments}
            selectedClass={selectedClass}
          />
        )}
      </div>
    </div>
  );
};

// Teacher Sub-Components
const TeacherOverview = ({ user, school, classes, students, assignments }) => {
  const pendingGrading = assignments.filter(a => 
    new Date(a.due_date) <= new Date() && !a.grades_everyone
  ).length;

  return (
    <div className="teacher-overview">
      <div className="welcome-banner">
        <h2>Welcome, {user.name.split(' ')[0]}!</h2>
        <p>{school.name} • {user.subject} Department</p>
      </div>
      
      <div className="stats-grid">
        <StatCard 
          icon={<BookOpen size={24} />} 
          title="Classes" 
          value={classes.length} 
        />
        <StatCard 
          icon={<Users size={24} />} 
          title="Students" 
          value={students.length} 
        />
        <StatCard 
          icon={<ClipboardList size={24} />} 
          title="Pending Grading" 
          value={pendingGrading} 
        />
      </div>
      
      <div className="overview-sections">
        <ClassHighlights classes={classes} />
        <AssignmentDeadlines assignments={assignments} classes={classes} />
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

const ClassHighlights = ({ classes }) => (
  <div className="classes-summary">
    <h3>Your Classes</h3>
    {classes.length > 0 ? (
      <div className="classes-list">
        {classes.slice(0, 3).map(classItem => (
          <div key={classItem.id} className="class-item">
            <div className="class-info">
              <h4>{classItem.name}</h4>
              <p>{classItem.student_count} students</p>
              <p>Period {classItem.period}</p>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="no-classes">No classes assigned</p>
    )}
  </div>
);

const AssignmentDeadlines = ({ assignments, classes }) => (
  <div className="upcoming-deadlines">
    <h3>Upcoming Deadlines</h3>
    {assignments.length > 0 ? (
      <div className="deadlines-list">
        {assignments
          .filter(a => new Date(a.due_date) > new Date())
          .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
          .slice(0, 3)
          .map(assignment => (
            <div key={assignment.id} className="deadline-item">
              <div className="deadline-info">
                <h4>{assignment.title}</h4>
                <p className="deadline-class">
                  {classes.find(c => c.id === assignment.class_id)?.name || 'Unassigned'}
                </p>
                <p className="deadline-date">
                  Due: {new Date(assignment.due_date).toLocaleDateString()}
                </p>
              </div>
              <div className="deadline-status">
                {assignment.grades_everyone ? (
                  <span className="status-graded">Graded</span>
                ) : (
                  <span className="status-pending">Pending</span>
                )}
              </div>
            </div>
          ))}
      </div>
    ) : (
      <p className="no-deadlines">No upcoming deadlines</p>
    )}
  </div>
);

const TeacherClasses = ({ classes, selectedClass, onSelectClass }) => {
  return (
    <div className="teacher-classes">
      <h2>My Classes</h2>
      
      <div className="classes-tabs">
        {classes.map(classItem => (
          <button
            key={classItem.id}
            className={`class-tab ${selectedClass === classItem.id ? 'active' : ''}`}
            onClick={() => onSelectClass(classItem.id)}
          >
            {classItem.name}
          </button>
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

const TeacherStudents = ({ students, classes, selectedClass,onSelectClass }) => {
  const filteredStudents = selectedClass
    ? students.filter(s => s.classes.includes(selectedClass))
    : students;

  return (
    <div className="teacher-students">
      <div className="students-header">
        <h2>Students</h2>
        <div className="students-filters">
          <select 
            value={selectedClass || ''}
            onChange={(e) => onSelectClass(e.target.value || null)}
          >
            <option value="">All Classes</option>
            {classes.map(classItem => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="students-list">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Grade</th>
              <th>Average</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.map(student => (
              <tr key={student.id}>
                <td>{student.name}</td>
                <td>Grade {student.grade_level}</td>
                <td>
                  <span className={`grade-badge ${getGradeClass(student.average_grade)}`}>
                    {student.average_grade || 'N/A'}%
                  </span>
                </td>
                <td>
                  <button className="view-btn">View Profile</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const TeacherAssignments = ({ assignments, classes, selectedClass, setAssignments }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  const filteredAssignments = selectedClass
    ? assignments.filter(a => a.class_id === selectedClass)
    : assignments;

  const upcomingAssignments = filteredAssignments
    .filter(a => new Date(a.due_date) > new Date());
  
  const pastAssignments = filteredAssignments
    .filter(a => new Date(a.due_date) <= new Date());

  return (
    <div className="teacher-assignments">
      <div className="assignments-header">
        <h2>Assignments</h2>
        <div className="assignments-actions">
          <select 
            value={selectedClass || ''}
            onChange={(e) => onSelectClass(e.target.value || null)}
          >
            <option value="">All Classes</option>
            {classes.map(classItem => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.name}
              </option>
            ))}
          </select>
          <button onClick={() => setShowCreateModal(true)}>
            <Plus size={18} /> Create Assignment
          </button>
        </div>
      </div>

      <div className="assignments-tabs">
        <button 
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming ({upcomingAssignments.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past ({pastAssignments.length})
        </button>
      </div>

      <div className="assignments-container">
        {activeTab === 'upcoming' ? (
          upcomingAssignments.length > 0 ? (
            upcomingAssignments.map(assignment => (
              <TeacherAssignmentCard 
                key={assignment.id}
                assignment={assignment}
                type="upcoming"
              />
            ))
          ) : (
            <p className="no-assignments">No upcoming assignments</p>
          )
        ) : (
          pastAssignments.length > 0 ? (
            pastAssignments.map(assignment => (
              <TeacherAssignmentCard 
                key={assignment.id}
                assignment={assignment}
                type="past"
              />
            ))
          ) : (
            <p className="no-assignments">No past assignments</p>
          )
        )}
      </div>

      {showCreateModal && (
        <CreateAssignmentModal 
          classes={classes}
          onClose={() => setShowCreateModal(false)}
          onCreate={(newAssignment) => {
            setAssignments([...assignments, newAssignment]);
            setShowCreateModal(false);
          }}
        />
      )}
    </div>
  );
};

const TeacherGrades = ({ students, assignments, selectedClass }) => {
  // Implement gradebook view
  return (
    <div className="teacher-grades">
      <h2>Gradebook</h2>
      {/* Gradebook implementation */}
    </div>
  );
};

export default TeacherDashboard;
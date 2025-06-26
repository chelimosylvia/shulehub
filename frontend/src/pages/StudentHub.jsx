import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, MessageCircle, Users, Trophy, Video, Download } from 'lucide-react';
import EnhancedCompetitionCard from './EnhancedCompetitionCard';
import './Hub.css';

const API_ROOT = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const HUB_API = `${API_ROOT}/hub`;

export default function StudentHub({ user, token, logout }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  /* UI state */
  const [activeTab, setTab] = useState('home');
  const [loading, setLoading] = useState(false);
  
  /* Content state */
  const [banners, setBanners] = useState([]);
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  const [forums, setForums] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [tutoringSessions, setTutoringSessions] = useState([]);
  
  /* Interaction forms */
  const [forumReply, setForumReply] = useState({
    content: '',
    thread_id: null
  });
  
const [competitionEntry, setCompetitionEntry] = useState({});

  /* Fetch all student-accessible content */
  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [b, r, c, f, comp, tut] = await Promise.all([
        axios.get(`${HUB_API}/banners`, auth),
        axios.get(`${HUB_API}/resources`, auth),
        axios.get(`${HUB_API}/live-classes`, auth),
        axios.get(`${HUB_API}/forums`, auth),
        axios.get(`${HUB_API}/competitions`, auth),
        axios.get(`${HUB_API}/tutoring-sessions`, auth)
      ]);
      
      setBanners(b.data);
      setResources(r.data);
      setClasses(c.data);
      setForums(f.data);
      setCompetitions(comp.data);
      setTutoringSessions(tut.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAllData(); }, []);

  /* Interaction handlers */
  const joinLiveClass = async (classId) => {
    try {
      await axios.post(`${HUB_API}/live-classes/${classId}/join`, {}, auth);
      alert('Successfully joined the class!');
    } catch (err) {
      console.error('Error joining class:', err);
      alert(err.response?.data?.error || 'Failed to join class');
    }
  };

  const submitForumReply = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `${HUB_API}/forums/${forumReply.thread_id}/replies`,
        { content: forumReply.content },
        auth
      );
      const { data } = await axios.get(`${HUB_API}/forums`, auth);
      setForums(data);
      setForumReply({ content: '', thread_id: null });
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  const enrollInTutoring = async (sessionId) => {
    try {
      await axios.post(`${HUB_API}/tutoring-sessions/${sessionId}/join`, {}, auth);
      const { data } = await axios.get(`${HUB_API}/tutoring-sessions`, auth);
      setTutoringSessions(data);
      alert('Successfully enrolled in tutoring session!');
    } catch (err) {
      console.error('Error enrolling:', err);
      alert(err.response?.data?.error || 'Failed to enroll');
    }
  };

  return (
    <div className="student-hub">
      {/* Header */}
      <header className="hub-header">
        <h1>📚 ShuleHub – Student Portal</h1>
        <div className="user-controls">
          <div className="user-info">
            {user.first_name} {user.last_name} | {user.school?.name}
          </div>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {/* Navigation */}
      <nav className="tab-bar">
        <button 
          onClick={() => setTab('home')} 
          className={activeTab === 'home' ? 'active' : ''}
        >
          <BookOpen size={16} /> Home
        </button>
        <button 
          onClick={() => setTab('resources')} 
          className={activeTab === 'resources' ? 'active' : ''}
        >
          <Download size={16} /> Resources
        </button>
        <button 
          onClick={() => setTab('classes')} 
          className={activeTab === 'classes' ? 'active' : ''}
        >
          <Video size={16} /> Classes
        </button>
        <button 
          onClick={() => setTab('forums')} 
          className={activeTab === 'forums' ? 'active' : ''}
        >
          <MessageCircle size={16} /> Forums
        </button>
        <button 
          onClick={() => setTab('competitions')} 
          className={activeTab === 'competitions' ? 'active' : ''}
        >
          <Trophy size={16} /> Competitions
        </button>
        <button 
          onClick={() => setTab('tutoring')} 
          className={activeTab === 'tutoring' ? 'active' : ''}
        >
          <Users size={16} /> Tutoring
        </button>
      </nav>

      {/* Home Tab */}
      {activeTab === 'home' && (
        <div className="tab-content">
          <section className="announcements">
            <h2><BookOpen /> Announcements</h2>
            {banners.map(banner => (
              <div key={banner.id} className="announcement-card">
                <h3>{banner.title}</h3>
                <p>{banner.description}</p>
              </div>
            ))}
          </section>

          <section className="quick-links">
            <h2>Quick Access</h2>
            <div className="link-grid">
              <div className="link-card" onClick={() => setTab('resources')}>
                <Download size={24} />
                <span>Resources ({resources.length})</span>
              </div>
              <div className="link-card" onClick={() => setTab('classes')}>
                <Video size={24} />
                <span>Classes ({classes.length})</span>
              </div>
              <div className="link-card" onClick={() => setTab('forums')}>
                <MessageCircle size={24} />
                <span>Forums ({forums.length})</span>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Resources Tab */}
      {activeTab === 'resources' && (
        <div className="tab-content">
          <h2><Download /> Shared Resources</h2>
          <div className="resource-grid">
            {resources.map(resource => (
              <div key={resource.id} className="resource-card">
                <div className="resource-header">
                  <h3>{resource.title}</h3>
                  <span className="resource-type">{resource.resource_type}</span>
                </div>
                <div className="resource-meta">
                  <span>{resource.subject}</span>
                  <span>From {resource.school}</span>
                </div>
                <a 
                  href={resource.file_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-btn"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classes Tab */}
      {activeTab === 'classes' && (
        <div className="tab-content">
          <h2><Video /> Live Classes</h2>
          <div className="class-grid">
            {classes.map(classItem => (
              <div key={classItem.id} className="class-card">
                <div className="class-header">
                  <h3>{classItem.title}</h3>
                  <span className="class-subject">{classItem.subject}</span>
                </div>
                <div className="class-details">
                  <p>
                    <strong>When:</strong> {new Date(classItem.start_time).toLocaleString()}
                  </p>
                  <p>
                    <strong>Teacher:</strong> {classItem.teacher} ({classItem.school})
                  </p>
                </div>
                <div className="class-actions">
                  <a 
                    href={classItem.meeting_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="join-btn"
                  >
                    Join Class
                  </a>
                  <button 
                    onClick={() => joinLiveClass(classItem.id)}
                    className="register-btn"
                  >
                    Register
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Forums Tab */}
      {activeTab === 'forums' && (
        <div className="tab-content">
          <h2><MessageCircle /> Discussion Forums</h2>
          
          {/* Forum Threads */}
          <div className="forum-threads">
            {forums.map(thread => (
              <div key={thread.id} className="thread-card">
                <div className="thread-header">
                  <h3>{thread.title}</h3>
                  <span className="thread-subject">{thread.subject}</span>
                </div>
                <div className="thread-meta">
                  <span>Posted by {thread.author} from {thread.school}</span>
                  <span>{thread.replies_count} replies</span>
                </div>
                <p className="thread-content">{thread.content}</p>
                
                {/* Replies */}
                {thread.replies?.map(reply => (
                  <div key={reply.id} className="reply-card">
                    <div className="reply-meta">
                      <strong>{reply.author}</strong> from {reply.school}
                    </div>
                    <p>{reply.content}</p>
                  </div>
                ))}
                
                {/* Reply Form */}
                <form 
                  onSubmit={submitForumReply}
                  className="reply-form"
                >
                  <textarea
                    placeholder="Write your reply..."
                    value={forumReply.thread_id === thread.id ? forumReply.content : ''}
                    onChange={(e) => setForumReply({
                      content: e.target.value,
                      thread_id: thread.id
                    })}
                    required
                  />
                  <button className='enroll-btn' type="submit">Post Reply</button>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitions Tab */}
      {activeTab === 'competitions' && (
        <div className="tab-content">
          <h2><Trophy /> Academic Competitions</h2>
          
          <div className="competition-grid">
            {competitions.map(comp => (
<EnhancedCompetitionCard
  key={comp.id}
  comp={comp}
  user={user}
  auth={auth}
  onUpdate={fetchAllData}
  competitionEntry={competitionEntry[comp.id] || { competition_id: comp.id, submission: '' }}
  setCompetitionEntry={(entry) =>
    setCompetitionEntry((prev) => ({
      ...prev,
      [entry.competition_id]: entry
    }))
  }
/>

            ))}
          </div>
        </div>
      )}

      {/* Tutoring Tab */}
      {activeTab === 'tutoring' && (
        <div className="tab-content">
          <h2><Users /> Tutoring Sessions</h2>
          
          <div className="tutoring-grid">
            {tutoringSessions.map(session => (
              <div key={session.id} className="tutoring-card">
                <div className="session-header">
                  <h3>{session.subject} Tutoring</h3>
                  <span className="session-time">
                    {new Date(session.time_slot).toLocaleString()}
                  </span>
                </div>
                <div className="session-details">
                  <p><strong>Tutor:</strong> {session.tutor_name} ({session.school})</p>
                  <p><strong>Available slots:</strong> {session.available_slots}</p>
                </div>
                <p className="session-description">{session.description}</p>
                
                <div className="session-actions">
                  {session.is_enrolled ? (
                    <a 
                      href={session.meeting_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="join-btn"
                    >
                      Join Session
                    </a>
                  ) : (
                    <button 
                      onClick={() => enrollInTutoring(session.id)}
                      disabled={session.available_slots <= 0}
                      className="enroll-btn"
                    >
                      {session.available_slots <= 0 ? 'Full' : 'Enroll'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
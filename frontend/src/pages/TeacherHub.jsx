import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Upload, Video, MessageSquare, Trophy, Users } from 'lucide-react';
import './Hub.css';

/* -------------------------------------------------------
   1️⃣  Robust base URLs
------------------------------------------------------- */
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');                   // strip trailing slashes

const HUB_API = `${API_ROOT}/hub`;       // ← NO trailing slash here

/* -------------------------------------------------------
   2️⃣  Teacher hub component
------------------------------------------------------- */
export default function TeacherHub({ user, token, logout }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  /* UI state */
  const [tab, setTab] = useState('home');
  const [banners, setBanners] = useState([]);
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // New state for additional modules
  const [forums, setForums] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [tutoringSessions, setTutoringSessions] = useState([]);

  /* Forms */
  const [uploadForm, setForm] = useState({
    title: '',
    subject: '',
    file_url: '',
    resource_type: 'notes',      // default
  });

  const [classForm, setClass] = useState({
    title: '',
    subject: '',
    start_time: '',
    meeting_link: '',
  });

  // New forms for additional modules
  const [forumForm, setForumForm] = useState({
    title: '',
    subject: '',
    content: '',
  });

  const [competitionForm, setCompetitionForm] = useState({
    title: '',
    description: '',
    deadline: '',
  });

  const [tutoringForm, setTutoringForm] = useState({
    subject: '',
    time_slot: '',
    description: '',
  });

  const [replyForm, setReplyForm] = useState({
    content: '',
    thread_id: null,
  });

  /* ---------------------------------------------------
     Fetch hub data once on mount
  --------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const [b, r, c, f, comp, t] = await Promise.all([
          axios.get(`${HUB_API}/banners`, auth),
          axios.get(`${HUB_API}/resources`, auth),
          axios.get(`${HUB_API}/live-classes`, auth),
          axios.get(`${HUB_API}/forums`, auth),
          axios.get(`${HUB_API}/competitions`, auth),
          axios.get(`${HUB_API}/tutoring-sessions`, auth),
        ]);
        setBanners(b.data);
        setResources(r.data);
        setClasses(c.data);
        setForums(f.data);
        setCompetitions(comp.data);
        setTutoringSessions(t.data);
      } catch (err) {
        console.error('Failed to fetch hub data:', err);
      }
    })();
  }, []);

  /* ---------------------------------------------------
     Upload resource
  --------------------------------------------------- */
  const submitResource = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${HUB_API}/resources`, uploadForm, auth);
      const { data } = await axios.get(`${HUB_API}/resources`, auth);
      setResources(data);
      setForm({ title: '', subject: '', file_url: '', resource_type: 'notes' });
      setTab('home');
    } catch (err) {
      console.error('Error uploading resource:', err);
    }
  };

  /* ---------------------------------------------------
     Schedule live class
  --------------------------------------------------- */
  const submitClass = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${HUB_API}/live-classes`, classForm, auth);
      const { data } = await axios.get(`${HUB_API}/live-classes`, auth);
      setClasses(data);
      setClass({ title: '', subject: '', start_time: '', meeting_link: '' });
      setTab('home');
    } catch (err) {
      console.error('Error scheduling class:', err);
    }
  };

  /* ---------------------------------------------------
     Create forum thread
  --------------------------------------------------- */
  const submitForumThread = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${HUB_API}/forums`, forumForm, auth);
      const { data } = await axios.get(`${HUB_API}/forums`, auth);
      setForums(data);
      setForumForm({ title: '', subject: '', content: '' });
    } catch (err) {
      console.error('Error creating forum thread:', err);
    }
  };

  /* ---------------------------------------------------
     Reply to forum thread
  --------------------------------------------------- */
  const submitReply = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${HUB_API}/forums/${replyForm.thread_id}/replies`, 
        { content: replyForm.content }, auth);
      const { data } = await axios.get(`${HUB_API}/forums`, auth);
      setForums(data);
      setReplyForm({ content: '', thread_id: null });
    } catch (err) {
      console.error('Error posting reply:', err);
    }
  };

  /* ---------------------------------------------------
     Create competition
  --------------------------------------------------- */
  const submitCompetition = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${HUB_API}/competitions`, competitionForm, auth);
      const { data } = await axios.get(`${HUB_API}/competitions`, auth);
      setCompetitions(data);
      setCompetitionForm({ title: '', description: '', deadline: '' });
    } catch (err) {
      console.error('Error creating competition:', err);
    }
  };

  /* ---------------------------------------------------
     Join competition
  --------------------------------------------------- */
  const joinCompetition = async (competitionId) => {
    try {
      await axios.post(`${HUB_API}/competitions/${competitionId}/join`, {}, auth);
      const { data } = await axios.get(`${HUB_API}/competitions`, auth);
      setCompetitions(data);
    } catch (err) {
      console.error('Error joining competition:', err);
    }
  };

  /* ---------------------------------------------------
     Create tutoring session
  --------------------------------------------------- */
const submitTutoringSession = async (e) => {
  e.preventDefault();
  try {
    await axios.post(
      `${HUB_API}/tutoring-sessions`,
      {
        subject: tutoringForm.subject.trim(),
        description: tutoringForm.description.trim(),
        time_slot: new Date(tutoringForm.time_slot).toISOString(),   // ← key line
      },
      auth
    );
    const { data } = await axios.get(`${HUB_API}/tutoring-sessions`, auth);
    setTutoringSessions(data);
    setTutoringForm({ subject: "", time_slot: "", description: "" });
  } catch (err) {
    console.error("Error creating tutoring session:", err?.response?.data || err);
    alert(err?.response?.data?.error || "Failed to create session");
  }
};
  /* ---------------------------------------------------
     Render
  --------------------------------------------------- */
  return (
    <div className="hub-wrapper">
      {/* ---------- header ---------- */}
      <header className="hub-header">
        <h1>🧑‍🏫 ShuleHub – Teacher Portal</h1>
        <div className="user-info">
          <span>Welcome, {user.first_name} {user.last_name}</span>
          {user.school && <span> | {user.school.name}</span>}
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {/* ---------- nav ---------- */}
      <nav className="tab-bar">
        <button 
          onClick={() => setTab('home')} 
          className={tab === 'home' ? 'active' : ''}
        >
          <BookOpen size={16} /> Home
        </button>
        <button 
          onClick={() => setTab('upload')} 
          className={tab === 'upload' ? 'active' : ''}
        >
          <Upload size={16} /> Upload Resource
        </button>
        <button 
          onClick={() => setTab('schedule')} 
          className={tab === 'schedule' ? 'active' : ''}
        >
          <Video size={16} /> Schedule Class
        </button>
        <button 
          onClick={() => setTab('forums')} 
          className={tab === 'forums' ? 'active' : ''}
        >
          <MessageSquare size={16} /> Forums
        </button>
        <button 
          onClick={() => setTab('competitions')} 
          className={tab === 'competitions' ? 'active' : ''}
        >
          <Trophy size={16} /> Competitions
        </button>
        <button 
          onClick={() => setTab('tutoring')} 
          className={tab === 'tutoring' ? 'active' : ''}
        >
          <Users size={16} /> Tutoring
        </button>
      </nav>

      {/* ---------- HOME tab ---------- */}
      {tab === 'home' && (
        <div className="tab-content">
          <h2>🔔 Announcements</h2>
          {banners.length > 0 ? (
            banners.map((b) => (
              <div key={b.id} className="announcement-item">
                <h3>{b.title}</h3>
                <p>{b.description}</p>
              </div>
            ))
          ) : (
            <p>No announcements available.</p>
          )}

          <h2>📁 Shared Resources</h2>
          {resources.length > 0 ? (
            resources.map((r) => (
              <div key={r.id} className="resource-item">
                <div className="resource-header">
                  <h3>
                    {r.title} ({r.subject}) - {r.resource_type}
                  </h3>
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                    Download
                  </a>
                </div>
                <div className="resource-meta">
                  Uploaded by {r.uploaded_by} from {r.school} on{' '}
                  {new Date(r.created_at).toLocaleDateString()}
                </div>
              </div>
            ))
          ) : (
            <p>No resources available.</p>
          )}

          <h2>🎓 Live Classes</h2>
          {classes.length > 0 ? (
            classes.map((c) => (
              <div key={c.id} className="class-item">
                <div className="class-header">
                  <h3>
                    {c.title} ({c.subject})
                  </h3>
                  <span className="class-time">
                    {new Date(c.start_time).toLocaleString()} -{' '}
                    {new Date(c.end_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="class-meta">
                  Taught by {c.teacher} from {c.school}
                </div>
                <a href={c.meeting_link} target="_blank" rel="noopener noreferrer">
                  Join Class
                </a>
              </div>
            ))
          ) : (
            <p>No classes scheduled.</p>
          )}
        </div>
      )}

      {/* ---------- UPLOAD tab ---------- */}
      {tab === 'upload' && (
        <div className="tab-content">
          <h2>⬆ Upload New Resource</h2>
          <form onSubmit={submitResource} className="upload-form">
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                placeholder="Resource title"
                value={uploadForm.title}
                onChange={(e) => setForm({ ...uploadForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="subject">Subject</label>
              <input
                id="subject"
                placeholder="Subject"
                value={uploadForm.subject}
                onChange={(e) => setForm({ ...uploadForm, subject: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="file_url">File URL</label>
              <input
                id="file_url"
                placeholder="File URL"
                value={uploadForm.file_url}
                onChange={(e) => setForm({ ...uploadForm, file_url: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="resource_type">Resource Type</label>
              <select
                id="resource_type"
                value={uploadForm.resource_type}
                onChange={(e) =>
                  setForm({ ...uploadForm, resource_type: e.target.value })
                }
                required
              >
                <option value="notes">Notes</option>
                <option value="past_paper">Past Paper</option>
                <option value="video">Video</option>
                <option value="presentation">Presentation</option>
              </select>
            </div>

            <button type="submit" className="submit-button">
              Upload Resource
            </button>
          </form>
        </div>
      )}

      {/* ---------- SCHEDULE tab ---------- */}
      {tab === 'schedule' && (
        <div className="tab-content">
          <h2>📅 Schedule Live Class</h2>
          <form onSubmit={submitClass} className="upload-form">
            <div className="form-group">
              <label htmlFor="class_title">Class Title</label>
              <input
                id="class_title"
                placeholder="Class title"
                value={classForm.title}
                onChange={(e) => setClass({ ...classForm, title: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="class_subject">Subject</label>
              <input
                id="class_subject"
                placeholder="Subject"
                value={classForm.subject}
                onChange={(e) =>
                  setClass({ ...classForm, subject: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="start_time">Start Time</label>
              <input
                id="start_time"
                type="datetime-local"
                value={classForm.start_time}
                onChange={(e) =>
                  setClass({ ...classForm, start_time: e.target.value })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="meeting_link">Meeting Link</label>
              <input
                id="meeting_link"
                placeholder="Meeting link (Zoom, Google Meet, etc.)"
                value={classForm.meeting_link}
                onChange={(e) =>
                  setClass({ ...classForm, meeting_link: e.target.value })
                }
                required
              />
            </div>

            <button type="submit" className="submit-button">
              Schedule Class
            </button>
          </form>
        </div>
      )}

      {/* ---------- FORUMS tab ---------- */}
      {tab === 'forums' && (
        <div className="tab-content">
          <h2>💬 Cross-School Forums</h2>
          
          {/* Create new thread form */}
          <div className="forum-create">
            <h3>Create New Discussion</h3>
            <form onSubmit={submitForumThread} className="upload-form">
              <div className="form-group">
                <label htmlFor="forum_title">Title</label>
                <input
                  id="forum_title"
                  placeholder="Discussion title"
                  value={forumForm.title}
                  onChange={(e) => setForumForm({ ...forumForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="forum_subject">Subject</label>
                <input
                  id="forum_subject"
                  placeholder="Subject category"
                  value={forumForm.subject}
                  onChange={(e) => setForumForm({ ...forumForm, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="forum_content">Content</label>
                <textarea
                  id="forum_content"
                  placeholder="Start the discussion..."
                  value={forumForm.content}
                  onChange={(e) => setForumForm({ ...forumForm, content: e.target.value })}
                  rows="4"
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Create Discussion
              </button>
            </form>
          </div>

          {/* Forum threads */}
          <div className="forum-threads">
            <h3>Discussion Threads</h3>
            {forums.length > 0 ? (
              forums.map((thread) => (
                <div key={thread.id} className="forum-thread">
                  <div className="thread-header">
                    <h4>{thread.title} ({thread.subject})</h4>
                    <span className="thread-meta">
                      by {thread.author} from {thread.school} • {thread.replies_count} replies
                    </span>
                  </div>
                  <p>{thread.content}</p>
                  
                  {/* Replies */}
                  {thread.replies && thread.replies.map((reply) => (
                    <div key={reply.id} className="forum-reply">
                      <div className="reply-meta">
                        <strong>{reply.author}</strong> from {reply.school}
                      </div>
                      <p>{reply.content}</p>
                    </div>
                  ))}

                  {/* Reply form */}
                  <form onSubmit={submitReply} className="reply-form">
                    <textarea
                      placeholder="Add your reply..."
                      value={replyForm.thread_id === thread.id ? replyForm.content : ''}
                      onChange={(e) => setReplyForm({ 
                        content: e.target.value, 
                        thread_id: thread.id 
                      })}
                      rows="2"
                    />
                    <button type="submit" className="reply-button">
                      Reply
                    </button>
                  </form>
                </div>
              ))
            ) : (
              <p>No discussions available. Start the first one!</p>
            )}
          </div>
        </div>
      )}

      {/* ---------- COMPETITIONS tab ---------- */}
      {tab === 'competitions' && (
        <div className="tab-content">
          <h2>🏆 Academic Competitions</h2>
          
          {/* Create competition form */}
          <div className="competition-create">
            <h3>Host New Competition</h3>
            <form onSubmit={submitCompetition} className="upload-form">
              <div className="form-group">
                <label htmlFor="comp_title">Competition Title</label>
                <input
                  id="comp_title"
                  placeholder="Competition name"
                  value={competitionForm.title}
                  onChange={(e) => setCompetitionForm({ ...competitionForm, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="comp_description">Description</label>
                <textarea
                  id="comp_description"
                  placeholder="Competition details and rules..."
                  value={competitionForm.description}
                  onChange={(e) => setCompetitionForm({ ...competitionForm, description: e.target.value })}
                  rows="3"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="comp_deadline">Deadline</label>
                <input
                  id="comp_deadline"
                  type="datetime-local"
                  value={competitionForm.deadline}
                  onChange={(e) => setCompetitionForm({ ...competitionForm, deadline: e.target.value })}
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Create Competition
              </button>
            </form>
          </div>

          {/* Competitions list */}
          <div className="competitions-list">
            <h3>Active Competitions</h3>
            {competitions.length > 0 ? (
              competitions.map((comp) => (
                <div key={comp.id} className="competition-item">
                  <div className="competition-header">
                    <h4>{comp.title}</h4>
                    <span className={`status ${comp.status}`}>
                      {comp.status === 'active' ? '🟢 Active' : '🔴 Completed'}
                    </span>
                  </div>
                  <p>{comp.description}</p>
                  <div className="competition-meta">
                    <span>Host: {comp.host_school}</span>
                    <span>Deadline: {new Date(comp.deadline).toLocaleString()}</span>
                    <span>Participants: {comp.participants_count}</span>
                  </div>
                  {comp.status === 'active' && (
                    <button 
                      onClick={() => joinCompetition(comp.id)}
                      className="participate-button"
                    >
                      Participate
                    </button>
                  )}
                  
                  {/* Leaderboard */}
                  {comp.leaderboard && comp.leaderboard.length > 0 && (
                    <div className="leaderboard">
                      <h5>Leaderboard</h5>
                      {comp.leaderboard.map((entry, index) => (
                        <div key={entry.id} className="leaderboard-entry">
                          <span className="rank">#{index + 1}</span>
                          <span className="participant">{entry.school}</span>
                          <span className="score">{entry.score} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p>No competitions available. Host the first one!</p>
            )}
          </div>
        </div>
      )}

      {/* ---------- TUTORING tab ---------- */}
      {tab === 'tutoring' && (
        <div className="tab-content">
          <h2>👥 Community Tutoring</h2>
          
          {/* Create tutoring session form */}
          <div className="tutoring-create">
            <h3>Offer Tutoring Session</h3>
            <form onSubmit={submitTutoringSession} className="upload-form">
              <div className="form-group">
                <label htmlFor="tutor_subject">Subject</label>
                <input
                  id="tutor_subject"
                  placeholder="Subject you'll teach"
                  value={tutoringForm.subject}
                  onChange={(e) => setTutoringForm({ ...tutoringForm, subject: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tutor_time">Time Slot</label>
                <input
                  id="tutor_time"
                  type="datetime-local"
                  value={tutoringForm.time_slot}
                  onChange={(e) => setTutoringForm({ ...tutoringForm, time_slot: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="tutor_description">Description</label>
                <textarea
                  id="tutor_description"
                  placeholder="What will you cover in this session?"
                  value={tutoringForm.description}
                  onChange={(e) => setTutoringForm({ ...tutoringForm, description: e.target.value })}
                  rows="3"
                  required
                />
              </div>

              <button type="submit" className="submit-button">
                Offer Session
              </button>
            </form>
          </div>

          {/* Tutoring sessions list */}
          <div className="tutoring-sessions">
            <h3>Available Tutoring Sessions</h3>
            {tutoringSessions.length > 0 ? (
              tutoringSessions.map((session) => (
                <div key={session.id} className="tutoring-session">
                  <div className="session-header">
                    <h4>{session.subject}</h4>
                    <span className="session-time">
                      {new Date(session.time_slot).toLocaleString()}
                    </span>
                  </div>
                  <p>{session.description}</p>
                  <div className="session-meta">
                    <span>Tutor: {session.tutor_name} from {session.school}</span>
                    <span>Students enrolled: {session.enrolled_count || 0}</span>
                  </div>
                  <button className="join-session-button">
                    Join Session
                  </button>
                </div>
              ))
            ) : (
              <p>No tutoring sessions available. Offer one to help students!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
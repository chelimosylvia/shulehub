import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Upload, Video } from 'lucide-react';
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
  const [tab, setTab]       = useState('home');
  const [banners, setBanners] = useState([]);
  const [resources, setResources] = useState([]);
  const [classes, setClasses] = useState([]);

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

  /* ---------------------------------------------------
     Fetch hub data once on mount
  --------------------------------------------------- */
  useEffect(() => {
    (async () => {
      try {
        const [b, r, c] = await Promise.all([
          axios.get(`${HUB_API}/banners`,      auth),
          axios.get(`${HUB_API}/resources`,    auth),
          axios.get(`${HUB_API}/live-classes`, auth),
        ]);
        setBanners(b.data);
        setResources(r.data);
        setClasses(c.data);
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
     Render
  --------------------------------------------------- */
  return (
    <div className="hub-wrapper">
      {/* ---------- header ---------- */}
      <header className="hub-header">
        <h1>🧑‍🏫 ShuleHub – Teacher</h1>
        <button onClick={logout}>Logout</button>
      </header>

      {/* ---------- nav ---------- */}
      <nav className="tab-bar">
        <button onClick={() => setTab('home')}     className={tab === 'home'     ? 'active' : ''}><BookOpen size={16}/> Home</button>
        <button onClick={() => setTab('upload')}   className={tab === 'upload'   ? 'active' : ''}><Upload  size={16}/> Upload Resource</button>
        <button onClick={() => setTab('schedule')} className={tab === 'schedule' ? 'active' : ''}><Video   size={16}/> Schedule Class</button>
      </nav>

      {/* ---------- HOME tab ---------- */}
      {tab === 'home' && (
        <div className="tab-content">
          <h2>🔔 Announcements</h2>
          {banners.map((b) => <div key={b.id}>{b.title}</div>)}

          <h2>📁 Shared Resources</h2>
          {resources.map((r) => <div key={r.id}>{r.title}</div>)}

          <h2>🎓 Live Classes</h2>
          {classes.map((c) => (
            <div key={c.id}>
              {c.title} — {new Date(c.start_time).toLocaleString()}
            </div>
          ))}
        </div>
      )}

      {/* ---------- UPLOAD tab ---------- */}
      {tab === 'upload' && (
        <div className="tab-content">
          <h2>⬆ Upload New Resource</h2>
          <form onSubmit={submitResource} className="upload-form">
            <input  placeholder="Title"
                    value={uploadForm.title}
                    onChange={(e) => setForm({ ...uploadForm, title: e.target.value })}
                    required />

            <input  placeholder="Subject"
                    value={uploadForm.subject}
                    onChange={(e) => setForm({ ...uploadForm, subject: e.target.value })}
                    required />

            <input  placeholder="File URL"
                    value={uploadForm.file_url}
                    onChange={(e) => setForm({ ...uploadForm, file_url: e.target.value })}
                    required />

            <select value={uploadForm.resource_type}
                    onChange={(e) => setForm({ ...uploadForm, resource_type: e.target.value })}
                    required>
              <option value="notes">Notes</option>
              <option value="past_paper">Past Paper</option>
              <option value="video">Video</option>
            </select>

            <button type="submit">Upload</button>
          </form>
        </div>
      )}

      {/* ---------- SCHEDULE tab ---------- */}
      {tab === 'schedule' && (
        <div className="tab-content">
          <h2>📅 Schedule Live Class</h2>
          <form onSubmit={submitClass} className="upload-form">
            <input  placeholder="Title"
                    value={classForm.title}
                    onChange={(e) => setClass({ ...classForm, title: e.target.value })}
                    required />

            <input  placeholder="Subject"
                    value={classForm.subject}
                    onChange={(e) => setClass({ ...classForm, subject: e.target.value })}
                    required />

            <input  type="datetime-local"
                    value={classForm.start_time}
                    onChange={(e) => setClass({ ...classForm, start_time: e.target.value })}
                    required />

            <input  placeholder="Meeting Link"
                    value={classForm.meeting_link}
                    onChange={(e) => setClass({ ...classForm, meeting_link: e.target.value })}
                    required />

            <button type="submit">Create Class</button>
          </form>
        </div>
      )}
    </div>
  );
}

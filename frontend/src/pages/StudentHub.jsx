import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, MessageCircle, Users, Trophy, RotateCw } from 'lucide-react';
import './Hub.css';

/* 1️⃣  Robust base URLs ------------------------------------------------ */
const API_ROOT = (
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'
).replace(/\/+$/, '');

const HUB_API = `${API_ROOT}/hub`;          // ← no trailing slash

export default function StudentHub({ user, token, logout }) {
  const auth = { headers: { Authorization: `Bearer ${token}` } };

  /* UI state */
  const [banners,   setBanners]   = useState([]);
  const [resources, setResources] = useState([]);
  const [classes,   setClasses]   = useState([]);
  const [forums,    setForums]    = useState([]);
  const [activeTab, setTab]       = useState('home');
  const [loading,   setLoading]   = useState(false);

  /* ---------------------------------------------------
     Shared fetch routine (can be reused)
  --------------------------------------------------- */
  const fetchAll = async () => {
    setLoading(true);
    try {
      const [b, r, c, f] = await Promise.all([
        axios.get(`${HUB_API}/banners`,      auth),
        axios.get(`${HUB_API}/resources`,    auth),
        axios.get(`${HUB_API}/live-classes`, auth),
        axios.get(`${HUB_API}/forums`,       auth),
      ]);
      setBanners(b.data);
      setResources(r.data);
      setClasses(c.data);
      setForums(f.data);
    } catch (e) {
      console.error('Student fetch error:', e);
    } finally {
      setLoading(false);
    }
  };

  /* initial load */
  useEffect(() => { fetchAll(); }, []);   // mount only

  /* ---------------------------------------------------
     UI
  --------------------------------------------------- */
  return (
    <div className="hub-wrapper">
      {/* ---------- header ---------- */}
      <header className="hub-header">
        <h1>📚 ShuleHub – Student</h1>
        <div style={{ display:'flex', gap:'.75rem' }}>
          <button title="Refresh" onClick={fetchAll} disabled={loading}>
            <RotateCw size={18} className={loading ? 'spin' : ''}/>
          </button>
          <button onClick={logout}>Logout</button>
        </div>
      </header>

      {/* ---------- nav ---------- */}
      <nav className="tab-bar">
        <button onClick={()=>setTab('home')}   className={activeTab==='home'   ?'active':''}><BookOpen      size={16}/> Home</button>
        <button onClick={()=>setTab('forums')} className={activeTab==='forums'?'active':''}><MessageCircle size={16}/> Forums</button>
      </nav>

      {/* ---------- HOME ---------- */}
      {activeTab==='home' && (
        <div className="tab-content">
          <h2>🔔 Announcements</h2>
          {banners.length
            ? banners.map(b=>(
                <div key={b.id}><strong>{b.title}</strong> — {b.description}</div>
              ))
            : <p>No announcements yet.</p>}

          <h2>📁 Shared Resources</h2>
          {resources.length
            ? resources.map(r=>(
                <div key={r.id}>
                  <a href={r.file_url} target="_blank" rel="noreferrer">
                    {r.title}
                  </a> ({r.subject})
                </div>
              ))
            : <p>No resources available.</p>}

          <h2>🎓 Live Classes</h2>
          {classes.length
            ? classes.map(c=>(
                <div key={c.id}>
                  {c.title} — {new Date(c.start_time).toLocaleString()} —{' '}
                  <a href={c.meeting_link} target="_blank" rel="noreferrer">Join</a>
                </div>
              ))
            : <p>No live classes scheduled.</p>}
        </div>
      )}

      {/* ---------- FORUMS ---------- */}
      {activeTab==='forums' && (
        <div className="tab-content">
          <h2>💬 Discussion Forums</h2>
          {forums.length
            ? forums.map(f=>(
                <div key={f.id}><strong>{f.title}</strong> — {f.subject}</div>
              ))
            : <p>No forum posts yet.</p>}
        </div>
      )}
    </div>
  );
}

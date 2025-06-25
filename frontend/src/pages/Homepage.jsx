import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';

const HUB_API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/hub';

const HomePage = () => {
  const navigate = useNavigate();

  const [banners,setBanners]=useState([]);
  const [resources,setResources]=useState([]);
  const [classes,setClasses]=useState([]);
  const [loading,setLoading]=useState(true);
  const [err,setErr]=useState('');

  // notice → hub token is separate from dashboard token
  const hubToken = localStorage.getItem('hub_access_token');

  useEffect(()=>{
    if(!hubToken){setLoading(false);return;}
    const auth={headers:{Authorization:`Bearer ${hubToken}`}};
    (async()=>{
      try{
        const [b,r,c]=await Promise.all([
          axios.get(`${HUB_API}/banners`,auth),
          axios.get(`${HUB_API}/resources`,auth),
          axios.get(`${HUB_API}/live-classes`,auth)
        ]);
        setBanners(b.data);setResources(r.data.slice(0,4));setClasses(c.data.slice(0,3));
      }catch(e){console.error(e);setErr('Login to the Shared Hub to see previews.');}
      finally{setLoading(false);} 
    })();
  },[hubToken]);

  const [idx,setIdx]=useState(0);
  useEffect(()=>{if(!banners.length)return;const id=setInterval(()=>setIdx(i=>(i+1)%banners.length),5000);return()=>clearInterval(id);},[banners]);

  return(
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Shulehub</h1>
        <nav style={styles.nav}>
          <button style={styles.btn} onClick={()=>navigate('/login')}>Login</button>
          <button style={styles.btn} onClick={()=>navigate('/register')}>Register School</button>
          <Link to="/hub" style={{...styles.btn,textDecoration:'none'}}>Shared Hub</Link>
        </nav>
      </header>

      <main style={styles.main}>
        <h2>Welcome to Shulehub</h2>
        <p>The complete online school management platform.</p>

        {hubToken && !loading && banners.length>0 && (
          <div style={styles.banner}><h3>{banners[idx].title}</h3><p>{banners[idx].description}</p></div>
        )}

        {hubToken && !loading && resources.length>0 && (
          <section style={styles.section}>
            <h3>📚 Shared Resources</h3>
            {resources.map(r=>(<div key={r.id}>{r.title} — {r.uploaded_by}</div>))}
            <Link to="/hub">View more →</Link>
          </section>
        )}
        {hubToken && !loading && classes.length>0 && (
          <section style={styles.section}>
            <h3>🎥 Live Classes</h3>
            {classes.map(c=>(<div key={c.id}>{c.title} — {new Date(c.start_time).toLocaleString()}</div>))}
            <Link to="/hub">See schedule →</Link>
          </section>
        )}

        {!hubToken && <p>Click <Link to="/hub">Shared Hub</Link> to log in separately and access cross‑school content.</p>}
        {err && <p style={{color:'red'}}>{err}</p>}
      </main>
    </div>
  );
};

const styles={container:{minHeight:'100vh',padding:'2rem'},header:{display:'flex',justifyContent:'space-between'},logo:{fontSize:'2rem'},nav:{display:'flex',gap:'1rem'},btn:{padding:'0.5rem 1rem'},main:{textAlign:'center'},banner:{border:'1px solid #ccc',padding:'1rem',margin:'1rem auto',maxWidth:'460px'},section:{marginTop:'2rem'}};
export default HomePage;
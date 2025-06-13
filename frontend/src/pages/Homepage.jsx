import React from 'react';
import { useNavigate } from 'react-router-dom';

const HomePage = () => {
  const navigate = useNavigate();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>Shulehub</h1>
        <div style={styles.buttonGroup}>
          <button style={styles.button} onClick={() => navigate('/auth/login')}>
            Login
          </button>
          <button style={styles.button} onClick={() => navigate('/register')}>
            Register School
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <h2>Welcome to Shulehub</h2>
        <p>The complete online school management platform.</p>
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    padding: '2rem',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4rem',
  },
  logo: {
    fontSize: '2rem',
    fontWeight: 'bold',
    color: '#333',
  },
  buttonGroup: {
    display: 'flex',
    gap: '1rem',
  },
  button: {
    padding: '0.5rem 1.2rem',
    fontSize: '1rem',
    cursor: 'pointer',
    border: '1px solid #444',
    backgroundColor: '#fff',
    borderRadius: '4px',
  },
  main: {
    textAlign: 'center',
    marginTop: '3rem',
  },
};

export default HomePage;

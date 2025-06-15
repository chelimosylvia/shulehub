// src/api/auth.js
export const verifyToken = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;

  try {
    const response = await fetch('http://localhost:5000/api/auth/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_data');
      localStorage.removeItem('school_data');
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
};

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user_data');
  localStorage.removeItem('school_data');
  window.location.href = '/login';
};
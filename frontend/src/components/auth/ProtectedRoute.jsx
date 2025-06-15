import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('access_token');
      console.log('Token being sent to /verify:', token); // ✅ Debug log

      if (!token) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, // ✅ Ensure this is here
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Verification success:', data); // Optional debug
          setIsAuthenticated(true);
        } else {
          console.warn('Verification failed:', response.status);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error('Verification error:', err);
        setIsAuthenticated(false);
      }
    };

    verifyToken();
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Or your spinner
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow access
  return children;
};

export default ProtectedRoute;

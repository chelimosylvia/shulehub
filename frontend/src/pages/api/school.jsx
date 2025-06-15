export const fetchSchoolDashboard = async (schoolId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/dashboard`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
  
      if (!response.ok) {
        throw new Error('Failed to fetch school data');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error fetching school dashboard:', error);
      throw error;
    }
  };
  
  export const updateSchoolSettings = async (schoolId, settings) => {
    try {
      const response = await fetch(`http://localhost:5000/api/schools/${schoolId}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(settings)
      });
  
      if (!response.ok) {
        throw new Error('Failed to update school settings');
      }
  
      return await response.json();
    } catch (error) {
      console.error('Error updating school settings:', error);
      throw error;
    }
  };
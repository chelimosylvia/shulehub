// SchoolContext.js
import React, { createContext, useState, useEffect } from 'react';

export const SchoolContext = createContext();

export const SchoolProvider = ({ children }) => {
  const [currentSchoolId, setCurrentSchoolId] = useState(() => {
    // Try to get from localStorage first
    const savedId = localStorage.getItem('currentSchoolId');
    return savedId ? Number(savedId) : null;
  });

  // Add this function to update both state and localStorage
  const updateSchoolId = (newId) => {
    if (newId && !isNaN(newId)) {
      setCurrentSchoolId(Number(newId));
      localStorage.setItem('currentSchoolId', newId.toString());
    }
  };

  return (
    <SchoolContext.Provider value={{ 
      currentSchoolId,
      setCurrentSchoolId: updateSchoolId,
      isValidSchoolId: !!currentSchoolId && currentSchoolId > 0
    }}>
      {children}
    </SchoolContext.Provider>
  );
};
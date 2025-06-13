import React, { createContext, useState, useEffect } from "react";

export const SchoolContext = createContext();

export const SchoolProvider = ({ children }) => {
  const [schools, setSchools] = useState([]);

  const fetchSchools = async () => {
    const token = localStorage.getItem("token"); // make sure your login saves token here

    if (!token) {
      console.warn("No token found, skipping school fetch.");
      return;
    }

    try {
      const response = await fetch("http://localhost:5000/api/schools", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include", // optional, for cookies
      });

      if (response.ok) {
        const data = await response.json();
        setSchools(data.schools);
      } else {
        console.error("Failed to fetch schools:", response.status);
      }
    } catch (error) {
      console.error("Error fetching schools:", error);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  return (
    <SchoolContext.Provider value={{ schools }}>
      {children}
    </SchoolContext.Provider>
  );
};

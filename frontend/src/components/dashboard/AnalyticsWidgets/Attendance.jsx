const Attendance = ({ data }) => {
    return (
      <div className="analytics-widget">
        <h4>Attendance Overview</h4>
        {data ? (
          <div className="chart">
            {/* Chart implementation would go here */}
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        ) : (
          <div className="empty-state">
            <p>No attendance data available</p>
            <button>Configure Attendance</button>
          </div>
        )}
      </div>
    );
  };
  
  export default Attendance;
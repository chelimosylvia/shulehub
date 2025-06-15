const Enrollment = ({ data }) => {
    return (
      <div className="analytics-widget">
        <h4>Enrollment Trends</h4>
        {data ? (
          <div className="chart">
            {/* Chart implementation would go here */}
            <pre>{JSON.stringify(data, null, 2)}</pre>
          </div>
        ) : (
          <div className="empty-state">
            <p>No enrollment data available</p>
          </div>
        )}
      </div>
    );
  };
  
  export default Enrollment;
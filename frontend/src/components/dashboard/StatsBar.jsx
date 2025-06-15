const StatsBar = ({ stats }) => {
    return (
      <div className="stats-bar">
        <div className="stat-item">
          <span>🧑‍🎓</span>
          <span>Students: {stats?.students || 0}</span>
        </div>
        <div className="stat-item">
          <span>👩‍🏫</span>
          <span>Teachers: {stats?.teachers || 0}</span>
        </div>
        <div className="stat-item">
          <span>📚</span>
          <span>Classes: {stats?.classes || 0}</span>
        </div>
      </div>
    );
  };
  
  export default StatsBar;
const ActivityFeed = ({ schoolId }) => {
    return (
      <div className="activity-feed">
        <h3>Recent Activity</h3>
        <div className="empty-state">
          <p>No recent activity</p>
          <button>Create Announcement</button>
        </div>
      </div>
    );
  };
  
  export default ActivityFeed;
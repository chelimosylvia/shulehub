const DashboardTools = ({ widgets, onUpdate, schoolId }) => {
    const [editMode, setEditMode] = useState(false);
    const [currentWidgets, setCurrentWidgets] = useState(widgets);
  
    const handleToggle = (widget) => {
      const updated = { ...currentWidgets, [widget]: !currentWidgets[widget] };
      setCurrentWidgets(updated);
    };
  
    const saveChanges = () => {
      onUpdate(currentWidgets);
      setEditMode(false);
    };
  
    return (
      <div className="dashboard-tools">
        <button onClick={() => setEditMode(!editMode)}>
          {editMode ? 'Exit Edit Mode' : 'Customize Dashboard'}
        </button>
  
        {editMode && (
          <div className="widget-controls">
            <h3>Dashboard Widgets</h3>
            {Object.entries(currentWidgets).map(([key, value]) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => handleToggle(key)}
                />
                {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
              </label>
            ))}
            <button onClick={saveChanges}>Save Changes</button>
          </div>
        )}
      </div>
    );
  };
  
  export default DashboardTools;
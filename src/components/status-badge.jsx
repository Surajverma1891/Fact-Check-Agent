const statusClassNames = {
  Verified: "status-badge--verified",
  Inaccurate: "status-badge--inaccurate",
  False: "status-badge--false",
};

function StatusBadge({ status }) {
  return <span className={`status-badge ${statusClassNames[status] || ""}`}>{status}</span>;
}

export default StatusBadge;

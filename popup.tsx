import React from 'react';

function YourPopupContent() {
  const handleLinkClick = (e) => {
    e.preventDefault(); // Prevent the default link behavior
    // Add any custom logic you want to perform when the link is clicked
    // For example, you can navigate to the Grafana link programmatically.
    // window.location.href = 'your-grafana-link';
  };

  return (
    <div>
      <p>
        This is some content inside the Popup. Click on the link below:
        <br />
        <a href="https://your-grafana-link" onClick={handleLinkClick}>
          Grafana Link
        </a>
      </p>
    </div>
  );
}

export default YourPopupContent;

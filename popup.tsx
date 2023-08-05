import React from 'react';
import { Popup } from 'semantic-ui-react';

function SecondPopupContent() {
  const handleLinkClick = (e) => {
    e.stopPropagation(); // Prevent event propagation to parent elements
    // Add any custom logic you want to perform when the link is clicked
    // For example, you can navigate to the Grafana link programmatically.
    // window.location.href = 'your-grafana-link';
  };

  return (
    <div>
      <p>
        This is some content inside the second Popup. Click on the link below:
        <br />
        {/* Add the target="_blank" attribute to open the link in a new tab */}
        <a href="https://your-grafana-link" onClick={handleLinkClick} target="_blank">
          Grafana Link
        </a>
      </p>
    </div>
  );
}

function FirstPopupContent() {
  return (
    <div>
      <p>
        This is some content inside the first Popup. Hover over the link to open the second Popup:
        <br />
        <Popup
          content={<SecondPopupContent />}
          trigger={<a href="#">Open Second Popup</a>}
          on="click"
        />
      </p>
    </div>
  );
}

function YourComponent() {
  return (
    <Popup
      content={<FirstPopupContent />}
      trigger={<button>Open First Popup</button>}
      on="click"
    />
  );
}

export default YourComponent;

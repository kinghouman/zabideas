import React, { useState } from 'react';
import { Popup } from 'semantic-ui-react';

function SecondPopupContent() {
  const handleLinkClick = () => {
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

function YourComponent() {
  const [secondPopupOpen, setSecondPopupOpen] = useState(false);

  const handleFirstPopupMouseEnter = () => {
    setSecondPopupOpen(true);
  };

  const handleFirstPopupMouseLeave = () => {
    setSecondPopupOpen(false);
  };

  return (
    <Popup
      content="This is some content inside the first Popup. Hover over the link to open the second Popup."
      trigger={
        <a
          href="#"
          onMouseEnter={handleFirstPopupMouseEnter}
          onMouseLeave={handleFirstPopupMouseLeave}
        >
          Open First Popup
        </a>
      }
      on="hover"
      hideOnScroll
      hideOnScrollDelay={500}
    >
      <Popup
        content={<SecondPopupContent />}
        trigger={<div style={{ pointerEvents: 'auto' }} />}
        open={secondPopupOpen}
        onClose={() => setSecondPopupOpen(false)}
        position="right center"
      />
    </Popup>
  );
}

export default YourComponent;

import React, { useState } from 'react';
import { Popup, Button } from 'semantic-ui-react';

function YourComponent() {
  const [isPopupOpen, setPopupOpen] = useState(false);

  const handleOpenPopup = () => {
    setPopupOpen(true);
  };

  const handleClosePopup = () => {
    setPopupOpen(false);
  };

  return (
    <div>
      <Button onClick={handleOpenPopup}>Open Popup</Button>

      <Popup
        open={isPopupOpen}
        onClose={handleClosePopup}
        content={
          <div>
            <p>This is your Popup content.</p>
            <Button onClick={handleClosePopup}>Close</Button>
          </div>
        }
        on="click"
        trigger={<div style={{ display: 'none' }} />} // Use an invisible trigger to prevent unwanted Popup appearance
      />
    </div>
  );
}

export default YourComponent;

import React, { useState } from 'react';
import { Popup, Icon } from 'semantic-ui-react';

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
      <Icon name="info circle" onClick={handleOpenPopup} />

      <Popup
        open={isPopupOpen}
        onClose={handleClosePopup}
        content={
          <div>
            <p>This is your Popup content.</p>
            <Icon name="close" onClick={handleClosePopup} />
          </div>
        }
        on="click"
        trigger={<div style={{ display: 'none' }} />} // Use an invisible trigger to prevent unwanted Popup appearance
      />
    </div>
  );
}

export default YourComponent;

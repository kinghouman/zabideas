import React, { useState } from 'react';
import { Icon, Popup, Modal } from 'semantic-ui-react';

const StatusIndicatorWithGrafana = ({
  // ... your props
}) => {
  // ... your existing logic

  // State to control the visibility of the modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Define the grid content
  const gridContent = (
    // ... your existing grid content
  );

  // Define the trigger for the popup
  const trigger = (
    <Icon
      color='grey'
      name='info circle'
      size='large'
      onClick={() => setIsModalOpen(true)}
    />
  );

  return (
    <>
      <Popup
        content="Click for more details"
        trigger={trigger}
      />

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        closeIcon
      >
        {gridContent}
      </Modal>
    </>
  );
};

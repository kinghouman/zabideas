import { Icon, Popup } from 'semantic-ui-react';

const StatusIndicatorWithGrafana = ({
  // ... your props
}) => {
  // ... your existing logic

  // Define the grid content
  const gridContent = (
    // ... your existing grid content
  );

  // Define the trigger for the popup
  const trigger = (
    <Popup
      content="Click for more details"
      trigger={<Icon color='grey' name='info circle' size='large' />}
    />
  );

  return (
    <Popup
      content={gridContent}
      on='click' // Changed to click to avoid nested hover popups
      position='top center'
      wide
      hoverable
      trigger={trigger}
    />
  );
};

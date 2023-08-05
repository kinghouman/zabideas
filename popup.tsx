<Modal
  open={isModalOpen}
  onClose={() => setIsModalOpen(false)}
  closeIcon
  style={{
    width: '70%', // Set the width to 70% of the parent container
    height: 'auto', // Adjust the height based on content
    top: '10%', // Position it 10% from the top
    left: '15%', // Center the modal by setting left to half of the remaining space (100% - 70% = 30% / 2 = 15%)
    right: '15%', // Same as left to center the modal
    padding: '20px', // Add some padding if needed
  }}
>
  {gridContent}
</Modal>

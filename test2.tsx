// ... (Previous imports and code)

const UKSLOTable: React.FC = () => {
  // ... (Previous state and useEffect)

  // ... (Previous fetchDataAsync function)

  // ... (Previous styles)

  return (
    <>
      {/* Show the Message component above the table */}
      {message && (
        <Message color='black' inverted style={{ position: 'relative', zIndex: 100 }}>
          <span style={{ color: 'lime' }}>{message}</span>
        </Message>
      )}

      <Divider hidden />

      {/* Show the table */}
      <Table celled>
        {/* Table Header */}
        {/* ... */}

        {/* Rows before A1 */}
        {/* ... */}

        {/* Rows starting with A1 */}
        <Table.Row>
          <Table.Cell style={cellStyle}>A1</Table.Cell>
          {/* ... */}
        </Table.Row>

        {/* Rows below A1 */}
        <Table.Row>
          <Table.Cell colSpan={/* Number of columns in your table */}>
            {/* Show Dimmer and Loader when isLoading is true */}
            {isLoading && (
              <Dimmer active inverted>
                <Loader>Please wait while we are running BGP checks...</Loader>
              </Dimmer>
            )}
          </Table.Cell>
        </Table.Row>

        {/* Rows after loading is done */}
        {!isLoading && (
          <>
            <Table.Row>
              {/* ... */}
            </Table.Row>
            <Table.Row>
              {/* ... */}
            </Table.Row>
            {/* Rest of the rows */}
          </>
        )}
      </Table>
    </>
  );
};

export default UKSLOTable;

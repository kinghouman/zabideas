import React, { useEffect, useState } from 'react';
import { Table, Dimmer, Loader } from 'semantic-ui-react';
import RAG_Grafana from './RAG_Grafana';

const TableCellWithRAG_Grafana = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Define your state variables and data here
  const cellStyle = { textAlign: 'center' };
  const A4Status = 'unknown';
  const A4statusInfo = 'Some status info';
  const BwDataRecv = []; // Update with your actual data
  const BwDataSent = []; // Update with your actual data

  useEffect(() => {
    // Add your asynchronous data fetching logic here
    // For demonstration purposes, I'm using a setTimeout to simulate async data fetching
    const fetchData = async () => {
      // Simulate an asynchronous call
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsLoading(false);
    };

    fetchData();
  }, []);

  return (
    <Table.Cell style={cellStyle}>
      {isLoading ? (
        <Dimmer active inverted>
          <Loader content="Loading..." />
        </Dimmer>
      ) : (
        <RAG_Grafana
          status={A4Status}
          statusInfo={A4statusInfo}
          grafanaData={BwDataRecv}
          title="Bits Received - BW 3H checks - Showing 10 highest values"
          optionalGrafanaData={BwDataSent}
          optionalTitle="Bits Sent - Last 3H checks - Showing 10 highest values"
        />
      )}
    </Table.Cell>
  );
};

export default TableCellWithRAG_Grafana;

import React from 'react';
import { Table } from 'semantic-ui-react';
import './styles.css'; // Import custom styles

function MyTable() {
    return (
        <Table celled>
            <Table.Header>
                <Table.Row>
                    <Table.HeaderCell>Header</Table.HeaderCell>
                </Table.Row>
            </Table.Header>

            <Table.Body>
                <Table.Row>
                    <Table.Cell className="custom-cell">
                        <div className="top-section">
                            Top Content
                        </div>
                        <div className="bottom-section">
                            <div className="vertical-split">v1</div>
                            <div className="vertical-split">v2</div>
                        </div>
                    </Table.Cell>
                </Table.Row>
            </Table.Body>
        </Table>
    );
}

export default MyTable;



.custom-cell {
    display: flex;
    flex-direction: column; /* Horizontal split */
}

.top-section, .bottom-section {
    flex: 1; /* This will ensure both sections take up equal height */
    display: flex;
    justify-content: center;
    align-items: center;
}

.bottom-section {
    flex-direction: column; /* Vertical split for bottom section */
}

.vertical-split {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #ddd; /* Optional border for visual clarity */
}

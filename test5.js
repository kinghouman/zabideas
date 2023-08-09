
.custom-cell {
    padding: 0; /* remove default padding to allow child divs to fill the cell */
}

.vertical-split {
    display: flex; /* Horizontal split for the table cell */
    height: 100%;
}

.h1-content {
    flex: 0.3; /* H1 takes up 30% of the width */
    display: flex;
    align-items: center;
    padding-left: 10px; /* Provide some padding to the left for text content */
    border: 1px solid #ddd; /* Optional border for visual clarity */
}

.h2-content {
    flex: 0.7; /* H2 takes up 70% of the width */
    display: flex;
    flex-direction: column; /* Vertical split for H2 into V1 and V2 */
    align-items: center;
    padding-left: 10px; /* Provide some padding to the left for text content */
    border: 1px solid #ddd; /* Optional border for visual clarity */
}

.v1-content, .v2-content {
    flex: 1;
    display: flex;
    align-items: center;
    padding-left: 10px; /* Provide some padding to the left for text content */
    border-top: 1px solid #ddd; /* Optional border for visual clarity */
}

.v1-content {
    border-bottom: 1px solid #ddd; /* Optional border for visual clarity */
}



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
                        <div className="vertical-split">
                            <div className="h1-content">
                                H1
                            </div>
                            <div className="h2-content">
                                <div className="v1-content">V1</div>
                                <div className="v2-content">V2</div>
                            </div>
                        </div>
                    </Table.Cell>
                </Table.Row>
            </Table.Body>
        </Table>
    );
}

export default MyTable;



.custom-cell {
    padding: 0; /* remove default padding to allow child divs to fill the cell */
}

.vertical-split {
    display: flex; /* Horizontal split for the table cell */
    height: 100%;
}

.h1-content, .h2-content {
    flex: 1; /* Both H1 and H2 take up equal width */
    display: flex;
    justify-content: center;
    align-items: center;
    border: 1px solid #ddd; /* Optional border for visual clarity */
}

.h2-content {
    flex-direction: column; /* Vertical split for H2 into V1 and V2 */
}

.v1-content, .v2-content {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px solid #ddd; /* Optional border for visual clarity */
}

.v1-content {
    border-bottom: 1px solid #ddd; /* Optional border for visual clarity */
}

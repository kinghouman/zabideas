async function postData(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Other headers if necessary
            },
            body: JSON.stringify(payload) // Convert payload object to stringified JSON
        });

        // Check if the request was successful
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }

        const data = await response.json();
        console.log(data);

    } catch (error) {
        console.error('Fetch error: ', error);
    }
}

const payload = {
    key1: 'value1',
    key2: 'value2'
    // ... other payload data
};

postData(mybackendURL, payload);

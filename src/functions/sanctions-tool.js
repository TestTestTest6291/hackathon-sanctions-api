const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { app } = require('@azure/functions');
const { CosmosClient } = require('@azure/cosmos');

// Validate environment variables
const cosmosEndpoint = process.env.COSMOS_ENDPOINT;
const cosmosKey = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE;
const containerId = process.env.COSMOS_CONTAINER;

if (!cosmosEndpoint || !cosmosKey) {
    throw new Error('Missing required environment variables COSMOS_ENDPOINT or COSMOS_KEY');
}

if (!cosmosEndpoint || !cosmosKey) {
    throw new Error('Missing required environment variables COSMOS_ENDPOINT or COSMOS_KEY');
}

// Create the CosmosClient
const cosmosClient = new CosmosClient({
    endpoint: cosmosEndpoint,
    key: cosmosKey
});


// // Database and container configuration

app.http('sanctions-tool', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        try {
            const database = cosmosClient.database(databaseId);
            const container = database.container(containerId);

            if (request.method === 'POST') {
                // Handle POST request (create/update company data)
                const companyData = await request.json();
                const { resource: createdItem } = await container.items.create(companyData);
                return { 
                    body: JSON.stringify(createdItem),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                };
            } else {
                // Handle GET request (retrieve company data)
                const companyName = request.query.get('companyName');
                if (companyName) {
                    // Query for specific company
                    const querySpec = {
                        query: "SELECT * FROM c WHERE c.companyName = @companyName",
                        parameters: [
                            {
                                name: "@companyName",
                                value: companyName
                            }
                        ]
                    };

                    const { resources: items } = await container.items
                        .query(querySpec)
                        .fetchAll();

                    return {
                        body: JSON.stringify(items),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                } else {
                    // Get all companies
                    const { resources: items } = await container.items
                        .readAll()
                        .fetchAll();

                    return {
                        body: JSON.stringify(items),
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    };
                }
            }
        } catch (error) {
            context.log(`Error: ${error.message}`);
            return {
                status: 500,
                body: JSON.stringify({ error: "Internal Server Error" }),
                headers: {
                    'Content-Type': 'application/json'
                }
            };
        }
    }
});
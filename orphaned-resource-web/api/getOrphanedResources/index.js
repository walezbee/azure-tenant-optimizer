module.exports = async function (context, req) {
    context.log("HTTP trigger function 'getOrphanedResources' processed a request.");

    // Handle CORS preflight request
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            },
        };
        return;
    }

    // Your actual GET logic
    const data = [
        { id: "1", name: "orphaned-resource-1", type: "Storage Account" },
        { id: "2", name: "orphaned-resource-2", type: "Virtual Machine" }
    ];

    context.res = {
        status: 200,
        body: { data },
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*', // Adjust for production (e.g., specific domain)
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        }
    };
};

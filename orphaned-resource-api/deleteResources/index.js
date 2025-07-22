// DeleteResources/index.js

const axios = require('axios');

module.exports = async function (context, req) {
  context.log('DeleteResources function triggered.');

  try {
    // Validate Authorization header
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ")) {
      context.log.error("Missing or invalid Authorization header");
      context.res = {
        status: 401,
        body: { error: "Missing or invalid Authorization header" },
      };
      return;
    }

    const accessToken = authHeader.split(" ")[1];
    const resourceIds = req.body?.resourceIds;
    
    if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
      context.log.error("Invalid or missing resourceIds in request body");
      context.res = {
        status: 400,
        body: { error: "Invalid or missing resourceIds. Expected array of resource IDs." },
      };
      return;
    }

    context.log(`Processing deletion request for ${resourceIds.length} resources`);

    const deletions = await Promise.all(
      resourceIds.map(async (resourceId) => {
        try {
          const match = resourceId.match(
            /subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)\/providers\/([^\/]+)\/(.+)/
          );

          if (!match) {
            throw new Error(`Invalid resource ID format: ${resourceId}`);
          }

          // Use ARM REST API directly with user's token
          const deleteResponse = await axios.delete(
            `https://management.azure.com${resourceId}?api-version=2021-04-01`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          context.log(`Successfully deleted resource: ${resourceId}`);
          return { resourceId, status: 'Deleted', details: 'Resource deletion initiated' };
        } catch (error) {
          context.log.error(`Failed to delete resource ${resourceId}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
          return { 
            resourceId, 
            status: 'Failed', 
            error: error.response?.data?.error?.message || error.message 
          };
        }
      })
    );

    const successCount = deletions.filter(d => d.status === 'Deleted').length;
    const failureCount = deletions.filter(d => d.status === 'Failed').length;

    context.log(`Deletion completed: ${successCount} succeeded, ${failureCount} failed`);

    context.res = {
      status: 200,
      body: { 
        status: 'Completed', 
        summary: { successful: successCount, failed: failureCount },
        results: deletions 
      },
    };
  } catch (err) {
    context.log.error('Unexpected error in deleteResources:', {
      message: err.message,
      stack: err.stack
    });
    context.res = {
      status: 500,
      body: { error: 'Internal server error', details: err.message },
    };
  }
};

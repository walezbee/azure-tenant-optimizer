// deleteResources/index.js
const axios = require("axios");

module.exports = async function (context, req) {
  context.log('deleteResources function triggered.');

  const authHeader = req.headers["authorization"] || "";
  if (!authHeader.startsWith("Bearer ")) {
    context.res = {
      status: 400,
      body: { error: "Missing or invalid Authorization header" },
    };
    return;
  }
  const accessToken = authHeader.split(" ")[1];

  const resourceIds = req.body?.resourceIds;
  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    context.res = {
      status: 400,
      body: { error: "Invalid or missing resourceIds" },
    };
    return;
  }

  try {
    // Delete each resource via Azure REST API
    const deletions = await Promise.all(
      resourceIds.map(async (resourceId) => {
        const response = await axios.delete(
          `https://management.azure.com/${resourceId}?api-version=2021-04-01`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );
        return { resourceId, status: response.status === 202 || response.status === 200 ? 'Deleted' : 'Failed' };
      })
    );

    context.res = {
      status: 200,
      body: { status: 'Success', results: deletions },
    };
  } catch (err) {
    context.res = {
      status: 500,
      body: { error: 'Failed to delete resources', details: err.message },
    };
  }
};
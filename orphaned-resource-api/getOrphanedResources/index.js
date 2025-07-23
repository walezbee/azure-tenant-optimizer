// getOrphanedResources/index.js
const axios = require("axios");

module.exports = async function (context, req) {
  context.log("getOrphanedResources function invoked");

  try {
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ")) {
      context.res = {
        status: 400,
        body: { error: "Missing or invalid Authorization header" },
      };
      return;
    }

    const accessToken = authHeader.split(" ")[1];

    // Example: List subscriptions
    const subsRes = await axios.get(
      "https://management.azure.com/subscriptions?api-version=2020-01-01",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const subscriptions = subsRes.data.value;
    let allResources = [];

    for (const sub of subscriptions) {
      // List resources per subscription
      const resourcesRes = await axios.get(
        `https://management.azure.com/subscriptions/${sub.subscriptionId}/resources?api-version=2021-04-01`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      allResources.push(...resourcesRes.data.value);
    }

    context.res = {
      status: 200,
      body: { data: allResources },
    };
  } catch (error) {
    context.res = {
      status: error.response?.status || 500,
      body: { error: "Internal server error", details: error.response?.data || error.message },
    };
  }
};
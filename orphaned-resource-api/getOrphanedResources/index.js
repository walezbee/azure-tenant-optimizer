const { ResourceManagementClient } = require("@azure/arm-resources");
const { SubscriptionClient } = require("@azure/arm-subscriptions");

// Credential wrapper for user token (compatible with Azure SDK)
class AccessTokenCredential {
  constructor(token) {
    this.token = token;
  }
  getToken() {
    return Promise.resolve({
      token: this.token,
      expiresOnTimestamp: Date.now() + 60 * 60 * 1000,
    });
  }
}

const axios = require("axios");

module.exports = async function (context, req) {
  context.log("getOrphanedResources function invoked");

  try {
    const authHeader = req.headers["authorization"] || "";
    if (!authHeader.startsWith("Bearer ")) {
      context.log.error("Missing or invalid Authorization header.");
      context.res = {
        status: 400,
        body: { error: "Missing or invalid Authorization header" },
      };
      return;
    }

    const accessToken = authHeader.split(" ")[1];
    context.log("Received access token");

    // List subscriptions with user's token
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
    context.log.error("Error processing request:", error && error.response ? error.response.data : error);
    context.res = {
      status: 500,
      body: { error: "Internal server error", details: error && error.response ? error.response.data : error.message },
    };
  }
};
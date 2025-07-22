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

    const credential = new AccessTokenCredential(accessToken);

    // List all subscriptions for the user
    const subscriptionClient = new SubscriptionClient(credential);
    const subscriptions = [];
    for await (const sub of subscriptionClient.subscriptions.list()) {
      subscriptions.push(sub);
    }

    let allResources = [];

    for (const subscription of subscriptions) {
      const subClient = new ResourceManagementClient(credential, subscription.subscriptionId);
      const resources = [];
      for await (const resource of subClient.resources.list()) {
        resources.push(resource);
      }
      allResources.push(...resources);
    }

    // You can filter orphaned/deprecated resources here if needed

    context.res = {
      status: 200,
      body: { data: allResources },
    };
  } catch (error) {
    context.log.error("Error processing request:", error.message);
    context.res = {
      status: 500,
      body: { error: "Internal server error", details: error.message },
    };
  }
};
const { ResourceManagementClient } = require("@azure/arm-resources");
const { ClientSecretCredential, TokenCredential } = require("@azure/identity");
const { DefaultAzureCredential } = require("@azure/identity");
const { TokenCredentialAuthenticationProvider } = require("@azure/ms-rest-js");

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
    const client = new ResourceManagementClient(credential, "<any-subscription-id>");

    // Instead of hardcoding subscription, get all subscriptions the token has access to
    const subscriptions = await client.subscriptions.list();

    let allResources = [];

    for await (const subscription of subscriptions) {
      const subClient = new ResourceManagementClient(credential, subscription.subscriptionId);
      const resources = [];

      for await (const resource of subClient.resources.list()) {
        resources.push(resource);
      }

      allResources.push(...resources);
    }

    // You can filter orphaned/deprecated resources later here

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

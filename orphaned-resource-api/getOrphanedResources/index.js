const { DefaultAzureCredential } = require("@azure/identity");
const { ResourceManagementClient } = require("@azure/arm-resources");

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

    // TEMPORARY: Respond with dummy data (remove this block when real logic is ready)
    context.res = {
      status: 200,
      body: {
        data: [
          {
            id: "dummy-resource-id",
            name: "orphaned-vm",
            type: "Microsoft.Compute/virtualMachines",
            location: "westeurope",
          },
        ],
      },
    };
  } catch (error) {
    context.log.error("Error processing request:", error.message);
    context.res = {
      status: 500,
      body: { error: "Internal server error", details: error.message },
    };
  }
};

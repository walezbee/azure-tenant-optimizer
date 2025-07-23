// unattachedResources/index.js
const axios = require("axios");
const jwt = require("jsonwebtoken");

module.exports = async function (context, req) {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    context.res = {
      status: 401,
      body: { error: "Missing or invalid Authorization header" }
    };
    return;
  }

  const accessToken = authHeader.split(" ")[1];

  try {
    // Optional: decode token and inspect tenant/user info
    const decoded = jwt.decode(accessToken);
    context.log(`Token received for tenant: ${decoded?.tid}, user: ${decoded?.upn || decoded?.preferred_username}`);

    // Call Azure Resource Graph using user's access token
    const response = await axios.post(
      "https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01",
      {
        query: `
          Resources
          | where type =~ 'Microsoft.Compute/disks'
          | where properties.diskState == 'Unattached'
        `
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    context.res = {
      status: 200,
      body: response.data
    };
  } catch (error) {
    context.res = {
      status: 500,
      body: { error: `Error querying Azure: ${error.message}` }
    };
  }
};
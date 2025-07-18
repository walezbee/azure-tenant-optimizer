const { DefaultAzureCredential } = require("@azure/identity");
const { ResourceGraphClient } = require("@azure/arm-resourcegraph");

module.exports = async function (context, req) {
  const credential = new DefaultAzureCredential();
  const client = new ResourceGraphClient(credential);

  const query = `Resources | where type =~ 'Microsoft.Compute/disks' and properties.diskState == 'Unattached'`;

  const result = await client.resources({ query });
  context.res = {
    status: 200,
    body: result.data,
  };
};

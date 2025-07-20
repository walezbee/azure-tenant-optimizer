// DeleteResources/index.js

const { DefaultAzureCredential } = require('@azure/identity');
const { ResourceManagementClient } = require('@azure/arm-resources');

module.exports = async function (context, req) {
  context.log('DeleteResources function triggered.');

  const resourceIds = req.body?.resourceIds;
  if (!Array.isArray(resourceIds) || resourceIds.length === 0) {
    context.res = {
      status: 400,
      body: 'Invalid or missing resourceIds',
    };
    return;
  }

  try {
    const credential = new DefaultAzureCredential();
    const deletions = await Promise.all(
      resourceIds.map(async (resourceId) => {
        const match = resourceId.match(
          /subscriptions\/([^\/]+)\/resourceGroups\/([^\/]+)\/providers\/([^\/]+)\/(.+)/
        );

        if (!match) {
          throw new Error(`Invalid resource ID format: ${resourceId}`);
        }

        const [_, subscriptionId, resourceGroupName, providerNamespace, resourcePath] = match;
        const client = new ResourceManagementClient(credential, subscriptionId);
        const result = await client.resources.beginDeleteByIdAndWait(resourceId, '2021-04-01');
        return { resourceId, status: 'Deleted' };
      })
    );

    context.res = {
      status: 200,
      body: { status: 'Success', results: deletions },
    };
  } catch (err) {
    context.log.error('Error deleting resources:', err);
    context.res = {
      status: 500,
      body: 'Failed to delete resources',
    };
  }
};

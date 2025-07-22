// upgradeResources/index.js

const axios = require('axios');

module.exports = async function (context, req) {
  context.log('upgradeResources function triggered.');

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
    const { resources } = req.body || {};
    
    if (!Array.isArray(resources) || resources.length === 0) {
      context.log.error("Invalid or missing resources in request body");
      context.res = {
        status: 400,
        body: { error: "Invalid or missing resources. Expected array of resource objects with id and type." },
      };
      return;
    }

    context.log(`Processing upgrade request for ${resources.length} resources`);

    const upgrades = await Promise.all(
      resources.map(async (resource) => {
        try {
          const { id, type, targetImage, targetSku } = resource;
          
          if (!id || !type) {
            throw new Error("Resource must have 'id' and 'type' properties");
          }

          // Handle different resource types for upgrades
          let upgradeResult;
          
          switch (type.toLowerCase()) {
            case 'microsoft.compute/virtualmachines':
              upgradeResult = await upgradeVirtualMachine(accessToken, id, targetImage, targetSku, context);
              break;
            case 'microsoft.storage/storageaccounts':
              upgradeResult = await upgradeStorageAccount(accessToken, id, targetSku, context);
              break;
            case 'microsoft.sql/servers/databases':
              upgradeResult = await upgradeSqlDatabase(accessToken, id, targetSku, context);
              break;
            default:
              upgradeResult = await addUpgradeTag(accessToken, id, context);
              break;
          }

          context.log(`Successfully processed upgrade for resource: ${id}`);
          return { resourceId: id, status: 'Upgraded', details: upgradeResult };
        } catch (error) {
          context.log.error(`Failed to upgrade resource ${resource.id}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
          });
          return { 
            resourceId: resource.id, 
            status: 'Failed', 
            error: error.response?.data?.error?.message || error.message 
          };
        }
      })
    );

    const successCount = upgrades.filter(u => u.status === 'Upgraded').length;
    const failureCount = upgrades.filter(u => u.status === 'Failed').length;

    context.log(`Upgrade completed: ${successCount} succeeded, ${failureCount} failed`);

    context.res = {
      status: 200,
      body: { 
        status: 'Completed', 
        summary: { successful: successCount, failed: failureCount },
        results: upgrades 
      },
    };
  } catch (err) {
    context.log.error('Unexpected error in upgradeResources:', {
      message: err.message,
      stack: err.stack
    });
    context.res = {
      status: 500,
      body: { error: 'Internal server error', details: err.message },
    };
  }
};

// Helper function to upgrade Virtual Machine (example: update OS disk image)
async function upgradeVirtualMachine(accessToken, resourceId, targetImage, targetSku, context) {
  context.log(`Upgrading VM: ${resourceId}`);
  
  // First get the current VM configuration
  const vmResponse = await axios.get(
    `https://management.azure.com${resourceId}?api-version=2023-03-01`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const vm = vmResponse.data;
  
  // Example upgrade: Update VM size if targetSku is provided
  if (targetSku) {
    vm.properties.hardwareProfile.vmSize = targetSku;
  }

  // Example upgrade: Update image reference if targetImage is provided
  if (targetImage) {
    if (vm.properties.storageProfile && vm.properties.storageProfile.imageReference) {
      // Update to a newer version (example logic)
      vm.properties.storageProfile.imageReference.version = targetImage;
    }
  }

  // Add upgrade metadata
  if (!vm.tags) vm.tags = {};
  vm.tags['upgraded-on'] = new Date().toISOString();
  vm.tags['upgrade-type'] = 'automated-upgrade';

  // Update the VM
  const updateResponse = await axios.put(
    `https://management.azure.com${resourceId}?api-version=2023-03-01`,
    vm,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { operation: 'VM upgraded', vmSize: targetSku, imageVersion: targetImage };
}

// Helper function to upgrade Storage Account
async function upgradeStorageAccount(accessToken, resourceId, targetSku, context) {
  context.log(`Upgrading Storage Account: ${resourceId}`);
  
  // Get current storage account
  const storageResponse = await axios.get(
    `https://management.azure.com${resourceId}?api-version=2023-01-01`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const storageAccount = storageResponse.data;
  
  // Example upgrade: Change SKU if provided
  if (targetSku) {
    storageAccount.sku = { name: targetSku };
  }

  // Add upgrade metadata
  if (!storageAccount.tags) storageAccount.tags = {};
  storageAccount.tags['upgraded-on'] = new Date().toISOString();
  storageAccount.tags['upgrade-type'] = 'automated-upgrade';

  // Update the storage account
  const updateResponse = await axios.patch(
    `https://management.azure.com${resourceId}?api-version=2023-01-01`,
    storageAccount,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { operation: 'Storage Account upgraded', sku: targetSku };
}

// Helper function to upgrade SQL Database
async function upgradeSqlDatabase(accessToken, resourceId, targetSku, context) {
  context.log(`Upgrading SQL Database: ${resourceId}`);
  
  // Get current database
  const dbResponse = await axios.get(
    `https://management.azure.com${resourceId}?api-version=2021-11-01`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const database = dbResponse.data;
  
  // Example upgrade: Change service tier if provided
  if (targetSku) {
    database.properties.requestedServiceObjectiveName = targetSku;
  }

  // Add upgrade metadata
  if (!database.tags) database.tags = {};
  database.tags['upgraded-on'] = new Date().toISOString();
  database.tags['upgrade-type'] = 'automated-upgrade';

  // Update the database
  const updateResponse = await axios.patch(
    `https://management.azure.com${resourceId}?api-version=2021-11-01`,
    database,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { operation: 'SQL Database upgraded', serviceObjective: targetSku };
}

// Helper function to add upgrade tag (fallback for unknown resource types)
async function addUpgradeTag(accessToken, resourceId, context) {
  context.log(`Adding upgrade tag to resource: ${resourceId}`);
  
  // Get current resource
  const resourceResponse = await axios.get(
    `https://management.azure.com${resourceId}?api-version=2021-04-01`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const resource = resourceResponse.data;
  
  // Add upgrade metadata
  if (!resource.tags) resource.tags = {};
  resource.tags['upgrade-candidate'] = 'true';
  resource.tags['identified-on'] = new Date().toISOString();

  // Update the resource with new tags
  const updateResponse = await axios.patch(
    `https://management.azure.com${resourceId}?api-version=2021-04-01`,
    { tags: resource.tags },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { operation: 'Upgrade tag added', tags: resource.tags };
}
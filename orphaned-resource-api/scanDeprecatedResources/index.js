// scanDeprecatedResources/index.js

const axios = require('axios');
const jwt = require('jsonwebtoken');

module.exports = async function (context, req) {
  context.log('scanDeprecatedResources function triggered.');

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
    
    // Optional: decode token and inspect tenant/user info
    const decoded = jwt.decode(accessToken);
    context.log(`Scanning deprecated resources for tenant: ${decoded.tid}, user: ${decoded.upn || decoded.preferred_username}`);

    // Get optional query parameters for filtering
    const resourceType = req.query.resourceType || '';
    const subscriptionId = req.query.subscriptionId || '';

    // Build Resource Graph query to find deprecated resources
    const query = buildDeprecatedResourcesQuery(resourceType, subscriptionId);
    
    context.log(`Executing Resource Graph query: ${query}`);

    // Call Azure Resource Graph using user's access token
    const response = await axios.post(
      "https://management.azure.com/providers/Microsoft.ResourceGraph/resources?api-version=2021-03-01",
      { query },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        }
      }
    );

    const deprecatedResources = response.data.data || [];
    
    context.log(`Found ${deprecatedResources.length} deprecated resources`);

    // Categorize findings
    const categorized = categorizeDeprecatedResources(deprecatedResources);

    context.res = {
      status: 200,
      body: {
        status: 'Success',
        summary: {
          totalFound: deprecatedResources.length,
          byCategory: Object.keys(categorized).reduce((acc, key) => {
            acc[key] = categorized[key].length;
            return acc;
          }, {}),
          scanDate: new Date().toISOString(),
          tenant: decoded.tid
        },
        resources: categorized,
        rawData: deprecatedResources
      }
    };
  } catch (error) {
    context.log.error("Error scanning for deprecated resources:", {
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });
    context.res = {
      status: error.response?.status || 500,
      body: { 
        error: "Error scanning for deprecated resources", 
        details: error.response?.data || error.message 
      }
    };
  }
};

function buildDeprecatedResourcesQuery(resourceType, subscriptionId) {
  let baseQuery = `
    Resources
    | extend isDeprecated = false
    | extend deprecationReason = ""
    | extend recommendedAction = ""
  `;

  // Add subscription filter if provided
  if (subscriptionId) {
    baseQuery += `
    | where subscriptionId == "${subscriptionId}"
    `;
  }

  // Add resource type filter if provided
  if (resourceType) {
    baseQuery += `
    | where type =~ "${resourceType}"
    `;
  }

  // Define deprecation detection logic
  baseQuery += `
    | extend isDeprecated = case(
        // Virtual Machines with old OS versions
        type =~ 'Microsoft.Compute/virtualMachines' and 
        (properties.storageProfile.imageReference.version contains '2016' or
         properties.storageProfile.imageReference.version contains '2012' or
         properties.storageProfile.imageReference.offer contains 'WindowsServer' and properties.storageProfile.imageReference.sku contains '2016'), true,
        
        // Classic Storage Accounts
        type =~ 'Microsoft.ClassicStorage/storageAccounts', true,
        
        // Classic Virtual Machines
        type =~ 'Microsoft.ClassicCompute/virtualMachines', true,
        
        // Old API Management services (consumption tier legacy)
        type =~ 'Microsoft.ApiManagement/service' and properties.sku.name == 'Consumption' and 
        properties.createdAtUtc < datetime('2022-01-01'), true,
        
        // App Service Plans with deprecated SKUs
        type =~ 'Microsoft.Web/serverfarms' and 
        (properties.sku.name contains 'Basic' or properties.sku.name contains 'Free'), true,
        
        // SQL Databases with old compatibility levels
        type =~ 'Microsoft.Sql/servers/databases' and 
        toint(properties.currentServiceObjectiveName) < 100, true,
        
        // Storage Accounts with legacy redundancy
        type =~ 'Microsoft.Storage/storageAccounts' and 
        properties.sku.name == 'Standard_GRS' and properties.createdTime < datetime('2020-01-01'), true,
        
        // Function Apps on old runtime versions
        type =~ 'Microsoft.Web/sites' and kind contains 'functionapp' and
        (properties.siteConfig.netFrameworkVersion contains '4.6' or
         properties.siteConfig.phpVersion contains '5.6' or
         properties.siteConfig.pythonVersion contains '3.6'), true,
        
        false
    )
    | extend deprecationReason = case(
        type =~ 'Microsoft.Compute/virtualMachines' and isDeprecated, "Old OS version detected",
        type =~ 'Microsoft.ClassicStorage/storageAccounts', "Classic resources are deprecated",
        type =~ 'Microsoft.ClassicCompute/virtualMachines', "Classic resources are deprecated", 
        type =~ 'Microsoft.ApiManagement/service' and isDeprecated, "Legacy consumption tier",
        type =~ 'Microsoft.Web/serverfarms' and isDeprecated, "Deprecated App Service SKU",
        type =~ 'Microsoft.Sql/servers/databases' and isDeprecated, "Old SQL compatibility level",
        type =~ 'Microsoft.Storage/storageAccounts' and isDeprecated, "Legacy storage redundancy",
        type =~ 'Microsoft.Web/sites' and isDeprecated, "Deprecated runtime version",
        ""
    )
    | extend recommendedAction = case(
        type =~ 'Microsoft.Compute/virtualMachines' and isDeprecated, "Upgrade to Windows Server 2019/2022 or latest Linux distribution",
        type =~ 'Microsoft.ClassicStorage/storageAccounts', "Migrate to ARM-based Storage Account",
        type =~ 'Microsoft.ClassicCompute/virtualMachines', "Migrate to ARM-based Virtual Machine",
        type =~ 'Microsoft.ApiManagement/service' and isDeprecated, "Consider upgrading to Developer or Standard tier",
        type =~ 'Microsoft.Web/serverfarms' and isDeprecated, "Upgrade to Standard or Premium tier",
        type =~ 'Microsoft.Sql/servers/databases' and isDeprecated, "Update database compatibility level",
        type =~ 'Microsoft.Storage/storageAccounts' and isDeprecated, "Consider Zone-redundant storage (ZRS) or Geo-zone-redundant (GZRS)",
        type =~ 'Microsoft.Web/sites' and isDeprecated, "Update to latest supported runtime version",
        "Review resource configuration"
    )
    | where isDeprecated == true
    | project id, name, type, resourceGroup, subscriptionId, location, 
              isDeprecated, deprecationReason, recommendedAction, 
              properties, tags, createdTime = properties.createdTime
    | order by type asc, name asc
  `;

  return baseQuery;
}

function categorizeDeprecatedResources(resources) {
  const categories = {
    classic: [],
    outdatedRuntime: [],
    legacySku: [],
    oldVersions: [],
    other: []
  };

  resources.forEach(resource => {
    if (resource.type.includes('Classic')) {
      categories.classic.push(resource);
    } else if (resource.deprecationReason.includes('runtime') || resource.deprecationReason.includes('OS')) {
      categories.outdatedRuntime.push(resource);
    } else if (resource.deprecationReason.includes('SKU') || resource.deprecationReason.includes('tier')) {
      categories.legacySku.push(resource);
    } else if (resource.deprecationReason.includes('version') || resource.deprecationReason.includes('level')) {
      categories.oldVersions.push(resource);
    } else {
      categories.other.push(resource);
    }
  });

  return categories;
}
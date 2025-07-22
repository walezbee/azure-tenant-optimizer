# Azure Tenant Optimizer

An Azure multi-tenant application for optimizing and managing Azure resources across tenants, featuring automated scanning, deletion, and upgrade capabilities with RBAC-enforced security.

## Architecture

This application consists of:
- **Frontend**: React SPA with Azure AD authentication (MSAL)
- **Backend**: Azure Functions API with multi-tenant support
- **Authentication**: Azure AD B2B with delegated permissions

## Features

### 🔍 Resource Scanning
- Scan for orphaned/unattached Azure resources
- Identify deprecated resources and configurations
- Multi-tenant support with user context isolation

### 🗑️ Resource Management
- Delete orphaned resources with user approval
- Bulk operations with individual result tracking
- Comprehensive error handling and logging

### ⬆️ Resource Optimization
- Upgrade deprecated resources to recommended configurations
- Support for VMs, Storage Accounts, SQL Databases, and more
- Automated tagging for audit trails

### 🔐 Security & Compliance
- User-based authentication with Azure AD
- RBAC enforcement - operations run with user's permissions
- Multi-tenant isolation
- No shared credentials or service principals for resource operations

## API Endpoints

### Base URL
```
https://orphaned-backend-func.azurewebsites.net/api/
```

### Authentication
All endpoints require an `Authorization: Bearer <token>` header with a valid Azure AD access token that has the `https://management.azure.com/user_impersonation` scope.

### Endpoints

#### 1. Get Orphaned Resources
```http
GET /getOrphanedResources
```
**Description**: Retrieves all orphaned/unattached resources across user's accessible subscriptions.

**Response**:
```json
{
  "data": [
    {
      "id": "/subscriptions/.../resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/storage1",
      "name": "storage1",
      "type": "Microsoft.Storage/storageAccounts",
      "resourceGroup": "rg1",
      "location": "eastus"
    }
  ]
}
```

#### 2. Scan Unattached Disks
```http
GET /unattachedDisks
```
**Description**: Uses Azure Resource Graph to find unattached managed disks.

**Query Parameters**:
- `subscriptionId` (optional): Filter by specific subscription

**Response**:
```json
{
  "data": [
    {
      "id": "/subscriptions/.../providers/Microsoft.Compute/disks/disk1",
      "name": "disk1",
      "diskState": "Unattached",
      "diskSizeGB": 128
    }
  ]
}
```

#### 3. Delete Resources
```http
POST /deleteResources
```
**Description**: Deletes specified resources using ARM REST API with user's token.

**Request Body**:
```json
{
  "resourceIds": [
    "/subscriptions/.../resourceGroups/rg1/providers/Microsoft.Storage/storageAccounts/storage1",
    "/subscriptions/.../resourceGroups/rg1/providers/Microsoft.Compute/disks/disk1"
  ]
}
```

**Response**:
```json
{
  "status": "Completed",
  "summary": {
    "successful": 1,
    "failed": 1
  },
  "results": [
    {
      "resourceId": "/subscriptions/.../storageAccounts/storage1",
      "status": "Deleted",
      "details": "Resource deletion initiated"
    },
    {
      "resourceId": "/subscriptions/.../disks/disk1", 
      "status": "Failed",
      "error": "Insufficient permissions"
    }
  ]
}
```

#### 4. Upgrade Resources
```http
POST /upgradeResources
```
**Description**: Upgrades resources to recommended configurations or newer versions.

**Request Body**:
```json
{
  "resources": [
    {
      "id": "/subscriptions/.../providers/Microsoft.Compute/virtualMachines/vm1",
      "type": "Microsoft.Compute/virtualMachines",
      "targetSku": "Standard_D2s_v3",
      "targetImage": "latest"
    },
    {
      "id": "/subscriptions/.../providers/Microsoft.Storage/storageAccounts/storage1",
      "type": "Microsoft.Storage/storageAccounts",
      "targetSku": "Standard_ZRS"
    }
  ]
}
```

**Response**:
```json
{
  "status": "Completed",
  "summary": {
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "resourceId": "/subscriptions/.../virtualMachines/vm1",
      "status": "Upgraded",
      "details": {
        "operation": "VM upgraded",
        "vmSize": "Standard_D2s_v3",
        "imageVersion": "latest"
      }
    }
  ]
}
```

#### 5. Scan Deprecated Resources
```http
GET /scanDeprecatedResources
```
**Description**: Identifies resources using deprecated configurations, old versions, or legacy SKUs.

**Query Parameters**:
- `resourceType` (optional): Filter by specific resource type (e.g., `Microsoft.Compute/virtualMachines`)
- `subscriptionId` (optional): Filter by specific subscription

**Response**:
```json
{
  "status": "Success",
  "summary": {
    "totalFound": 5,
    "byCategory": {
      "classic": 2,
      "outdatedRuntime": 1,
      "legacySku": 1,
      "oldVersions": 1
    },
    "scanDate": "2024-01-15T10:30:00.000Z",
    "tenant": "tenant-id"
  },
  "resources": {
    "classic": [
      {
        "id": "/subscriptions/.../Microsoft.ClassicStorage/storageAccounts/classic1",
        "deprecationReason": "Classic resources are deprecated",
        "recommendedAction": "Migrate to ARM-based Storage Account"
      }
    ],
    "outdatedRuntime": [
      {
        "id": "/subscriptions/.../Microsoft.Web/sites/webapp1",
        "deprecationReason": "Deprecated runtime version",
        "recommendedAction": "Update to latest supported runtime version"
      }
    ]
  }
}
```

## Frontend Application

### Authentication Flow

1. **Initial Load**: User is presented with login button
2. **Azure AD Login**: Redirects to Azure AD with `user_impersonation` scope
3. **Token Acquisition**: Acquires access token for ARM API calls
4. **Resource Operations**: All API calls include user's bearer token

### Key Components

- **App.js**: Main application with authentication logic
- **DeleteRequestTable.js**: Resource selection and deletion interface
- **authConfig.js**: MSAL configuration for multi-tenant support

### Configuration

Update `authConfig.js` with your Azure AD app registration:

```javascript
export const msalConfig = {
  auth: {
    clientId: "your-client-id",
    authority: "https://login.microsoftonline.com/common", // Multi-tenant
    redirectUri: "your-app-url"
  }
};
```

## Development Setup

### Prerequisites
- Node.js 16+
- Azure Functions Core Tools
- Azure subscription with appropriate permissions

### Frontend Setup
```bash
cd orphaned-resource-web
npm install
npm start
```

### Backend Setup
```bash
cd orphaned-resource-api
npm install
func start
```

### Environment Variables

Create `local.settings.json` in the API directory:
```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "",
    "FUNCTIONS_WORKER_RUNTIME": "node"
  }
}
```

## Security Considerations

### Authentication & Authorization
- **No Service Principals**: All operations use the signed-in user's identity
- **RBAC Enforcement**: Users can only operate on resources they have permissions for
- **Token Validation**: All endpoints validate Azure AD tokens
- **Multi-tenant Support**: Operates safely across different Azure AD tenants

### Best Practices
- All destructive operations require explicit user approval
- Comprehensive logging for audit trails
- Error handling prevents information disclosure
- Resource operations are scoped to user's accessible subscriptions

### Permissions Required
Users must have appropriate Azure RBAC permissions:
- **Reader**: For scanning and listing resources
- **Contributor**: For deleting and upgrading resources
- **Owner**: For subscription-level operations

## Deployment

### Frontend (Azure Static Web Apps)
```bash
cd orphaned-resource-web
npm run build
# Deploy build folder to Azure Static Web Apps
```

### Backend (Azure Functions)
```bash
cd orphaned-resource-api
func azure functionapp publish your-function-app-name
```

### Azure AD App Registration
1. Register application in Azure AD
2. Configure as multi-tenant (common endpoint)
3. Add `https://management.azure.com/user_impersonation` API permission
4. Configure redirect URIs for your frontend

## Monitoring & Logging

### Application Insights
- Function execution metrics
- Error tracking and alerting
- Performance monitoring
- User activity analytics

### Logging
- All operations logged with user context
- Error details for troubleshooting
- Resource operation audit trails
- Performance metrics

## Contributing

1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Update documentation
5. Submit pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues and questions:
- Create GitHub issue for bugs
- Review documentation for common scenarios
- Check Azure AD logs for authentication issues
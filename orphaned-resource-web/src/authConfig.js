export const msalConfig = {
  auth: {
    clientId: "2bed0b07-e8ff-4333-9c8b-2aa020872e2d",
    authority: "https://login.microsoftonline.com/common", // Enables multi-tenant
    redirectUri: "https://ambitious-moss-0f4949803.1.azurestaticapps.net"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["https://management.azure.com/user_impersonation"]
};

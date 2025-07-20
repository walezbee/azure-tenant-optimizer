export const msalConfig = {
  auth: {
    clientId: "2bed0b07-e8ff-4333-9c8b-2aa020872e2d",
    authority: "https://login.microsoftonline.com/common", // Enables multi-tenant
    redirectUri: "https://calm-cliff-00308290f.2.azurestaticapps.net.azurestaticapps.net/.auth/login/aad/callback"
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false
  }
};

export const loginRequest = {
  scopes: ["User.Read", "Directory.Read.All", "https://management.azure.com/user_impersonation"]
};

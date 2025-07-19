import { PublicClientApplication } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_CLIENT_ID, // From Azure AD
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_TENANT_ID}`,
    redirectUri: window.location.origin
  }
};

function App() {
  const msalInstance = new PublicClientApplication(msalConfig);

 const handleLogin = () => {
  window.location.href = '/.auth/login/aad';
};

return (
  <div>
    <h1>Orphaned Resource Scanner</h1>
    <button onClick={handleLogin}>Login with Azure AD</button>
  </div>
);
}

export default App;
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

  const login = async () => {
    await msalInstance.loginPopup();
    console.log("Logged in!");
  };

  return (
    <div>
      <h1>Orphaned Resource Scanner</h1>
      <button onClick={login}>Login with Azure AD</button>
    </div>
  );
}

export default App;
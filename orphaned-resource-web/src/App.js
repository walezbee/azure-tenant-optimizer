import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import DeleteRequestTable from "./components/DeleteRequestTable";
import axios from "axios";

const App = () => {
  const { instance, accounts } = useMsal();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

// Update all scopes to use user_impersonation
const handleLogin = () => {
  instance.loginRedirect({
    scopes: ["https://management.azure.com/user_impersonation"],
  });
};

useEffect(() => {
  if (accounts.length === 0) return;

  const fetchResources = async () => {
    try {
      setLoading(true);
      const account = accounts[0];

      const response = await instance.acquireTokenSilent({
        scopes: ["https://management.azure.com/user_impersonation"],
        account: account,
      });

      const token = response.accessToken;

      const res = await axios.get(
        "https://orphaned-backend-func.azurewebsites.net/api/getOrphanedResources",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResources(res.data.data);
    } catch (err) {
      console.error("Error fetching resources:", err);
      setError("Failed to load resources.");
    } finally {
      setLoading(false);
    }
  };

  fetchResources();
}, [accounts, instance]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Orphaned Azure Resources</h1>

      {accounts.length === 0 ? (
        <button
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          Login with Azure AD
        </button>
      ) : loading ? (
        <p>Loading orphaned resources...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <DeleteRequestTable resources={resources} />
      )}
    </div>
  );
};

export default App;

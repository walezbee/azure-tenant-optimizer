// src/App.js
import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import DeleteRequestTable from "./components/DeleteRequestTable";
import axios from "axios";

const App = () => {
  const { instance, accounts } = useMsal();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: ["https://management.azure.com/.default"],
      });
      fetchResources(); // call fetch after login
    } catch (err) {
      console.error("Login failed:", err);
      setError("Login failed. Please try again.");
    }
  };

  const fetchResources = async () => {
    if (accounts.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const account = accounts[0];

      const response = await instance.acquireTokenSilent({
        scopes: ["https://management.azure.com/.default"],
        account,
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

  useEffect(() => {
    if (accounts.length > 0) {
      fetchResources();
    }
  }, [accounts]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Orphaned Azure Resources</h1>

      {accounts.length === 0 && (
        <button
          onClick={handleLogin}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Login with Azure AD
        </button>
      )}

      {accounts.length > 0 && loading && <p>Loading orphaned resources...</p>}
      {accounts.length > 0 && error && <p className="text-red-500">{error}</p>}
      {accounts.length > 0 && !loading && !error && (
        <DeleteRequestTable resources={resources} />
      )}
    </div>
  );
};

export default App;

// src/App.js
import React, { useEffect, useState } from "react";
import { useMsal } from "@azure/msal-react";
import DeleteRequestTable from "./components/DeleteRequestTable";
import axios from "axios";

const App = () => {
  const { instance, accounts } = useMsal();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchResources = async () => {
      try {
        if (accounts.length === 0) return;

        const account = accounts[0];

        // Acquire token for Azure Management API
        const response = await instance.acquireTokenSilent({
          scopes: ["https://management.azure.com/.default"],
          account: account,
        });

        const token = response.accessToken;

        // Call Azure Function API endpoint
        const res = await axios.get(
          "https://orphaned-backend-func.azurewebsites.net/api/getOrphanedResources",
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setResources(res.data.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching resources:", err);
        setError("Failed to load resources.");
        setLoading(false);
      }
    };

    fetchResources();
  }, [accounts, instance]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Orphaned Azure Resources</h1>

      {loading && <p>Loading orphaned resources...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && <DeleteRequestTable resources={resources} />}
    </div>
  );
};

export default App;

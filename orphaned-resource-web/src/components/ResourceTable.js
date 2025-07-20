// src/components/ResourceTable.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useMsal } from "@azure/msal-react";
import { loginRequest } from "../authConfig";

const ResourceTable = () => {
  const [resources, setResources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { instance, accounts } = useMsal();

  const fetchResources = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      const token = response.accessToken;

      const apiResponse = await axios.get("/api/getOrphanedResources", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setResources(apiResponse.data.data || []);
    } catch (err) {
      console.error("Failed to load resources:", err);
      setError("Could not fetch resources.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = async () => {
    if (selected.length === 0) {
      alert("Please select at least one resource to delete.");
      return;
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });

      const token = response.accessToken;

      await axios.post(
        "/api/deleteResources",
        { resourceIds: selected },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      alert("Resources submitted for deletion.");
      setSelected([]);
      fetchResources(); // Refresh list
    } catch (err) {
      console.error("Failed to delete resources:", err);
      alert("Deletion failed. See console for details.");
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  return (
    <div style={{ padding: "1rem" }}>
      <h2>Orphaned Resources</h2>

      {loading && <p>Loading resources...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && resources.length === 0 && <p>No orphaned resources found.</p>}

      {!loading && resources.length > 0 && (
        <table border="1" cellPadding="10" width="100%">
          <thead>
            <tr>
              <th>Select</th>
              <th>Name</th>
              <th>Type</th>
              <th>Resource Group</th>
              <th>Location</th>
              <th>Resource ID</th>
            </tr>
          </thead>
          <tbody>
            {resources.map((res) => (
              <tr key={res.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={selected.includes(res.id)}
                    onChange={() => handleSelect(res.id)}
                  />
                </td>
                <td>{res.name}</td>
                <td>{res.type}</td>
                <td>{res.resourceGroup}</td>
                <td>{res.location}</td>
                <td style={{ wordBreak: "break-all" }}>{res.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <button
        onClick={handleDelete}
        disabled={selected.length === 0}
        style={{ marginTop: "1rem" }}
      >
        Submit for Deletion
      </button>
    </div>
  );
};

export default ResourceTable;

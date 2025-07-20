// src/components/DeleteRequestTable.js
import React, { useState } from "react";
import { useMsal } from "@azure/msal-react";
import axios from "axios";

const DeleteRequestTable = ({ resources }) => {
  const { instance, accounts } = useMsal();
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState("");

  const toggleSelect = (resourceId) => {
    setSelected((prev) =>
      prev.includes(resourceId)
        ? prev.filter((id) => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const handleDeleteRequest = async () => {
    if (selected.length === 0) {
      setMessage("Please select at least one resource to delete.");
      return;
    }

    try {
      const account = accounts[0];

      const tokenResponse = await instance.acquireTokenSilent({
        scopes: ["https://management.azure.com/.default"],
        account,
      });

      const token = tokenResponse.accessToken;

      const res = await axios.post(
        "https://orphaned-backend-func.azurewebsites.net/api/deleteOrphanedResources",
        { resourceIds: selected }, // structure expected by backend
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setMessage("Deletion request submitted successfully.");
      setSelected([]);
    } catch (err) {
      console.error(err);
      setMessage("Failed to submit deletion request.");
    }
  };

  return (
    <div>
      {message && <p className="mb-4 text-blue-500">{message}</p>}
      <table className="table-auto border-collapse border w-full mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-4 py-2">Select</th>
            <th className="border px-4 py-2">Resource Name</th>
            <th className="border px-4 py-2">Resource Type</th>
            <th className="border px-4 py-2">Resource Group</th>
          </tr>
        </thead>
        <tbody>
          {resources.map((res) => (
            <tr key={res.id}>
              <td className="border px-4 py-2 text-center">
                <input
                  type="checkbox"
                  checked={selected.includes(res.id)}
                  onChange={() => toggleSelect(res.id)}
                />
              </td>
              <td className="border px-4 py-2">{res.name}</td>
              <td className="border px-4 py-2">{res.type}</td>
              <td className="border px-4 py-2">{res.resourceGroup}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={handleDeleteRequest}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Submit Deletion Request
      </button>
    </div>
  );
};

export default DeleteRequestTable;

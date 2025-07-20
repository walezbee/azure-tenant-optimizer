import { loginRequest } from '../authConfig';
import { useMsal } from '@azure/msal-react';

export const useOrphanedScanner = () => {
  const { instance, accounts } = useMsal();

  const scanResources = async () => {
    if (!accounts || accounts.length === 0) {
      throw new Error("User not signed in");
    }

    const account = accounts[0];
    const response = await instance.acquireTokenSilent({
      ...loginRequest,
      account: account
    });

    const result = await fetch("/api/scan-orphaned-resources", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${response.accessToken}`
      }
    });

    if (!result.ok) {
      throw new Error("Failed to fetch resources");
    }

    return await result.json();
  };

  return { scanResources };
};

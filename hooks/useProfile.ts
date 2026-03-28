import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/services/profile";
import { Profile } from "@/types/profile";

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getProfile();
      setProfile(data);

    } catch (err: any) {
      console.log("Profile fetch error", err);

      setError(
        err?.response?.data?.message || "Failed to load profile"
      );
      
      // ✅ Re-throw the error so the caller can handle it
      throw err;

    } finally {
      setLoading(false);
    }
  };

  const editProfile = async (userName: string, phoneNumber: string) => {
    try {
      setLoading(true);
      setError(null);

      const updated = await updateProfile({ userName, phoneNumber });

      setProfile(prev => ({
        ...prev,
        ...updated,
      }));
      
      // ✅ Return the updated profile so the caller knows it succeeded
      return updated;

    } catch (err: any) {
      console.log("Profile update error", err);

      // ✅ Set the error state for component-level display
      // Extract the error message from the response
      const errorMessage = err?.response?.data?.message || "Failed to update profile";
      setError(errorMessage);
      
      // ✅ IMPORTANT: Re-throw the error so the component can catch it
      throw err;

    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    editProfile,
  };
};
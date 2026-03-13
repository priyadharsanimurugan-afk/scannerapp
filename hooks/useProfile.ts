import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "@/services/profile";
import { Profile } from "@/types/profile";

export const useProfile = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getProfile();
      setProfile(data);
    } catch (error) {
      console.log("Profile fetch error", error);
    } finally {
      setLoading(false);
    }
  };

const editProfile = async (userName: string, phoneNumber: string) => {
  try {
    setLoading(true);

    const updated = await updateProfile({ userName, phoneNumber });

    // Merge updated fields into existing profile
    setProfile(prev => ({
      ...prev,
      ...updated, // only overwrite changed fields
    }));
  } catch (error) {
    console.log("Profile update error", error);
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
    fetchProfile,
    editProfile,
  };
};

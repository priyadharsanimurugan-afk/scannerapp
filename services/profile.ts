import api from "./api";
import { Profile, EditProfile } from "@/types/profile";

export const getProfile = async (): Promise<Profile> => {
  const res = await api.get("/profile");
  return res.data;
};

export const updateProfile = async (data: EditProfile) => {
  const res = await api.post("/profile/update-profile", data);
  return res.data;
};

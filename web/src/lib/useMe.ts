import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Me } from "./profile";
import type { HabitColor, HabitIconKey } from "./types";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<Me>("/api/auth/me"),
  });
}

// Change the nickname and avatar; the new profile replaces the cached one at once
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: {
      nickname?: string | null;
      avatarIcon?: HabitIconKey | null;
      avatarColor?: HabitColor;
      accent?: HabitColor;
      onboarded?: true;
    }) => api<Me>("/api/auth/me", { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: (me) => queryClient.setQueryData(["me"], me),
  });
}

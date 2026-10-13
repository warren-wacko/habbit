"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "@/lib/api";

// The form inside the "Delete account" sheet
export function DeleteAccountForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");

  const deleteAccount = useMutation({
    mutationFn: () =>
      api<void>("/api/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      tokenStore.clear();
      queryClient.clear();
      router.replace("/register");
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        deleteAccount.mutate();
      }}
      className="flex flex-col gap-4"
    >
      <p className="text-muted">
        This permanently deletes your account, every habit and all of its history. It can&apos;t be
        undone.
      </p>
      <div className="field">
        <label htmlFor="delete-password">Enter your password to confirm</label>
        <input
          id="delete-password"
          type="password"
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input"
        />
      </div>
      {deleteAccount.isError && (
        <p role="alert" className="alert">
          {deleteAccount.error.message}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={onCancel} className="btn-ghost h-12">
          Cancel
        </button>
        <button type="submit" disabled={deleteAccount.isPending} className="btn-danger">
          {deleteAccount.isPending ? "Deleting..." : "Delete forever"}
        </button>
      </div>
    </form>
  );
}

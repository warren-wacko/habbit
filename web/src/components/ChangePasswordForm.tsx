"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// The form inside the "Change password" sheet
export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);

  const changePassword = useMutation({
    mutationFn: () =>
      api<void>("/api/auth/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    },
  });

  function onSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    changePassword.mutate();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="field">
        <label htmlFor="current-password">Current password</label>
        <input
          id="current-password"
          type="password"
          required
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="input"
        />
      </div>
      <div className="field">
        <label htmlFor="new-password">New password</label>
        <input
          id="new-password"
          type="password"
          required
          minLength={8}
          maxLength={72}
          autoComplete="new-password"
          aria-describedby="new-password-hint"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input"
        />
        <p id="new-password-hint" className="hint">
          At least 8 characters.
        </p>
      </div>
      <div className="field">
        <label htmlFor="confirm-password">Confirm new password</label>
        <input
          id="confirm-password"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setMismatch(false);
          }}
          className="input"
        />
      </div>

      {mismatch && (
        <p role="alert" className="alert">
          The two new passwords don&apos;t match.
        </p>
      )}
      {changePassword.isError && (
        <p role="alert" className="alert">
          {changePassword.error.message}
        </p>
      )}
      {changePassword.isSuccess && (
        <p role="status" className="notice">
          Password updated.
        </p>
      )}

      <button type="submit" disabled={changePassword.isPending} className="btn">
        {changePassword.isPending ? "Saving..." : "Update password"}
      </button>
    </form>
  );
}

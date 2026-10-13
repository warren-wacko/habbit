import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ApiError, tokenStore } from "./api";
import { useMe } from "./useMe";

// The signed-in user, or a redirect to /login when there is no valid token
export function useRequireAuth() {
  const router = useRouter();
  const me = useMe();

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      tokenStore.clear();
      router.replace("/login");
    }
  }, [me.error, router]);

  return me;
}

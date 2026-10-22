import { useEffect, useRef } from "react";
import { BootstrapAuthState } from "./types";

export function useBootstrapAuthRefs({
  isAuthenticated,
  authReady,
  sessionUnlocked,
}: BootstrapAuthState) {
  const isAuthenticatedRef = useRef(isAuthenticated);
  const authReadyRef = useRef(authReady);
  const sessionUnlockedRef = useRef(sessionUnlocked);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    sessionUnlockedRef.current = sessionUnlocked;
  }, [sessionUnlocked]);

  return {
    isAuthenticatedRef,
    authReadyRef,
    sessionUnlockedRef,
  };
}

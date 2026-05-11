import { useEffect, useRef } from "react";
import { BootstrapAuthState } from "./types";

export function useBootstrapAuthRefs({
  isAuthenticated,
  authReady,
  iosAuthenticated,
}: BootstrapAuthState) {
  const isAuthenticatedRef = useRef(isAuthenticated);
  const authReadyRef = useRef(authReady);
  const iosAuthenticatedRef = useRef(iosAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    authReadyRef.current = authReady;
  }, [authReady]);

  useEffect(() => {
    iosAuthenticatedRef.current = iosAuthenticated;
  }, [iosAuthenticated]);

  return {
    isAuthenticatedRef,
    authReadyRef,
    iosAuthenticatedRef,
  };
}

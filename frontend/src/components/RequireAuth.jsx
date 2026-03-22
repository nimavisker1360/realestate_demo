import { useEffect, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useLocation } from "react-router-dom";

const RequireAuth = ({ children }) => {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();
  const redirectTriggeredRef = useRef(false);

  useEffect(() => {
    if (isLoading || isAuthenticated || redirectTriggeredRef.current) return;

    redirectTriggeredRef.current = true;
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    loginWithRedirect({
      appState: { returnTo },
      authorizationParams: {
        scope: "openid profile email",
      },
    });
  }, [
    isAuthenticated,
    isLoading,
    loginWithRedirect,
    location.pathname,
    location.search,
    location.hash,
  ]);

  if (isLoading || !isAuthenticated) return null;
  return children;
};

export default RequireAuth;

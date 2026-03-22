import { useContext, useEffect, useState, useRef } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailContext from "../context/UserDetailContext";
import { checkAdmin } from "../utils/api";

const MAX_ADMIN_CHECK_RETRIES = 3;
const ADMIN_CHECK_RETRY_DELAY_MS = 1200;

const useAdmin = () => {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const {
    userDetails: { token },
  } = useContext(UserDetailContext);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retryTick, setRetryTick] = useState(0);
  const lastCheckedRef = useRef({ email: null });
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef(null);

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const fetchAdminStatus = async () => {
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setIsAdmin(false);
        setLoading(false);
        retryCountRef.current = 0;
        lastCheckedRef.current = { email: null };
        return;
      }

      if (!user?.email || !token) {
        setLoading(true);
        return;
      }

      const wasAlreadyChecked = lastCheckedRef.current.email === user.email;

      if (wasAlreadyChecked) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await checkAdmin(user.email, token);
        setIsAdmin(Boolean(result?.isAdmin));
        lastCheckedRef.current = { email: user.email };
        retryCountRef.current = 0;
        setLoading(false);
      } catch (error) {
        const status = error?.response?.status;

        // Definitive "not admin" states
        if (status === 403 || status === 404) {
          setIsAdmin(false);
          lastCheckedRef.current = { email: user.email };
          retryCountRef.current = 0;
          setLoading(false);
          return;
        }

        // Transient error (401/token refresh/network): retry before giving up
        if (retryCountRef.current < MAX_ADMIN_CHECK_RETRIES) {
          retryCountRef.current += 1;
          retryTimerRef.current = setTimeout(() => {
            setRetryTick((prev) => prev + 1);
          }, ADMIN_CHECK_RETRY_DELAY_MS);
          return;
        }

        setLoading(false);
      }
    };

    fetchAdminStatus();

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [isAuthenticated, authLoading, user?.email, token, retryTick]);

  return { isAdmin, loading };
};

export default useAdmin;

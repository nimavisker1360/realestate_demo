import { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import {
  MdClose,
  MdEmail,
  MdHome,
  MdSecurity,
  MdArrowForward,
} from "react-icons/md";
import { FcGoogle } from "react-icons/fc";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";

const LoginModal = ({ isOpen, onClose }) => {
  const { loginWithRedirect } = useAuth0();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();

  const handleLogin = async ({
    connection = null,
    screenHint = null,
  } = {}) => {
    setIsLoading(true);
    try {
      const authorizationParams = {};
      if (connection) {
        authorizationParams.connection = connection;
      }
      if (screenHint) {
        authorizationParams.screen_hint = screenHint;
      }
      await loginWithRedirect({
        authorizationParams,
      });
    } catch (error) {
      console.error("Login error:", error);
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-modal-enter"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-secondary/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-secondaryBlue/20 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-50 group cursor-pointer"
          >
            <MdClose className="text-white/70 group-hover:text-white text-xl transition-colors pointer-events-none" />
          </button>

          {/* Content */}
          <div className="relative z-10 p-8 pt-6">
            {/* Brand & Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center bg-white rounded-2xl p-3 mb-4 shadow-lg">
                <span className="px-2 text-3xl font-black uppercase tracking-[0.28em] text-slate-900">
                  demo
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Hoş Geldiniz
              </h2>
              <p className="text-slate-400 text-sm">
                Hayalinizdeki evi bulmak için giriş yapın
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3 mb-8">
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="p-2 bg-secondary/20 rounded-lg">
                  <MdHome className="text-secondary text-lg" />
                </div>
                <span className="text-xs text-slate-300">
                  {t("auth.benefitProperties")}
                </span>
              </div>
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-xl border border-white/10">
                <div className="p-2 bg-secondaryBlue/20 rounded-lg">
                  <MdSecurity className="text-secondaryBlue text-lg" />
                </div>
                <span className="text-xs text-slate-300">
                  {t("auth.benefitSecure")}
                </span>
              </div>
            </div>

            {/* Login Buttons */}
            <div className="space-y-3">
              {/* Google Login */}
              <button
                onClick={() => handleLogin({ connection: "google-oauth2" })}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-white/95 hover:bg-white rounded-2xl font-medium text-gray-800 transition-all duration-200 shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed border border-white/60"
              >
                <FcGoogle className="text-2xl" />
                <span>{t("auth.continueWithGoogle")}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  {t("auth.orShort")}
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
              </div>

              {/* Email Login */}
              <button
                onClick={() => handleLogin()}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-white transition-all duration-200 shadow-lg shadow-secondary/30 hover:shadow-xl hover:shadow-secondary/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group bg-gradient-to-r from-secondary via-green-500 to-secondaryBlue border border-white/10"
              >
                <MdEmail className="text-xl" />
                <span>{t("auth.loginWithEmail")}</span>
                <MdArrowForward className="text-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            </div>

            {/* Sign Up */}
            <div className="mt-6 space-y-3">
              <p className="text-center text-xs text-slate-400">
                {t("auth.signUpPrompt")}
              </p>
              <button
                onClick={() => handleLogin({ screenHint: "signup" })}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-semibold text-white transition-all duration-200 shadow-lg shadow-secondaryBlue/30 hover:shadow-xl hover:shadow-secondaryBlue/40 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed group bg-gradient-to-r from-secondaryBlue via-sky-500 to-secondary border border-white/10"
              >
                <span>{t("auth.signUpCta")}</span>
                <MdArrowForward className="text-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center">
              <p className="text-xs text-slate-500">
                By logging in, you agree to our{" "}
                <a href="#" className="text-secondary hover:underline">
                  Terms of Service
                </a>{" "}
                and{" "}
                <a href="#" className="text-secondary hover:underline">
                  Privacy Policy
                </a>
                .
              </p>
            </div>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-secondary/30 border-t-secondary rounded-full animate-spin" />
                  <p className="text-white text-sm">Yönlendiriliyor...</p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Gradient Bar */}
          <div className="h-1 bg-gradient-to-r from-secondary via-green-400 to-secondaryBlue" />
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes modal-enter {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        .animate-modal-enter {
          animation: modal-enter 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

LoginModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
};

export default LoginModal;

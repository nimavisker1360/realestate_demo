import PropTypes from "prop-types";
import { FaRobot } from "react-icons/fa6";

const ChatLauncherButton = ({ isOpen, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`group fixed bottom-5 right-5 z-[70] flex items-center gap-3 rounded-full border border-white/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.94)_0%,rgba(236,253,245,0.96)_100%)] px-4 py-3 shadow-[0_28px_60px_-30px_rgba(15,23,42,0.62)] backdrop-blur-xl transition hover:-translate-y-1 ${
      isOpen ? "pointer-events-none opacity-0" : "opacity-100"
    }`}
  >
    <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white shadow-[0_14px_30px_-18px_rgba(16,185,129,0.95)]">
      <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/35" />
      <FaRobot className="relative hb-chat-launcher-robot" size={18} />
    </span>
    <span className="pr-1 text-left">
      <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        demo
      </span>
      <span className="block text-sm font-semibold text-slate-900">{label}</span>
    </span>
  </button>
);

ChatLauncherButton.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  label: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
};

export default ChatLauncherButton;

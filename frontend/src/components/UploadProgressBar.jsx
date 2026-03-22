import PropTypes from "prop-types";

const UploadProgressBar = ({ progress, label, floating = false }) => {
  if (progress === null || progress === undefined) return null;

  const isComplete = progress >= 100;

  if (floating) {
    return (
      <div
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-200 px-6 py-4 min-w-[320px] max-w-[420px]"
        style={{ animation: "slideUp 0.3s ease-out" }}
      >
        <style>{`
          @keyframes slideUp {
            from { opacity: 0; transform: translate(-50%, 20px); }
            to { opacity: 1; transform: translate(-50%, 0); }
          }
        `}</style>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {!isComplete && (
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            )}
            {isComplete && (
              <svg className="w-4 h-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="text-sm font-medium text-gray-700">
              {label || (isComplete ? "تکمیل شد / Tamamlandı!" : "در حال آپلود... / Yükleniyor...")}
            </span>
          </div>
          <span className="text-sm font-bold" style={{ color: isComplete ? "#22c55e" : "#3b82f6" }}>
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: isComplete
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #3b82f6, #818cf8, #6366f1)",
              boxShadow: isComplete ? "0 0 8px rgba(34,197,94,0.4)" : "0 0 8px rgba(59,130,246,0.3)",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 w-full px-1">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          {!isComplete && (
            <div className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          )}
          <span className="text-xs font-medium text-gray-600">
            {label || (isComplete ? "تکمیل شد / Tamamlandı" : "در حال آپلود... / Yükleniyor...")}
          </span>
        </div>
        <span className="text-xs font-semibold" style={{ color: isComplete ? "#22c55e" : "#3b82f6" }}>
          {progress}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${progress}%`,
            background: isComplete
              ? "linear-gradient(90deg, #22c55e, #16a34a)"
              : "linear-gradient(90deg, #3b82f6, #6366f1)",
          }}
        />
      </div>
    </div>
  );
};

UploadProgressBar.propTypes = {
  progress: PropTypes.number,
  label: PropTypes.string,
  floating: PropTypes.bool,
};

export default UploadProgressBar;

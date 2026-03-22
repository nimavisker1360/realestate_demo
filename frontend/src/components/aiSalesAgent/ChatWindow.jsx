import { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";
import { MdClose, MdRefresh, MdSend } from "react-icons/md";
import { FaRobot } from "react-icons/fa6";
import QuickReplies from "./QuickReplies";
import RecommendationCards from "./RecommendationCards";
import LeadCaptureFormInline from "./LeadCaptureFormInline";
import ResourceLinks from "./ResourceLinks";

const temperatureStyles = {
  hot: "bg-rose-50 text-rose-700 border-rose-200",
  warm: "bg-amber-50 text-amber-700 border-amber-200",
  cold: "bg-slate-100 text-slate-600 border-slate-200",
};

const ChatWindow = ({
  labels,
  messages,
  lead,
  leadSubmitted,
  leadTemperature,
  isLoading,
  isSubmittingLead,
  onClose,
  onReset,
  onSendMessage,
  onQuickReply,
  onSubmitLead,
}) => {
  const [input, setInput] = useState("");
  const endRef = useRef(null);
  const currentAssistant =
    [...messages].reverse().find((item) => item.role === "assistant") || null;
  const shouldShowLeadForm =
    Boolean(currentAssistant?.cta?.showLeadForm) && !leadSubmitted;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const message = input.trim();
    if (!message) return;
    setInput("");
    await onSendMessage(message);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[80] flex h-[min(80vh,760px)] w-[min(420px,calc(100vw-20px))] flex-col overflow-hidden rounded-[32px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_38px_80px_-38px_rgba(15,23,42,0.72)] backdrop-blur-xl">
      <div className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(255,122,26,0.18),transparent_34%),linear-gradient(135deg,#ffffff_0%,#ecfdf5_100%)] px-5 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white shadow-[0_18px_35px_-20px_rgba(16,185,129,0.98)]">
              <FaRobot size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-slate-900">{labels.title}</p>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                    temperatureStyles[leadTemperature] || temperatureStyles.cold
                  }`}
                >
                  {labels[`${leadTemperature}Lead`] || labels.coldLead}
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{labels.subtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-white/80 bg-white/80 p-2 text-slate-500 transition hover:text-slate-800"
              aria-label={labels.restart}
            >
              <MdRefresh size={18} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/80 bg-white/80 p-2 text-slate-500 transition hover:text-slate-800"
              aria-label={labels.close}
            >
              <MdClose size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-emerald-200 bg-white/80 p-5 text-sm text-slate-500">
            {labels.welcome}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isUser = message.role === "user";
              return (
                <div
                  key={`${message.role}-${message.timestamp}-${index}`}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-[0_18px_34px_-28px_rgba(15,23,42,0.35)] ${
                      isUser
                        ? "bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white"
                        : "border border-slate-200 bg-white text-slate-700"
                    }`}
                  >
                    <p
                      className={`whitespace-pre-line ${
                        isUser ? "text-white" : "text-slate-700"
                      }`}
                    >
                      {message.content}
                    </p>
                    {!isUser ? (
                      <ResourceLinks items={message.resources} labels={labels} />
                    ) : null}
                    {!isUser ? (
                      <RecommendationCards items={message.recommendations} labels={labels} />
                    ) : null}
                  </div>
                </div>
              );
            })}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-[22px] border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500 shadow-[0_16px_30px_-24px_rgba(15,23,42,0.32)]">
                  <div className="flex items-center gap-2">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:0ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:120ms]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-500 [animation-delay:240ms]" />
                    </span>
                    <span>{labels.typing}</span>
                  </div>
                </div>
              </div>
            ) : null}

            {currentAssistant?.quickReplies?.length ? (
              <QuickReplies
                quickReplies={currentAssistant.quickReplies}
                onSelect={onQuickReply}
                turkeyLabel={labels.turkeyLabel}
              />
            ) : null}

            <div ref={endRef} />
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 bg-white/92 px-4 py-3">
        {leadSubmitted ? (
          <div className="space-y-3">
            <div className="rounded-[20px] border border-emerald-100 bg-emerald-50/80 px-4 py-3 text-xs leading-5 text-emerald-800">
              {labels.leadSubmittedSuccess}
            </div>
            <button
              type="button"
              onClick={onReset}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {labels.restart}
            </button>
          </div>
        ) : shouldShowLeadForm ? (
          <LeadCaptureFormInline
            compact
            labels={labels}
            lead={lead}
            onSubmit={onSubmitLead}
            isSubmitting={isSubmittingLead}
          />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder={labels.placeholder}
                className="min-h-[52px] flex-1 resize-none rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="inline-flex h-[52px] items-center justify-center rounded-[20px] bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] px-4 text-white shadow-[0_18px_32px_-24px_rgba(16,185,129,0.96)] transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-60"
              >
                <MdSend size={18} />
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

ChatWindow.propTypes = {
  labels: PropTypes.object.isRequired,
  messages: PropTypes.arrayOf(PropTypes.object).isRequired,
  lead: PropTypes.object,
  leadSubmitted: PropTypes.bool,
  leadTemperature: PropTypes.string,
  isLoading: PropTypes.bool,
  isSubmittingLead: PropTypes.bool,
  onClose: PropTypes.func.isRequired,
  onReset: PropTypes.func.isRequired,
  onSendMessage: PropTypes.func.isRequired,
  onQuickReply: PropTypes.func.isRequired,
  onSubmitLead: PropTypes.func.isRequired,
};

export default ChatWindow;

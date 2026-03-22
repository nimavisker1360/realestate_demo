import { getAiSalesAgentUiCopy } from "./content";
import ChatLauncherButton from "./ChatLauncherButton";
import ChatWindow from "./ChatWindow";
import { useAISalesAgent } from "../../hooks/useAISalesAgent";
import { useTranslation } from "react-i18next";
import { normalizeLanguageCode } from "../../utils/languageRouting";

const AISalesAgentWidget = () => {
  const { i18n } = useTranslation();
  const {
    isOpen,
    isLoading,
    isSubmittingLead,
    state,
    openWidget,
    closeWidget,
    sendMessage,
    submitLead,
    resetConversation,
  } = useAISalesAgent();

  const labels = getAiSalesAgentUiCopy(normalizeLanguageCode(i18n.language || "en"));

  return (
    <>
      <ChatLauncherButton
        isOpen={isOpen}
        label={labels.minimized}
        onClick={openWidget}
      />
      {isOpen ? (
        <ChatWindow
          labels={labels}
          messages={state.messages}
          lead={state.lead}
          leadSubmitted={Boolean(state.leadSubmitted)}
          leadTemperature={state.leadTemperature}
          isLoading={isLoading}
          isSubmittingLead={isSubmittingLead}
          onClose={closeWidget}
          onReset={resetConversation}
          onSendMessage={sendMessage}
          onQuickReply={sendMessage}
          onSubmitLead={submitLead}
        />
      ) : null}
    </>
  );
};

export default AISalesAgentWidget;

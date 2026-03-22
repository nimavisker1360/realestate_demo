import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "react-query";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import {
  createAISalesAgentEmailHandoff,
  createAISalesAgentWhatsAppHandoff,
  getProperty,
  startAISalesAgentChat,
  submitAISalesAgentLead,
  sendAISalesAgentMessage,
} from "../utils/api";
import {
  extractAiSalesAgentDetailKey,
  resolveAiSalesAgentPageContext,
} from "../utils/aiSalesAgentPageContext";
import {
  trackAiSalesAgentEvent,
  trackAiSalesAgentEventOnce,
} from "../utils/aiSalesAgentAnalytics";
import { normalizeLanguageCode } from "../utils/languageRouting";
import { getAiSalesAgentUiCopy } from "../components/aiSalesAgent/content";

const SUBMIT_TOAST_MESSAGES = {
  en: "Your request has been sent successfully! Our consultant will contact you shortly.",
  tr: "Talebiniz başarıyla gönderildi! Danışmanımız en kısa sürede sizinle iletişime geçecek.",
  ru: "Ваша заявка успешно отправлена! Наш консультант свяжется с вами в ближайшее время.",
};

const EMAIL_FAILURE_TOAST_MESSAGES = {
  en: "We saved your request, but the shortlist email could not be sent yet.",
  tr: "Talebiniz kaydedildi, ancak kisa liste e-postasi henuz gonderilemedi.",
  ru: "Zayavka sokhranena, no shortlist po email poka ne otpravlen.",
};
const STORAGE_KEY = "__hbAiSalesAgentState_v8";
const MAX_STATE_AGE_MS = 7 * 24 * 60 * 60 * 1000;

const safeArray = (value) => (Array.isArray(value) ? value : []);

const readStoredState = (currentLocale = "en") => {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) return null;
    const parsedValue = JSON.parse(rawValue);
    if (!parsedValue || typeof parsedValue !== "object") return null;
    if (Date.now() - Number(parsedValue.lastUpdatedAt || 0) > MAX_STATE_AGE_MS) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    const storedLocale = normalizeLanguageCode(
      parsedValue.locale || parsedValue.lead?.preferredLanguage
    );
    if (storedLocale && storedLocale !== normalizeLanguageCode(currentLocale)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsedValue;
  } catch {
    return null;
  }
};

const writeStoredState = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Ignore persistence errors.
  }
};

const createDefaultState = (locale = "en") => ({
  locale: normalizeLanguageCode(locale),
  sessionId: "",
  stage: "idle",
  messages: [],
  lead: {},
  leadScore: 0,
  leadTemperature: "cold",
  qualified: false,
  handoff: null,
  persistedLeadId: "",
  leadSubmitted: false,
  lastUpdatedAt: Date.now(),
});

const toUserMessage = (content) => ({
  role: "user",
  content,
  timestamp: new Date().toISOString(),
});

const toAssistantMessage = (assistant = {}) => ({
  role: "assistant",
  content: assistant.content || "",
  timestamp: assistant.timestamp || new Date().toISOString(),
  nextQuestion: assistant.nextQuestion || "",
  quickReplies: safeArray(assistant.quickReplies),
  recommendations: safeArray(assistant.recommendations),
  resources: safeArray(assistant.resources),
  cta: assistant.cta || null,
});

const toTranscriptPayload = (messages = []) =>
  safeArray(messages).map((message) => ({
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  }));

const createLocalErrorMessage = (content) => ({
  role: "assistant",
  content,
  timestamp: new Date().toISOString(),
  quickReplies: [],
  recommendations: [],
  resources: [],
  cta: {
    primaryLabel: "",
    secondaryLabel: "",
    showLeadForm: true,
    showWhatsApp: true,
  },
});

const createSubmittedAssistantMessage = (content) => ({
  role: "assistant",
  content,
  timestamp: new Date().toISOString(),
  quickReplies: [],
  recommendations: [],
  resources: [],
  cta: {
    primaryLabel: "",
    secondaryLabel: "",
    showLeadForm: false,
    showWhatsApp: false,
  },
});

const createEmailDeliveryFailedMessage = (content) => ({
  role: "assistant",
  content,
  timestamp: new Date().toISOString(),
  quickReplies: [],
  recommendations: [],
  resources: [],
  cta: {
    primaryLabel: "",
    secondaryLabel: "",
    showLeadForm: true,
    showWhatsApp: true,
  },
});

const getCurrentAssistant = (messages = []) =>
  [...safeArray(messages)].reverse().find((item) => item.role === "assistant") || null;

export const useAISalesAgent = () => {
  const location = useLocation();
  const { i18n } = useTranslation();
  const locale = normalizeLanguageCode(i18n.language);
  const labels = useMemo(() => getAiSalesAgentUiCopy(locale), [locale]);
  const detailKey = useMemo(
    () => extractAiSalesAgentDetailKey(location.pathname),
    [location.pathname]
  );
  const { data: pageEntity } = useQuery(
    ["ai-sales-agent-page-entity", detailKey],
    () => getProperty(detailKey),
    {
      enabled: Boolean(detailKey),
      staleTime: 60 * 1000,
    }
  );
  const pageContext = useMemo(
    () =>
      resolveAiSalesAgentPageContext({
        location,
        locale,
        pageEntity,
      }),
    [location, locale, pageEntity]
  );

  const [state, setState] = useState(() => {
    if (typeof window === "undefined") return createDefaultState(locale);
    return readStoredState(locale) || createDefaultState(locale);
  });
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
    if (typeof window !== "undefined") {
      writeStoredState(state);
    }
  }, [state]);

  const updateState = useCallback((updater) => {
    setState((previousState) => {
      const nextState =
        typeof updater === "function" ? updater(previousState) : updater;
      return {
        locale,
        ...nextState,
        lastUpdatedAt: Date.now(),
      };
    });
  }, [locale]);

  const clearConversationState = useCallback(
    (targetLocale = locale) => {
      const clearedState = createDefaultState(targetLocale);
      stateRef.current = clearedState;
      setState(clearedState);
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return clearedState;
    },
    [locale]
  );

  const applyResponse = useCallback(
    (response, extraUserMessage = null) => {
      updateState((previousState) => {
        const nextMessages = [
          ...safeArray(previousState.messages),
          ...(extraUserMessage ? [extraUserMessage] : []),
          ...(response?.assistant ? [toAssistantMessage(response.assistant)] : []),
        ];

        return {
          ...previousState,
          locale,
          sessionId: response?.sessionId || previousState.sessionId,
          stage: response?.stage || previousState.stage,
          messages: nextMessages,
          lead: response?.lead || previousState.lead,
          leadScore:
            typeof response?.leadScore === "number"
              ? response.leadScore
              : previousState.leadScore,
          leadTemperature:
            response?.leadTemperature || previousState.leadTemperature,
          qualified:
            typeof response?.qualified === "boolean"
              ? response.qualified
              : previousState.qualified,
          handoff: response?.handoff || previousState.handoff,
          persistedLeadId:
            response?.persistedLeadId ||
            response?.leadId ||
            previousState.persistedLeadId,
          leadSubmitted: previousState.leadSubmitted,
        };
      });

      const sessionIdentity = response?.sessionId || stateRef.current.sessionId;
      if (response?.assistant?.recommendations?.length) {
        trackAiSalesAgentEvent("ai_recommendation_shown", {
          sessionId: sessionIdentity,
          pageType: pageContext.pageType,
          recommendationCount: response.assistant.recommendations.length,
        });
      }
      if (response?.extractedFields?.length) {
        trackAiSalesAgentEvent("ai_lead_question_answered", {
          sessionId: sessionIdentity,
          pageType: pageContext.pageType,
          updatedFields: response.extractedFields.join(","),
        });
      }
      if (response?.qualified) {
        trackAiSalesAgentEventOnce("ai_lead_qualified", sessionIdentity, {
          sessionId: sessionIdentity,
          pageType: pageContext.pageType,
          leadScore: response.leadScore,
          leadTemperature: response.leadTemperature,
        });
      }
      if (response?.leadTemperature === "hot") {
        trackAiSalesAgentEventOnce("ai_hot_lead_created", sessionIdentity, {
          sessionId: sessionIdentity,
          pageType: pageContext.pageType,
          leadScore: response.leadScore,
        });
      }
    },
    [locale, pageContext.pageType, updateState]
  );

  const startConversation = useCallback(async () => {
    if (isLoading) return null;
    setIsLoading(true);
    try {
      const response = await startAISalesAgentChat({
        sessionId: stateRef.current.sessionId,
        locale,
        pageContext,
      });
      updateState((previousState) => ({
        ...previousState,
        locale,
        sessionId: response.sessionId || previousState.sessionId,
        stage: response.stage || "greeting",
        messages: response.assistant ? [toAssistantMessage(response.assistant)] : [],
        lead: response.lead || {},
        leadScore: response.leadScore || 0,
        leadTemperature: response.leadTemperature || "cold",
        qualified: Boolean(response.qualified),
        handoff: response.handoff || null,
        persistedLeadId: response.persistedLeadId || "",
      }));
      trackAiSalesAgentEventOnce("ai_conversation_started", response.sessionId, {
        sessionId: response.sessionId,
        pageType: pageContext.pageType,
        locale,
      });
      if (response?.assistant?.recommendations?.length) {
        trackAiSalesAgentEvent("ai_recommendation_shown", {
          sessionId: response.sessionId,
          pageType: pageContext.pageType,
          recommendationCount: response.assistant.recommendations.length,
        });
      }
      return response;
    } catch (_error) {
      updateState((previousState) => ({
        ...previousState,
        messages: [
          ...safeArray(previousState.messages),
          createLocalErrorMessage(labels.fallbackError),
        ],
      }));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, labels.fallbackError, locale, pageContext, updateState]);

  useEffect(() => {
    const activeLocale = normalizeLanguageCode(
      state.locale || state.lead?.preferredLanguage || locale
    );
    if (activeLocale === locale) return;

    clearConversationState(locale);
    if (isOpen) {
      startConversation();
    }
  }, [
    clearConversationState,
    isOpen,
    locale,
    startConversation,
    state.lead?.preferredLanguage,
    state.locale,
  ]);

  const openWidget = useCallback(async () => {
    setIsOpen(true);
    trackAiSalesAgentEvent("ai_widget_open", {
      pageType: pageContext.pageType,
      locale,
    });

    if (!stateRef.current.messages.length) {
      await startConversation();
    }
  }, [locale, pageContext.pageType, startConversation]);

  const closeWidget = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleOpenRequest = () => {
      openWidget();
    };

    window.addEventListener("hb:ai-agent:open", handleOpenRequest);
    return () => {
      window.removeEventListener("hb:ai-agent:open", handleOpenRequest);
    };
  }, [openWidget]);

  const sendMessage = useCallback(
    async (rawMessage) => {
      const content = String(rawMessage || "").trim();
      if (!content || isLoading) return;

      if (stateRef.current.leadSubmitted) {
        const userMessage = toUserMessage(content);
        updateState((previousState) => ({
          ...previousState,
          messages: [
            ...safeArray(previousState.messages),
            userMessage,
            createSubmittedAssistantMessage(labels.leadSubmittedLocked),
          ],
        }));
        return;
      }

      let sessionId = stateRef.current.sessionId;
      if (!sessionId) {
        const startResponse = await startConversation();
        sessionId = startResponse?.sessionId || stateRef.current.sessionId;
      }

      const userMessage = toUserMessage(content);
      const transcript = toTranscriptPayload([
        ...safeArray(stateRef.current.messages),
        userMessage,
      ]);

      setIsLoading(true);
      try {
        const response = await sendAISalesAgentMessage({
          sessionId,
          locale,
          message: content,
          transcript,
          lead: stateRef.current.lead || {},
          pageContext,
        });
        applyResponse(response, userMessage);
      } catch (_error) {
        updateState((previousState) => ({
          ...previousState,
          messages: [
            ...safeArray(previousState.messages),
            userMessage,
            createLocalErrorMessage(labels.fallbackError),
          ],
        }));
      } finally {
        setIsLoading(false);
      }
    },
    [
      applyResponse,
      isLoading,
      labels.fallbackError,
      labels.leadSubmittedLocked,
      locale,
      pageContext,
      startConversation,
      updateState,
    ]
  );

  const submitLead = useCallback(
    async (leadPatch = {}) => {
      setIsSubmittingLead(true);
      try {
        const mergedLead = {
          ...(stateRef.current.lead || {}),
          ...leadPatch,
        };
        const response = await submitAISalesAgentLead({
          sessionId: stateRef.current.sessionId,
          locale,
          transcript: toTranscriptPayload(stateRef.current.messages),
          lead: mergedLead,
          pageContext,
        });
        const handoff = response.handoff || null;
        const emailDelivery = handoff?.emailDelivery || null;
        const emailRequested = Boolean(String(mergedLead.email || "").trim());
        const emailFailed =
          emailRequested &&
          (!emailDelivery?.sent ||
            ["email_not_configured", "no_recommendations", "email_send_failed"].includes(
              String(emailDelivery?.reason || "")
            ));

        if (emailFailed) {
          updateState((previousState) => ({
            ...previousState,
            lead: mergedLead,
            leadScore: response.leadScore || previousState.leadScore,
            leadTemperature: response.leadTemperature || previousState.leadTemperature,
            qualified: Boolean(response.qualified),
            handoff: handoff || previousState.handoff,
            persistedLeadId: response.leadId || previousState.persistedLeadId,
            leadSubmitted: false,
            messages: [
              ...safeArray(previousState.messages),
              createEmailDeliveryFailedMessage(
                labels.leadSavedEmailFailed || labels.leadSubmitRetry
              ),
            ],
          }));
          toast.error(
            labels.emailDeliveryFailedToast ||
              EMAIL_FAILURE_TOAST_MESSAGES[locale] ||
              EMAIL_FAILURE_TOAST_MESSAGES.en,
            {
              position: "top-center",
              autoClose: 5000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
            }
          );
          return {
            success: false,
            response,
            error: emailDelivery?.reason || "email_delivery_failed",
          };
        }

        updateState((previousState) => ({
          ...previousState,
          lead: mergedLead,
          leadScore: response.leadScore || previousState.leadScore,
          leadTemperature: response.leadTemperature || previousState.leadTemperature,
          qualified: Boolean(response.qualified),
          handoff: handoff || previousState.handoff,
          persistedLeadId: response.leadId || previousState.persistedLeadId,
          leadSubmitted: true,
          messages: [
            ...safeArray(previousState.messages),
            createSubmittedAssistantMessage(labels.leadSubmittedSuccess),
          ],
        }));
        trackAiSalesAgentEvent("ai_contact_submitted", {
          sessionId: stateRef.current.sessionId,
          pageType: pageContext.pageType,
          leadScore: response.leadScore,
          leadTemperature: response.leadTemperature,
        });
        toast.success(SUBMIT_TOAST_MESSAGES[locale] || SUBMIT_TOAST_MESSAGES.en, {
          position: "top-center",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
        });
        setTimeout(() => {
          clearConversationState(locale);
          startConversation();
        }, 4000);
        return { success: true, response };
      } catch (error) {
        return {
          success: false,
          error:
            error?.response?.data?.error ||
            error?.response?.data?.message ||
            "Lead submission failed",
        };
      } finally {
        setIsSubmittingLead(false);
      }
    },
    [
      clearConversationState,
      labels.emailDeliveryFailedToast,
      labels.leadSavedEmailFailed,
      labels.leadSubmitRetry,
      labels.leadSubmittedSuccess,
      locale,
      pageContext,
      startConversation,
      updateState,
    ]
  );

  const openWhatsAppHandoff = useCallback(async (leadPatch = {}) => {
    try {
      const mergedLead = {
        ...(stateRef.current.lead || {}),
        ...leadPatch,
      };
      const response = await createAISalesAgentWhatsAppHandoff({
        sessionId: stateRef.current.sessionId,
        locale,
        transcript: toTranscriptPayload(stateRef.current.messages),
        lead: mergedLead,
        pageContext,
      });
      updateState((previousState) => ({
        ...previousState,
        lead: mergedLead,
        handoff: response,
      }));
      if (response?.whatsapp?.url) {
        trackAiSalesAgentEvent("ai_whatsapp_handoff_clicked", {
          sessionId: stateRef.current.sessionId,
          pageType: pageContext.pageType,
        });
        window.open(response.whatsapp.url, "_blank", "noopener,noreferrer");
      }
    } catch {
      // Ignore handoff errors so the widget remains usable.
    }
  }, [locale, pageContext, updateState]);

  const sendEmailHandoff = useCallback(async (leadPatch = {}) => {
    try {
      const mergedLead = {
        ...(stateRef.current.lead || {}),
        ...leadPatch,
      };
      return await createAISalesAgentEmailHandoff({
        sessionId: stateRef.current.sessionId,
        locale,
        transcript: toTranscriptPayload(stateRef.current.messages),
        lead: mergedLead,
        pageContext,
      });
    } catch {
      return null;
    }
  }, [locale, pageContext]);

  const resetConversation = useCallback(() => {
    clearConversationState(locale);
    if (isOpen) {
      startConversation();
    }
  }, [clearConversationState, isOpen, locale, startConversation]);

  return {
    isOpen,
    isLoading,
    isSubmittingLead,
    state,
    currentAssistantMessage: getCurrentAssistant(state.messages),
    pageContext,
    openWidget,
    closeWidget,
    sendMessage,
    submitLead,
    openWhatsAppHandoff,
    sendEmailHandoff,
    resetConversation,
  };
};

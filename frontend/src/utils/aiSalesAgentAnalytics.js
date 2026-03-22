const pushEvent = (eventName, payload = {}) => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...payload,
  });
};

const buildOnceKey = (eventName, identity = "") =>
  `__hbAiEvent:${eventName}:${String(identity || "global").trim()}`;

export const trackAiSalesAgentEvent = (eventName, payload = {}) => {
  pushEvent(eventName, payload);
};

export const trackAiSalesAgentEventOnce = (
  eventName,
  identity,
  payload = {}
) => {
  if (typeof window === "undefined" || !window.sessionStorage) {
    pushEvent(eventName, payload);
    return;
  }

  const storageKey = buildOnceKey(eventName, identity);
  if (window.sessionStorage.getItem(storageKey)) return;
  window.sessionStorage.setItem(storageKey, "1");
  pushEvent(eventName, payload);
};

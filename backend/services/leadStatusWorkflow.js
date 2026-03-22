import { buildQualifiedLeadConversionPayload } from "../utils/googleAdsOfflineConversion.js";
import { normalizeLeadStatus } from "../utils/leadAttribution.js";
import { uploadQualifiedLeadConversion } from "./googleAdsQualifiedLeadUpload.js";

const QUALIFIED_STATUS = "qualified";

export const handleLeadStatusTransition = async ({
  previousLead,
  nextLead,
  transitionAt = new Date(),
} = {}) => {
  const previousStatus = normalizeLeadStatus(
    previousLead?.leadStatus || previousLead?.lead_status,
    null
  );
  const nextStatus = normalizeLeadStatus(
    nextLead?.leadStatus || nextLead?.lead_status,
    null
  );

  if (!nextStatus || previousStatus === nextStatus) {
    return {
      shouldPrepareQualifiedLeadUpload: false,
      reason: "no_status_change",
      payload: null,
    };
  }

  if (nextStatus !== QUALIFIED_STATUS) {
    return {
      shouldPrepareQualifiedLeadUpload: false,
      reason: "not_qualified",
      payload: null,
    };
  }

  const payload = buildQualifiedLeadConversionPayload({
    ...nextLead,
    qualifiedAt: transitionAt,
  });
  const uploadResult = await uploadQualifiedLeadConversion({
    lead: nextLead,
    transitionAt,
  });

  return {
    shouldPrepareQualifiedLeadUpload: true,
    reason: uploadResult.reason,
    payload,
    uploadResult,
  };
};

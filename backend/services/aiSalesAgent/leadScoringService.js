import { AI_AGENT_SCORING_THRESHOLDS } from "../../constants/aiSalesAgent.js";

const hasValue = (value) =>
  value !== undefined && value !== null && String(value).trim() !== "";

const toNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const scoreLead = (lead = {}, pageContext = {}) => {
  let score = 0;
  const reasons = [];

  const budgetMax = toNumber(lead.budgetMax);
  const budgetMin = toNumber(lead.budgetMin);
  const contactPoints = [];

  if (budgetMax > 0 || budgetMin > 0) {
    score += 8;
    reasons.push("budget_provided");
  }

  if (Math.max(budgetMax, budgetMin) >= AI_AGENT_SCORING_THRESHOLDS.highBudgetUsd) {
    score += 12;
    reasons.push("high_budget");
  }

  if (lead.citizenshipInterest === true) {
    score += 15;
    reasons.push("citizenship_interest");
  }

  if (lead.purpose === "investment") {
    score += 10;
    reasons.push("investment_purpose");
  }

  if (lead.purpose === "citizenship") {
    score += 12;
    reasons.push("citizenship_purpose");
  }

  if (lead.timeline === "immediate") {
    score += 20;
    reasons.push("immediate_timeline");
  } else if (lead.timeline === "within_1_month") {
    score += 14;
    reasons.push("near_term_timeline");
  } else if (lead.timeline === "within_3_months") {
    score += 9;
    reasons.push("mid_term_timeline");
  }

  if (lead.consultationMode === "visit") {
    score += 24;
    reasons.push("site_visit_requested");
  } else if (lead.consultationMode === "online") {
    score += 14;
    reasons.push("online_consultation_requested");
  }

  if (hasValue(lead.phone)) {
    score += 16;
    contactPoints.push("phone");
  }

  if (hasValue(lead.email)) {
    score += 10;
    contactPoints.push("email");
  }

  if (hasValue(lead.preferredContactMethod)) {
    score += 4;
    reasons.push("contact_method_selected");
  }

  if (contactPoints.length > 0) {
    reasons.push(`contact_${contactPoints.join("_")}`);
  }

  if (hasValue(lead.projectInterest) || hasValue(pageContext?.currentProjectName)) {
    score += 10;
    reasons.push("specific_project_interest");
  }

  if (hasValue(lead.locationInterest) || hasValue(lead.cityInterest)) {
    score += 6;
    reasons.push("specific_location_interest");
  }

  if (hasValue(lead.propertyTypeInterest)) {
    score += 5;
    reasons.push("property_type_selected");
  }

  if (hasValue(lead.roomType)) {
    score += 4;
    reasons.push("room_type_selected");
  }

  if (hasValue(lead.paymentPlan)) {
    score += 4;
    reasons.push("payment_plan_selected");
  }

  if (hasValue(lead.downPaymentAbility) && lead.downPaymentAbility !== "need_guidance") {
    score += 6;
    reasons.push("down_payment_specified");
  }

  if (hasValue(lead.deliveryStatus)) {
    score += 3;
    reasons.push("delivery_preference_set");
  }

  if (lead.citizenshipNeed === "yes") {
    score += 6;
    reasons.push("citizenship_need_confirmed");
  } else if (lead.citizenshipNeed === "maybe") {
    score += 3;
    reasons.push("citizenship_need_possible");
  }

  if (hasValue(lead.buyerProfile)) {
    score += 3;
    reasons.push("buyer_profile_set");
  }

  if (Array.isArray(lead.amenitiesPriorities) && lead.amenitiesPriorities.length > 0) {
    score += 4;
    reasons.push("amenities_selected");
  }

  if (hasValue(lead.leadIntent)) {
    score += 8;
    reasons.push("lead_intent_expressed");
  }

  if (lead.timeline === "just_researching") {
    score += 2;
    reasons.push("researching_timeline");
  }

  if (pageContext?.pageType === "project_detail" || pageContext?.pageType === "property_detail") {
    score += 5;
    reasons.push("detail_page_context");
  }

  if (pageContext?.pageType === "contact") {
    score += 6;
    reasons.push("contact_page_context");
  }

  const boundedScore = Math.max(0, Math.min(100, score));
  const leadTemperature =
    boundedScore >= AI_AGENT_SCORING_THRESHOLDS.hot
      ? "hot"
      : boundedScore >= AI_AGENT_SCORING_THRESHOLDS.warm
      ? "warm"
      : "cold";

  const qualified = leadTemperature !== "cold" && (hasValue(lead.phone) || hasValue(lead.email));

  return {
    score: boundedScore,
    leadTemperature,
    reasons,
    qualified,
  };
};

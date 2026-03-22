import { getMongoDb } from "../../config/prismaConfig.js";
import { searchBlogs } from "../realEstateAssistant.js";

const safeText = (value, fallback = "") => {
  const normalized = String(value || "").trim();
  return normalized || fallback;
};

const toFolded = (value) =>
  safeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u0131/g, "i")
    .replace(/\s+/g, " ")
    .trim();

const RESOURCE_REQUEST_PATTERNS = [
  "blog",
  "article",
  "guide",
  "guides",
  "law",
  "legal",
  "rules",
  "link",
  "rehber",
  "makale",
  "blog gonder",
  "hukuk",
  "kanun",
  "yasa",
  "statya",
  "gid",
  "zakon",
  "pravov",
];

const TOPIC_RULES = [
  {
    id: "citizenship_laws",
    patterns: [
      "citizenship",
      "passport",
      "law",
      "legal",
      "regulation",
      "rules",
      "vatandaslik",
      "hukuk",
      "yasa",
      "kanun",
      "grazhdanst",
      "legal guide",
      "residence permit",
      "tapu",
    ],
    keywords: [
      "turkish citizenship",
      "citizenship latest update",
      "citizenship law",
      "passport",
      "residence permit",
    ],
    requiredPatterns: [
      "citizenship",
      "passport",
      "vatandaslik",
      "grazhdanst",
      "residence permit",
    ],
    supportPatterns: ["law", "legal", "regulation", "rules", "kanun", "yasa", "hukuk"],
    blockedPatterns: [
      "investment",
      "roi",
      "rental yield",
      "dubai",
      "cyprus",
      "work permit",
      "calisma izni",
    ],
  },
  {
    id: "tax_guide",
    patterns: [
      "tax",
      "fee",
      "fees",
      "cost",
      "title deed",
      "title-deed",
      "harc",
      "vergi",
      "masraf",
      "nalog",
      "sbor",
      "tapu",
    ],
    keywords: ["property tax", "title deed", "fees", "tapu", "legal cost"],
    blockedPatterns: ["investment", "roi", "rental yield"],
  },
  {
    id: "investment_guide",
    patterns: [
      "investment",
      "roi",
      "rental yield",
      "rental income",
      "market",
      "market trend",
      "yatirim",
      "kira getirisi",
      "rynok",
      "invest",
    ],
    keywords: ["property investment", "market guide", "rental yield", "investment"],
    blockedPatterns: ["citizenship law", "passport regulation"],
  },
  {
    id: "payment_plan_guide",
    patterns: [
      "installment",
      "payment plan",
      "cash payment",
      "mortgage",
      "taksit",
      "odeme plani",
      "kredi",
      "rassroch",
      "oplata",
    ],
    keywords: ["installment payment", "payment plan", "mortgage", "cash payment"],
    blockedPatterns: ["citizenship law", "passport regulation"],
  },
];

const normalizeResource = (item = {}) => ({
  id: safeText(item.id || item._id?.toString?.()),
  title: safeText(item.title, "Blog article"),
  summary: safeText(item.summary),
  category: safeText(item.category),
  image_url: safeText(item.image_url || item.image),
  url: safeText(item.blog_url || item.url),
  published_at: safeText(item.published_at || item.createdAt),
});

const getLocalizedBlogField = (item = {}, baseField = "title", locale = "en") =>
  safeText(
    item?.[`${baseField}_${locale}`] ||
      item?.[baseField] ||
      item?.[`${baseField}_en`] ||
      item?.[`${baseField}_tr`] ||
      item?.[`${baseField}_ru`]
  );

const slugifyValue = (value = "") =>
  toFolded(value)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveBlogUrl = (item = {}, locale = "en") => {
  const existingUrl = safeText(item.blog_url || item.url);
  if (existingUrl) return existingUrl;

  const rawSlug = safeText(item.slug);
  if (rawSlug && !/^[a-f0-9]{24}$/i.test(rawSlug)) {
    return `/blog/${rawSlug}`;
  }

  const title = getLocalizedBlogField(item, "title", locale) || "blog";
  const slugBase = slugifyValue(title) || "blog";
  const id = safeText(item.id || item._id?.toString?.());
  return id ? `/blog/${slugBase}-${id}` : `/blog/${slugBase}`;
};

const normalizeFallbackResource = (item = {}, locale = "en") =>
  normalizeResource({
    id: safeText(item._id?.toString?.() || item.id),
    title: getLocalizedBlogField(item, "title", locale),
    summary:
      getLocalizedBlogField(item, "summary", locale) ||
      getLocalizedBlogField(item, "metaDescription", locale),
    category: getLocalizedBlogField(item, "category", locale),
    image_url:
      safeText(item.image) ||
      safeText(Array.isArray(item.images) ? item.images[0] : ""),
    url: resolveBlogUrl(item, locale),
    published_at: safeText(item.createdAt || item.publishedAt),
  });

const getRecentPublishedBlogs = async (locale = "en", limit = 48) => {
  const db = await getMongoDb();
  const docs = await db
    .collection("Blog")
    .find({ published: true })
    .sort({ order: 1, createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map((item) => normalizeFallbackResource(item, locale));
};

const getTopicMatchScore = (item = {}, topic = {}) => {
  const title = toFolded(item?.title || "");
  const summary = toFolded(item?.summary || "");
  const category = toFolded(item?.category || "");
  const matchesInAnyField = (pattern = "") => {
    const normalizedPattern = toFolded(pattern);
    if (!normalizedPattern) return false;
    return (
      title.includes(normalizedPattern) ||
      category.includes(normalizedPattern) ||
      summary.includes(normalizedPattern)
    );
  };
  let score = 0;

  const requiredPatterns = Array.isArray(topic.requiredPatterns)
    ? topic.requiredPatterns
    : [];
  if (requiredPatterns.length > 0 && !requiredPatterns.some(matchesInAnyField)) {
    return 0;
  }

  const weightedPatterns = [
    ...requiredPatterns.map((pattern) => ({ pattern, group: "required" })),
    ...(Array.isArray(topic.supportPatterns) ? topic.supportPatterns : []).map((pattern) => ({
      pattern,
      group: "support",
    })),
    ...(Array.isArray(topic.patterns) ? topic.patterns : []).map((pattern) => ({
      pattern,
      group: "default",
    })),
  ];

  for (const { pattern, group } of weightedPatterns) {
    const normalizedPattern = toFolded(pattern);
    if (!normalizedPattern) continue;
    if (title.includes(normalizedPattern)) {
      score += group === "required" ? 7 : group === "support" ? 3 : 5;
      continue;
    }
    if (category.includes(normalizedPattern)) {
      score += group === "required" ? 6 : group === "support" ? 2 : 4;
      continue;
    }
    if (summary.includes(normalizedPattern)) {
      score += group === "required" ? 4 : 2;
    }
  }

  for (const blockedPattern of Array.isArray(topic.blockedPatterns)
    ? topic.blockedPatterns
    : []) {
    const normalizedBlockedPattern = toFolded(blockedPattern);
    if (!normalizedBlockedPattern) continue;
    if (title.includes(normalizedBlockedPattern) || category.includes(normalizedBlockedPattern)) {
      score -= 4;
      continue;
    }
    if (summary.includes(normalizedBlockedPattern)) {
      score -= 2;
    }
  }

  return score;
};

const hasExplicitResourceCue = (text = "") => {
  const folded = toFolded(text);
  if (!folded) return false;

  return RESOURCE_REQUEST_PATTERNS.some((pattern) =>
    folded.includes(toFolded(pattern))
  );
};

const FOREIGN_REGIONS = ["cyprus", "greece", "dubai", "georgia"];
const isForeignRegion = (lead = {}) =>
  FOREIGN_REGIONS.includes(String(lead.preferredArea || "").trim());

const buildImplicitTopicText = ({ pageContext = {}, lead = {} } = {}) =>
  [
    !isForeignRegion(lead) && pageContext.pageType === "citizenship" ? "citizenship laws" : "",
    !isForeignRegion(lead) &&
    (lead.purpose === "citizenship" || lead.citizenshipInterest === true)
      ? "citizenship laws"
      : "",
    (lead.paymentPlan === "installment" || lead.paymentPlan === "flexible")
      ? "payment plan guide"
      : "",
    lead.purpose === "investment" || lead.purpose === "rental_income"
      ? "investment guide"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

export const resolveRelevantBlogTopics = ({
  latestUserMessage = "",
  pageContext = {},
  lead = {},
  explicitOnly = false,
} = {}) => {
  const explicitTopicText = hasExplicitResourceCue(latestUserMessage)
    ? toFolded(latestUserMessage)
    : "";
  const implicitTopicText = explicitOnly
    ? ""
    : toFolded(buildImplicitTopicText({ pageContext, lead }));
  const topicText = [explicitTopicText, implicitTopicText].filter(Boolean).join(" ");

  if (!topicText) return [];

  const matched = TOPIC_RULES.filter((rule) =>
    rule.patterns.some((pattern) => topicText.includes(toFolded(pattern)))
  );
  if (isForeignRegion(lead)) {
    return matched.filter((rule) => rule.id !== "citizenship_laws");
  }
  return matched;
};

export const getRelevantBlogResources = async ({
  latestUserMessage = "",
  pageContext = {},
  lead = {},
  locale = "en",
  limit = 3,
  explicitOnly = false,
} = {}) => {
  const topics = resolveRelevantBlogTopics({
    latestUserMessage,
    pageContext,
    lead,
    explicitOnly,
  }).slice(0, 2);
  if (topics.length === 0) return [];

  const merged = new Map();
  const upsertMatch = (resource = {}, matchScore = 0) => {
    if (!resource.id || !resource.url || matchScore < 3) return;
    const previous = merged.get(resource.id);
    if (!previous || matchScore > previous.matchScore) {
      merged.set(resource.id, {
        ...resource,
        matchScore,
      });
    }
  };

  const batches = await Promise.all(
    topics.map(async (topic) => ({
      topic,
      items: await searchBlogs(
        {
          query: topic.keywords.join(" "),
          keywords: topic.keywords,
          limit: Math.max(12, limit * 6),
        },
        locale
      ).catch(() => []),
    }))
  );

  for (const batch of batches) {
    for (const item of Array.isArray(batch?.items) ? batch.items : []) {
      const matchScore = getTopicMatchScore(item, batch.topic);
      upsertMatch(normalizeResource(item), matchScore);
    }
  }

  if (merged.size < limit) {
    const fallbackItems = await getRecentPublishedBlogs(locale, Math.max(80, limit * 24)).catch(
      () => []
    );
    for (const topic of topics) {
      for (const item of fallbackItems) {
        const matchScore = getTopicMatchScore(item, topic);
        upsertMatch(item, matchScore);
      }
    }
  }

  return Array.from(merged.values())
    .sort((left, right) => {
      if (right.matchScore !== left.matchScore) {
        return right.matchScore - left.matchScore;
      }
      return safeText(right.published_at).localeCompare(safeText(left.published_at));
    })
    .slice(0, limit)
    .map(({ matchScore, ...resource }) => resource);
};

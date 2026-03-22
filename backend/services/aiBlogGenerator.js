import OpenAI from "openai";

// Lazy initialization of OpenAI client
let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set in environment variables. Please add it to your .env file.");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate a comprehensive real estate blog article with SEO optimization in English and Turkish
 * @param {Object} marketData - Real estate market data
 * @param {string} marketData.city - City name (optional)
 * @param {string} marketData.district - District name (optional)
 * @param {string} marketData.neighborhood - Neighborhood name (optional)
 * @param {number} marketData.avgSalePrice - Average sale price per m²
 * @param {number} marketData.avgRentalPrice - Average rental price
 * @param {Object} marketData.priceIndex - Housing price index
 * @param {number} marketData.priceIndex.monthlyChange - Monthly percentage change
 * @param {number} marketData.priceIndex.yearlyChange - Yearly percentage change
 * @param {string} marketData.demandLevel - Demand level (low/medium/high)
 * @param {Array<string>} marketData.newsHeadlines - Recent news headlines (optional)
 * @returns {Promise<Object>} Generated blog article with SEO data in both languages
 */
export async function generateRealEstateBlog(marketData = {}) {
  const {
    city,
    district,
    neighborhood,
    avgSalePrice,
    avgRentalPrice,
    priceIndex,
    demandLevel,
    newsHeadlines = [],
  } = marketData;

  // Construct the location string
  const locationParts = [neighborhood, district, city].filter(Boolean);
  const location = locationParts.length > 0 ? locationParts.join(", ") : "Turkey (general market)";

  // Build the prompt for bilingual content (English and Turkish)
  const systemPrompt = `You are a professional SEO content engine and real estate market analyst.

Your task:
Generate a fully automated, SEO-optimized blog article about Turkish real estate in BOTH English and Turkish languages.

Context:
- Website built with React
- Content is automatically published
- Articles must be SEO-optimized, human-like, and trustworthy
- Target audience: Property buyers, investors, and renters in Turkey

Article requirements:
- Length: 1200-1800 words per language
- Tone: Professional, clear, trustworthy
- No emojis
- Avoid AI-sounding phrases
- Write naturally for humans

SEO structure:
- SEO title (max 60 characters)
- URL slug (kebab-case, English)
- Meta description (max 160 characters)
- H2 and H3 headings
- Internal linking suggestions
- FAQ section (for rich results)
- Conclusion with CTA

Content sections (must include):
1. Introduction about the area or market
2. Price trend analysis (monthly and yearly)
3. Investment analysis (ROI, rental yield)
4. Best neighborhoods to buy property
5. Buying vs renting comparison
6. Legal or market tips (Turkey specific)
7. FAQ (5 questions)

IMPORTANT: 
- Return ONLY pure JSON
- No additional explanation before or after JSON
- JSON format must be valid
- Generate content in BOTH English AND Turkish`;

  const userPrompt = `Input data:
- Location: ${location}
- Average sale price per m²: ${avgSalePrice ? `${avgSalePrice.toLocaleString()} TRY` : "Not available"}
- Average rental price: ${avgRentalPrice ? `${avgRentalPrice.toLocaleString()} TRY` : "Not available"}
- Monthly price index change: ${priceIndex?.monthlyChange ? `${priceIndex.monthlyChange}%` : "Not available"}
- Yearly price index change: ${priceIndex?.yearlyChange ? `${priceIndex.yearlyChange}%` : "Not available"}
- Demand level: ${demandLevel || "medium"}
${newsHeadlines.length > 0 ? `- Recent news:\n${newsHeadlines.map(h => `  • ${h}`).join('\n')}` : ''}

Please generate a comprehensive blog article in BOTH English AND Turkish.

Return the response as JSON with the following structure:

{
  "title_en": "English article title (max 60 characters)",
  "title_tr": "Turkish article title (max 60 characters)",
  "slug": "url-slug-in-english-kebab-case",
  "metaDescription_en": "English meta description (max 160 characters)",
  "metaDescription_tr": "Turkish meta description (max 160 characters)",
  "category_en": "Category in English (e.g., Market Analysis, Buying Guide, Investment)",
  "category_tr": "Category in Turkish (e.g., Piyasa Analizi, Satın Alma Rehberi, Yatırım)",
  "summary_en": "English article summary (2-3 sentences)",
  "summary_tr": "Turkish article summary (2-3 sentences)",
  "content_en": "Full English article with headings (use HTML for h2, h3, p, ul, li, strong)",
  "content_tr": "Full Turkish article with headings (use HTML for h2, h3, p, ul, li, strong)",
  "faq_en": [
    {
      "question": "First question in English?",
      "answer": "Answer to first question in English"
    }
  ],
  "faq_tr": [
    {
      "question": "Turkish first question?",
      "answer": "Answer to first question in Turkish"
    }
  ],
  "internalLinks": [
    "Internal link suggestion 1",
    "Internal link suggestion 2",
    "Internal link suggestion 3"
  ]
}

Important notes:
- Use HTML tags for content formatting
- Use h2 for main headings and h3 for subheadings
- Article must be at least 1200 words per language
- At least 5 FAQ questions per language
- Professional and data-driven analysis
- Simple language understandable by general audience
- Turkish content should use proper Turkish characters (ş, ğ, ı, ö, ü, ç)`;

  try {
    const openai = getOpenAIClient();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o", // or "gpt-3.5-turbo" for faster/cheaper generation
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });

    const generatedContent = completion.choices[0].message.content;
    const parsedContent = JSON.parse(generatedContent);

    return {
      success: true,
      data: {
        // English content
        title: parsedContent.title_en,
        title_en: parsedContent.title_en,
        title_tr: parsedContent.title_tr,
        slug: parsedContent.slug,
        metaDescription: parsedContent.metaDescription_en,
        metaDescription_en: parsedContent.metaDescription_en,
        metaDescription_tr: parsedContent.metaDescription_tr,
        category: parsedContent.category_en,
        category_en: parsedContent.category_en,
        category_tr: parsedContent.category_tr,
        summary: parsedContent.summary_en,
        summary_en: parsedContent.summary_en,
        summary_tr: parsedContent.summary_tr,
        content: parsedContent.content_en,
        content_en: parsedContent.content_en,
        content_tr: parsedContent.content_tr,
        faqSection: parsedContent.faq_en,
        faqSection_en: parsedContent.faq_en,
        faqSection_tr: parsedContent.faq_tr,
        internalLinks: parsedContent.internalLinks || [],
        marketData: marketData, // Store the input data
      },
    };
  } catch (error) {
    console.error("Error generating blog with AI:", error);
    throw new Error(`AI blog generation failed: ${error.message}`);
  }
}

/**
 * Generate multiple blog articles for different locations
 * @param {Array<Object>} marketDataArray - Array of market data objects
 * @returns {Promise<Array<Object>>} Array of generated articles
 */
export async function generateMultipleBlogs(marketDataArray) {
  const results = [];
  
  for (const marketData of marketDataArray) {
    try {
      const result = await generateRealEstateBlog(marketData);
      results.push(result);
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      results.push({
        success: false,
        error: error.message,
        marketData,
      });
    }
  }
  
  return results;
}

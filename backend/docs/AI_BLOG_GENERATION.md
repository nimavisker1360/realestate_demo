# AI Blog Generation System Documentation

## Overview

This system automatically generates SEO-optimized real estate blog articles in Persian (Farsi) using OpenAI's GPT-4. The blogs are tailored for Turkey's real estate market, particularly Istanbul, and are designed for property buyers, investors, and renters.

## Features

### Automated Content Generation
- **1200-1800 words** comprehensive articles
- Professional, clear, and trustworthy tone
- Natural human-like writing (no AI-sounding phrases)
- No emojis (professional content)

### SEO Optimization
- SEO-friendly title (max 60 characters)
- URL slug (kebab-case, English)
- Meta description (max 160 characters)
- Structured H2 and H3 headings
- Internal linking suggestions
- FAQ section (5 questions for rich results)
- Conclusion with CTA

### Content Sections
Each generated article includes:
1. Introduction to the area or market
2. Price trend analysis (monthly & yearly)
3. Investment analysis (ROI, rental yield)
4. Best neighborhoods for buying property
5. Buying vs renting comparison
6. Legal or market notes (Turkey-specific)
7. FAQ (5 questions)

## Setup Instructions

### 1. Install Dependencies

The OpenAI package is already installed. If you need to reinstall:

```bash
cd backend
npm install openai
```

### 2. Configure OpenAI API Key

Add your OpenAI API key to the `.env` file in the backend directory:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

**How to get an API key:**
1. Go to https://platform.openai.com/
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new secret key
5. Copy and paste it to your `.env` file

⚠️ **Important:** Keep your API key secure and never commit it to version control.

### 3. Database Schema

The schema has been updated with the following new fields:
- `slug` - SEO-friendly URL slug (unique)
- `metaDescription` - Meta description for SEO
- `faqSection` - JSON array of FAQ items
- `internalLinks` - Array of suggested internal links
- `marketData` - JSON object storing input market data

The database schema is already migrated. No action needed.

## Usage Guide

### Admin Panel Interface

1. **Navigate to Admin Panel**
   - Log in as an admin user
   - Click on "Admin Panel" in the menu
   - Select the "Blogs" tab

2. **Generate AI Blog**
   - Click the "🤖 Generate with AI" button
   - Fill in the market data form:

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| **City (شهر)** | City name | İstanbul |
| **District (منطقه)** | District/region name | Kadıköy |

### Optional Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Neighborhood (محله)** | Specific neighborhood | Moda |
| **Avg Sale Price per m²** | Average sale price per square meter (تومان) | 85000 |
| **Avg Rental Price** | Average monthly rental price (تومان) | 15000 |
| **Monthly Change (%)** | Monthly price index change | 2.5 |
| **Yearly Change (%)** | Yearly price index change | 25.3 |
| **Demand Level** | Market demand level | low / medium / high |
| **Auto Publish** | Publish immediately after generation | Toggle on/off |

### Example Data Input

**Basic Example:**
```
City: İstanbul
District: Beşiktaş
```

**Complete Example:**
```
City: İstanbul
District: Kadıköy
Neighborhood: Moda
Avg Sale Price per m²: 85000
Avg Rental Price: 15000
Monthly Change (%): 2.5
Yearly Change (%): 25.3
Demand Level: بالا (high)
Auto Publish: ✓
```

## API Endpoints

### Generate Single Blog

**Endpoint:** `POST /api/blog/generate-ai`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "marketData": {
    "city": "İstanbul",
    "district": "Kadıköy",
    "neighborhood": "Moda",
    "avgSalePrice": 85000,
    "avgRentalPrice": 15000,
    "priceIndex": {
      "monthlyChange": 2.5,
      "yearlyChange": 25.3
    },
    "demandLevel": "بالا",
    "newsHeadlines": [
      "قیمت مسکن در استانبول افزایش یافت",
      "تقاضا برای خرید ملک در کادیکوی بالاست"
    ]
  },
  "autoPublish": false
}
```

**Response:**
```json
{
  "message": "AI blog generated and saved successfully",
  "blog": {
    "id": "...",
    "title": "تحلیل بازار املاک کادیکوی استانبول",
    "slug": "kadikoy-istanbul-real-estate-analysis",
    "metaDescription": "تحلیل جامع بازار املاک کادیکوی استانبول",
    "category": "تحلیل بازار",
    "content": "...",
    "summary": "...",
    "faqSection": [...],
    "internalLinks": [...],
    "published": false,
    "createdAt": "2024-01-22T..."
  }
}
```

### Generate Multiple Blogs

**Endpoint:** `POST /api/blog/generate-ai-multiple`

**Request Body:**
```json
{
  "marketDataArray": [
    {
      "city": "İstanbul",
      "district": "Kadıköy"
    },
    {
      "city": "İstanbul",
      "district": "Beşiktaş"
    },
    {
      "city": "Ankara",
      "district": "Çankaya"
    }
  ],
  "autoPublish": false
}
```

**Response:**
```json
{
  "message": "Generated 3 blog(s) successfully",
  "createdBlogs": [...],
  "errors": []
}
```

## Generated Blog Structure

### Database Fields

```javascript
{
  id: "ObjectId",
  title: "عنوان مقاله",
  slug: "article-url-slug",
  category: "تحلیل بازار",
  content: "<h2>...</h2><p>...</p>", // HTML formatted
  summary: "خلاصه مقاله",
  metaDescription: "توضیحات متا",
  faqSection: [
    {
      question: "سوال اول؟",
      answer: "پاسخ سوال اول"
    }
  ],
  internalLinks: [
    "لینک داخلی 1",
    "لینک داخلی 2"
  ],
  marketData: {
    city: "İstanbul",
    district: "Kadıköy",
    // ... other input data
  },
  image: "",
  published: false,
  order: 1,
  createdAt: "2024-01-22T...",
  updatedAt: "2024-01-22T..."
}
```

## AI Prompt Engineering

The system uses a carefully crafted prompt that:
- Acts as a senior SEO content engine and real estate analyst
- Ensures professional, trustworthy tone
- Avoids AI-sounding phrases and emojis
- Generates content in Persian (Farsi)
- Follows Turkish real estate market context
- Includes all required SEO elements

### Content Quality Guidelines

The AI is instructed to:
1. Analyze data like a real estate analyst
2. Detect trends (price growth, rental demand, investment potential)
3. Write naturally for humans, not search engines
4. Provide actionable insights
5. Include Turkey-specific legal and market notes

## Performance & Cost

### Generation Time
- Single blog: ~30-60 seconds
- Multiple blogs: Add 1 second delay between each

### OpenAI API Cost (Approximate)
- Model: GPT-4o
- Tokens per blog: ~3000-4000
- Cost per blog: ~$0.02-0.04 USD
- 100 blogs: ~$2-4 USD

### Rate Limiting
The system includes automatic delays to avoid rate limiting when generating multiple blogs.

## Troubleshooting

### Common Errors

**1. Missing API Key**
```
Error: AI blog generation failed: API key not found
```
**Solution:** Add `OPENAI_API_KEY` to your `.env` file.

**2. Rate Limit Exceeded**
```
Error: Rate limit exceeded
```
**Solution:** Wait a few minutes or upgrade your OpenAI plan.

**3. Invalid Market Data**
```
Error: Market data with city and district is required
```
**Solution:** Ensure city and district fields are provided.

**4. Duplicate Slug**
```
Error: Slug already exists
```
**Solution:** The system automatically handles this by appending numbers. If error persists, check database.

## Frontend Display

### Blog Post Page

The `BlogPost.jsx` component automatically displays:
- SEO meta tags (title, description)
- Main content with HTML formatting
- FAQ section with collapsible details
- Internal links suggestions
- Professional styling

### Features
- Responsive design
- RTL support for Persian text
- Collapsible FAQ with smooth animations
- Related articles section

## Best Practices

### Data Quality
1. **Always provide city and district** - These are essential for context
2. **Include price data when available** - Improves analysis quality
3. **Add neighborhood for hyperlocal content** - More specific and valuable
4. **Use recent data** - Ensure market data is current

### Content Management
1. **Review before publishing** - Always review AI-generated content
2. **Add images** - Upload relevant property images after generation
3. **Edit if needed** - AI is a starting point, customize as needed
4. **Monitor performance** - Track which blog topics perform best

### SEO Strategy
1. **Publish regularly** - Consistent content schedule
2. **Target different areas** - Cover various districts and neighborhoods
3. **Update old blogs** - Refresh data and republish
4. **Internal linking** - Implement suggested internal links

## Future Enhancements

Potential improvements:
- [ ] Batch generation from CSV/Excel file
- [ ] Scheduled automatic generation
- [ ] Multi-language support (Turkish, English)
- [ ] Integration with real estate APIs for real-time data
- [ ] Image generation using DALL-E
- [ ] A/B testing for different content styles
- [ ] Analytics integration

## Security Considerations

1. **API Key Protection**
   - Never expose API key in frontend
   - Use environment variables
   - Rotate keys periodically

2. **Access Control**
   - Only admins can generate blogs
   - JWT authentication required
   - Rate limiting on endpoints

3. **Content Validation**
   - Review generated content before publishing
   - Monitor for inappropriate content
   - Implement content filters if needed

## Support & Contact

For issues or questions:
1. Check troubleshooting section
2. Review OpenAI API documentation
3. Check application logs in backend console
4. Contact development team

---

**Last Updated:** January 22, 2026
**Version:** 1.0.0

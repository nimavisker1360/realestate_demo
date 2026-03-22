import {
  AI_AGENT_DEFAULT_LOCALE,
  normalizeAiLocale,
} from "../../constants/aiSalesAgent.js";

const copy = {
  en: {
    greetings: {
      home: "I can help you shortlist projects by budget, area, payment plan, and citizenship fit.",
      listing:
        "Tell me your budget, area, or room type and I will narrow the best matches quickly.",
      property_detail:
        "If you are evaluating this property, I can compare it with similar options and prepare a consultant handoff.",
      project_detail:
        "I can qualify your requirements around this project and suggest the strongest alternatives if needed.",
      citizenship:
        "I can focus on citizenship-oriented options, budget fit, and the fastest next step with a consultant.",
      investment:
        "I can focus on investment-friendly projects, payment plans, and shortlist options aligned with your budget.",
      contact:
        "If you want, I can fast-track this into a consultation request with the right consultant.",
      default:
        "I can help with project discovery, qualification, recommendations, and consultant handoff.",
    },
    questions: {
      purpose: "What is your main goal: investment, living, citizenship, or rental income?",
      preferred_area: "Which region do you prefer: Istanbul (Asian/European side), Cyprus, Greece, Dubai, or Georgia?",
      budget: "What budget range are you targeting, and in which currency?",
      location: "Which city, area, or project are you most interested in?",
      property_type: "Which property type do you prefer: apartment, villa, office, commercial, townhouse, penthouse, or land?",
      room_type: "If relevant, what room type do you want: 1+1, 2+1, 3+1, or another layout?",
      payment_plan: "Do you prefer cash, installment, or flexible payment?",
      down_payment: "How much would you be comfortable paying upfront?",
      delivery_status: "Do you want a ready property or an off-plan opportunity?",
      citizenship_need: "Is Turkish citizenship a priority for this purchase?",
      buyer_profile: "Who will be living in the property?",
      amenities: "What matters most to you in the project? Pick up to 3.",
      timeline: "How soon are you planning to move forward?",
      fallback_preference: "Would you like to see nearby options or projects slightly above budget?",
      lead_intent: "Where should we send the full details?",
      contact: "What is the best way to reach you: WhatsApp, phone, or email?",
      contact_details:
        "Share your name and email so we can send your curated shortlist and details.",
      name: "What name should I use for your shortlist and consultant handoff?",
      consultation_mode: "Would you like an in-person visit or an online consultation?",
      citizenship: "Is Turkish citizenship part of your target, yes or no?",
      nationality: "What nationality should I note for the consultant handoff?",
      resource_offer:
        "I can also send a related guide after your shortlist is ready. Would you like that?",
    },
    leadCaptureNudge:
      "If you want, I can send a curated shortlist and arrange a consultant follow-up.",
    recommendationIntro:
      "Based on what you shared, these are the strongest current matches in the inventory:",
    aboveBudgetNote:
      "Prices in this range were not found; higher prices are being suggested.",
    noFilesInRegion:
      "No properties are currently available in this region. Turkey and Istanbul options are available—would you like to see those?",
    recommendationFallback: {
      same_city_budget_fallback:
        "I do not have an exact match in your requested area within this budget, so I am showing the closest options in the same city.",
      above_budget_area_fallback:
        "I do not have an exact match in your requested area within this budget, so I am showing the closest area matches, including options slightly above budget.",
      broad_area_fallback:
        "I do not have an exact area-and-budget match in the current inventory, so I am showing the closest grounded alternatives.",
    },
    handoff:
      "You are close to a qualified handoff. Share your best contact detail and I will prepare the summary.",
    handoffReady:
      "Perfect. I have the key details. Share your name and email below and I will send the details right away.",
    resourceOfferByTopic: {
      citizenship_laws:
        "I can also send a related guide about Turkish citizenship and legal steps. Would you like me to send it?",
      tax_guide:
        "I can also send a guide about taxes, title deed costs, and key legal fees. Would you like me to send it?",
      investment_guide:
        "I can also send a related investment guide and market article. Would you like me to send it?",
      payment_plan_guide:
        "I can also send a guide about installment plans and payment structure. Would you like me to send it?",
      default:
        "I can also send a related guide about this topic. Would you like me to send it?",
    },
    resourceShareIntro: "I added the related guides below.",
    cta: {
      primary: "Request consultation",
      secondary: "Send details to my email",
    },
    quickReplies: {
      start: [
        {
          id: "turkey",
          label: "Turkey",
          children: [
            { id: "find_property", label: "Find me a property", message: "Find me a property" },
            {
              id: "investment_projects",
              label: "Best projects for investment",
              message: "Show me the best projects for investment",
            },
            { id: "european_side", label: "Istanbul European", message: "I want properties on the European side of Istanbul" },
            { id: "asian_side", label: "Istanbul Asian", message: "I want properties on the Asian side of Istanbul" },
            {
              id: "citizenship",
              label: "Turkish citizenship options",
              message: "Show me Turkish citizenship options",
            },
            {
              id: "installment",
              label: "Installment projects",
              message: "I want installment payment projects",
            },
            {
              id: "consultation",
              label: "Book consultation",
              message: "I want to book a consultation",
            },
          ],
        },
        { id: "cyprus", label: "Cyprus", message: "I want properties in Cyprus" },
        { id: "greece", label: "Greece", message: "I want properties in Greece" },
        { id: "dubai", label: "Dubai", message: "I want properties in Dubai" },
        { id: "georgia", label: "Georgia", message: "I want properties in Georgia" },
      ],
      purpose: [
        { id: "investment", label: "Investment", message: "For investment" },
        { id: "living", label: "Living", message: "For living" },
        { id: "citizenship", label: "Citizenship", message: "For citizenship" },
        { id: "rental_income", label: "Rental income", message: "For rental income" },
      ],
      preferred_area: [
        { id: "european_side", label: "Istanbul European", message: "European side" },
        { id: "asian_side", label: "Istanbul Asian", message: "Asian side" },
        { id: "cyprus", label: "Cyprus", message: "Cyprus" },
        { id: "greece", label: "Greece", message: "Greece" },
        { id: "dubai", label: "Dubai", message: "Dubai" },
        { id: "georgia", label: "Georgia", message: "Georgia" },
        { id: "central_istanbul", label: "Central Istanbul", message: "Central Istanbul" },
        { id: "near_metro", label: "Near metro", message: "Near metro" },
        { id: "no_preference", label: "No preference", message: "No area preference" },
      ],
      property_type: [
        { id: "apartment", label: "Apartment", message: "Apartment" },
        { id: "villa", label: "Villa", message: "Villa" },
        { id: "office", label: "Office", message: "Office" },
        { id: "commercial", label: "Commercial", message: "Commercial" },
        { id: "townhouse", label: "Townhouse", message: "Townhouse" },
        { id: "penthouse", label: "Penthouse", message: "Penthouse" },
        { id: "land", label: "Land", message: "Land" },
      ],
      payment_plan: [
        { id: "cash", label: "Cash", message: "Cash payment" },
        { id: "installment", label: "Installment", message: "Installment payment" },
        { id: "flexible", label: "Flexible", message: "Flexible payment" },
      ],
      down_payment: [
        { id: "dp_20", label: "20%", message: "20% down payment" },
        { id: "dp_30", label: "30%", message: "30% down payment" },
        { id: "dp_50", label: "50%+", message: "50%+ down payment" },
        { id: "dp_guidance", label: "Need guidance", message: "Need guidance on down payment" },
      ],
      delivery_status: [
        { id: "ready", label: "Ready to move", message: "Ready to move in" },
        { id: "under_construction", label: "Under construction", message: "Under construction is fine" },
        { id: "no_preference", label: "No preference", message: "No preference on delivery" },
      ],
      citizenship_need: [
        { id: "yes", label: "Yes", message: "Yes, citizenship is important" },
        { id: "no", label: "No", message: "No, not for citizenship" },
        { id: "maybe", label: "Maybe", message: "Maybe, open to citizenship" },
      ],
      buyer_profile: [
        { id: "single", label: "Single", message: "Single" },
        { id: "couple", label: "Couple", message: "Couple" },
        { id: "family", label: "Family with children", message: "Family with children" },
        { id: "large_family", label: "Large family", message: "Large family" },
      ],
      amenities: [
        { id: "near_metro", label: "Near metro", message: "Near metro" },
        { id: "parking", label: "Parking", message: "Parking" },
        { id: "security", label: "Security", message: "Security" },
        { id: "family_concept", label: "Family concept", message: "Family concept" },
        { id: "pool_gym", label: "Pool / gym", message: "Pool and gym" },
        { id: "sea_view", label: "Sea view", message: "Sea view" },
        { id: "title_deed_ready", label: "Title deed ready", message: "Title deed ready" },
      ],
      room_type: [
        { id: "1_1", label: "1+1", message: "1+1" },
        { id: "2_1", label: "2+1", message: "2+1" },
        { id: "3_1", label: "3+1", message: "3+1" },
        { id: "4_1", label: "4+1", message: "4+1" },
      ],
      timeline: [
        { id: "researching", label: "Just researching", message: "Just researching for now" },
        { id: "immediate", label: "Immediate", message: "Immediate purchase" },
        { id: "month_1", label: "Within 1 month", message: "Within 1 month" },
        { id: "month_3", label: "Within 3 months", message: "Within 3 months" },
        { id: "month_6", label: "6+ months", message: "After 6 months" },
      ],
      fallback_preference: [
        { id: "above_budget", label: "Slightly above budget", message: "Show slightly above budget" },
        { id: "nearby_areas", label: "Nearby areas", message: "Show nearby areas" },
        { id: "both", label: "Both", message: "Show both above budget and nearby" },
        { id: "keep_exact", label: "No, keep exact filters", message: "Keep exact filters only" },
      ],
      lead_intent: [
        { id: "price_list", label: "Get full price list", message: "Send me the full price list" },
        { id: "payment_plan", label: "Get payment plan", message: "Send me the payment plan" },
        { id: "consultation", label: "Request consultation", message: "I want a consultation" },
        { id: "send_details", label: "Send details to my email", message: "Send all details to my email" },
      ],
      preferred_language: [
        { id: "en", label: "English", message: "English" },
        { id: "tr", label: "Turkish", message: "Turkish" },
        { id: "ru", label: "Russian", message: "Russian" },
        { id: "ar", label: "Arabic", message: "Arabic" },
      ],
      contact_method: [
        { id: "whatsapp", label: "WhatsApp", message: "WhatsApp" },
        { id: "phone", label: "Phone", message: "Phone call" },
        { id: "email", label: "Email", message: "Email" },
      ],
      consultation_mode: [
        { id: "visit", label: "Visit", message: "I want a property visit" },
        {
          id: "online",
          label: "Online consultation",
          message: "I prefer an online consultation",
        },
      ],
      citizenship: [
        { id: "yes", label: "Yes", message: "Yes, citizenship matters" },
        { id: "no", label: "No", message: "No, not for citizenship" },
      ],
      resource_offer: [
        { id: "guide_yes", label: "Yes, send it", message: "Yes, send the guide" },
        { id: "guide_no", label: "No, thanks", message: "No, no guide" },
      ],
    },
  },
  tr: {
    greetings: {
      home:
        "Butce, bolge, odeme plani ve vatandaslik hedefinize gore uygun projeleri hizlica daraltabilirim.",
      listing:
        "Butcenizi, bolgenizi veya oda tipinizi yazin; en uygun secenekleri hizlica filtreleyeyim.",
      property_detail:
        "Bu ilani degerlendiriyorsaniz benzer secenekleri kiyaslayip danisman aktarimi hazirlayabilirim.",
      project_detail:
        "Bu proje etrafinda ihtiyacinizi netlestirip gerekirse en guclu alternatifleri de gosterebilirim.",
      citizenship:
        "Vatandaslik odakli secenekleri, butce uyumunu ve en hizli sonraki adimi birlikte netlestirebiliriz.",
      investment:
        "Yatirima uygun projeler, odeme planlari ve butcenize uygun kisa liste hazirlayabilirim.",
      contact:
        "Isterseniz bunu dogrudan uygun bir danismanla gorusme talebine cevirebilirim.",
      default:
        "Proje arama, ihtiyac analizi, oneriler ve danisman yonlendirmesi konusunda yardimci olabilirim.",
    },
    questions: {
      purpose:
        "Ana hedefiniz nedir: yatirim, oturum, vatandaslik veya kira getirisi?",
      preferred_area: "Hangi bolgeyi tercih ediyorsunuz: Istanbul (Anadolu/Avrupa), Kibris, Yunanistan, Dubai veya Gurcistan?",
      budget: "Hedef butceniz nedir ve hangi para biriminde dusunuyorsunuz?",
      location: "Hangi sehir, bolge veya proje ile ilgileniyorsunuz?",
      property_type:
        "Hangi gayrimenkul tipini tercih ediyorsunuz: daire, villa, ofis, ticari, townhouse, penthouse veya arsa?",
      room_type: "Uygunsa hangi oda tipini istiyorsunuz: 1+1, 2+1, 3+1 veya baska bir plan?",
      payment_plan: "Pesin, taksitli mi yoksa esnek odeme mi dusunuyorsunuz?",
      down_payment: "Pesinat olarak ne kadar odemeyi dusunuyorsunuz?",
      delivery_status: "Teslime hazir bir mulk mu yoksa insaat halinde bir proje mi tercih edersiniz?",
      citizenship_need: "Bu satin alimda Turk vatandasligi once likli mi?",
      buyer_profile: "Mulkte kim yasayacak?",
      amenities: "Projede sizin icin en onemli ozellikler neler? En fazla 3 secin.",
      timeline:
        "Ne zaman ilerlemek istiyorsunuz?",
      fallback_preference: "Butce ustunde veya yakin bolgelerdeki secenekleri gormek ister misiniz?",
      lead_intent: "Detaylari nereye gonderelim?",
      contact: "Size en rahat nasil ulasalim: WhatsApp, telefon veya e-posta?",
      contact_details:
        "Kisa listeyi ve detaylari gonderebilmem icin adinizi ve e-posta adresinizi paylasin.",
      name: "Kisa liste ve danisman aktarimi icin hangi ismi kullanayim?",
      consultation_mode: "Yuz yuze ziyaret mi, online gorusme mi istersiniz?",
      citizenship: "Turk vatandasligi hedefiniz var mi, evet mi hayir mi?",
      nationality: "Danisman aktarimi icin hangi uyrugu not etmemi istersiniz?",
      resource_offer:
        "Kisa listeniz hazir olduktan sonra ilgili bir rehber de gonderebilirim. Ister misiniz?",
    },
    leadCaptureNudge:
      "Isterseniz size uygun bir kisa liste hazirlayip danisman geri donusu organize edebilirim.",
    recommendationIntro:
      "Paylastiginiz bilgilere gore mevcut portfoyde en guclu eslesmeler bunlar:",
    aboveBudgetNote:
      "Bu fiyat araliginda mulk bulunamadi; daha yuksek fiyatlar oneriliyor.",
    noFilesInRegion:
      "Bu bolgede su anda hicbir mulk mevcut degil. Turkiye ve Istanbul secenekleri mevcut—bunlari gormek ister misiniz?",
    recommendationFallback: {
      same_city_budget_fallback:
        "Istediginiz bolgede bu butceyle tam eslesme yok, bu nedenle ayni sehirdeki en yakin secenekleri gosteriyorum.",
      above_budget_area_fallback:
        "Istediginiz bolgede bu butceyle tam eslesme yok, bu nedenle bolgeye en yakin ve bir kismi butcenin biraz ustunde kalan secenekleri gosteriyorum.",
      broad_area_fallback:
        "Mevcut portfoyde bu bolge ve butce icin tam eslesme yok; bu nedenle en yakin dogrulanmis alternatifleri gosteriyorum.",
    },
    handoff:
      "Nitelikli bir aktarima yaklastiniz. En iyi iletisim bilginizi paylasin, ozeti hazirlayayim.",
    handoffReady:
      "Harika. Temel bilgileri aldim. Adinizi ve e-posta adresinizi paylasin, detaylari hemen gondereyim.",
    resourceOfferByTopic: {
      citizenship_laws:
        "Turk vatandasligi ve hukuki surec hakkinda ilgili bir rehber de gonderebilirim. Gondereyim mi?",
      tax_guide:
        "Vergiler, tapu masraflari ve temel hukuki kalemler hakkinda bir rehber de gonderebilirim. Gondereyim mi?",
      investment_guide:
        "Yatirim ve piyasa gorunumuyle ilgili bir rehber de gonderebilirim. Gondereyim mi?",
      payment_plan_guide:
        "Taksit secenekleri ve odeme yapisi hakkinda bir rehber de gonderebilirim. Gondereyim mi?",
      default:
        "Bu konuyla ilgili bir rehber de gonderebilirim. Gondereyim mi?",
    },
    resourceShareIntro: "Ilgili rehberleri asagida ekledim.",
    cta: {
      primary: "Gorusme talebi olustur",
      secondary: "Detaylari e-posta ile gonder",
    },
    quickReplies: {
      start: [
        {
          id: "turkey",
          label: "Turkiye",
          children: [
            { id: "find_property", label: "Bana mulk bul", message: "Bana uygun bir mulk bul" },
            {
              id: "investment_projects",
              label: "Yatirim projeleri",
              message: "Yatirim icin en iyi projeleri goster",
            },
            { id: "european_side", label: "Istanbul Avrupa", message: "Avrupa yakasinda mulk istiyorum" },
            { id: "asian_side", label: "Istanbul Anadolu", message: "Anadolu yakasinda mulk istiyorum" },
            {
              id: "citizenship",
              label: "Vatandaslik secenekleri",
              message: "Turk vatandasligina uygun secenekleri goster",
            },
            {
              id: "installment",
              label: "Taksitli projeler",
              message: "Taksitli odeme olan projeleri istiyorum",
            },
            {
              id: "consultation",
              label: "Gorusme ayarla",
              message: "Danisman gorusmesi ayarlamak istiyorum",
            },
          ],
        },
        { id: "cyprus", label: "Kibris", message: "Kibris'ta mulk istiyorum" },
        { id: "greece", label: "Yunanistan", message: "Yunanistan'da mulk istiyorum" },
        { id: "dubai", label: "Dubai", message: "Dubai'de mulk istiyorum" },
        { id: "georgia", label: "Gurcistan", message: "Gurcistan'da mulk istiyorum" },
      ],
      purpose: [
        { id: "investment", label: "Yatirim", message: "Yatirim icin" },
        { id: "living", label: "Oturum", message: "Oturum icin" },
        { id: "citizenship", label: "Vatandaslik", message: "Vatandaslik icin" },
        { id: "rental_income", label: "Kira getirisi", message: "Kira getirisi icin" },
      ],
      preferred_area: [
        { id: "european_side", label: "Istanbul Avrupa", message: "Avrupa yakasi" },
        { id: "asian_side", label: "Istanbul Anadolu", message: "Anadolu yakasi" },
        { id: "cyprus", label: "Kibris", message: "Kibris" },
        { id: "greece", label: "Yunanistan", message: "Yunanistan" },
        { id: "dubai", label: "Dubai", message: "Dubai" },
        { id: "georgia", label: "Gurcistan", message: "Gurcistan" },
        { id: "central_istanbul", label: "Merkez Istanbul", message: "Merkez Istanbul" },
        { id: "near_metro", label: "Metroya yakin", message: "Metroya yakin" },
        { id: "no_preference", label: "Fark etmez", message: "Bolge tercihi yok" },
      ],
      property_type: [
        { id: "apartment", label: "Daire", message: "Daire" },
        { id: "villa", label: "Villa", message: "Villa" },
        { id: "office", label: "Ofis", message: "Ofis" },
        { id: "commercial", label: "Ticari", message: "Ticari" },
        { id: "townhouse", label: "Townhouse", message: "Townhouse" },
        { id: "penthouse", label: "Penthouse", message: "Penthouse" },
        { id: "land", label: "Arsa", message: "Arsa" },
      ],
      payment_plan: [
        { id: "cash", label: "Pesin", message: "Pesin odeme" },
        { id: "installment", label: "Taksit", message: "Taksitli odeme" },
        { id: "flexible", label: "Esnek", message: "Esnek odeme" },
      ],
      down_payment: [
        { id: "dp_20", label: "%20", message: "%20 pesinat" },
        { id: "dp_30", label: "%30", message: "%30 pesinat" },
        { id: "dp_50", label: "%50+", message: "%50+ pesinat" },
        { id: "dp_guidance", label: "Yonlendirme", message: "Pesinat konusunda yonlendirme istiyorum" },
      ],
      delivery_status: [
        { id: "ready", label: "Teslime hazir", message: "Teslime hazir" },
        { id: "under_construction", label: "Insaat halinde", message: "Insaat halinde olabilir" },
        { id: "no_preference", label: "Fark etmez", message: "Teslim durumu fark etmez" },
      ],
      citizenship_need: [
        { id: "yes", label: "Evet", message: "Evet, vatandaslik onemli" },
        { id: "no", label: "Hayir", message: "Hayir, vatandaslik hedefim yok" },
        { id: "maybe", label: "Belki", message: "Belki, vatandasliga acigim" },
      ],
      buyer_profile: [
        { id: "single", label: "Bekar", message: "Bekar" },
        { id: "couple", label: "Cift", message: "Cift" },
        { id: "family", label: "Cocuklu aile", message: "Cocuklu aile" },
        { id: "large_family", label: "Kalabalik aile", message: "Kalabalik aile" },
      ],
      amenities: [
        { id: "near_metro", label: "Metroya yakin", message: "Metroya yakin" },
        { id: "parking", label: "Otopark", message: "Otopark" },
        { id: "security", label: "Guvenlik", message: "Guvenlik" },
        { id: "family_concept", label: "Aile konsepti", message: "Aile konsepti" },
        { id: "pool_gym", label: "Havuz / spor", message: "Havuz ve spor salonu" },
        { id: "sea_view", label: "Deniz manzarasi", message: "Deniz manzarasi" },
        { id: "title_deed_ready", label: "Tapu hazir", message: "Tapu hazir" },
      ],
      room_type: [
        { id: "1_1", label: "1+1", message: "1+1" },
        { id: "2_1", label: "2+1", message: "2+1" },
        { id: "3_1", label: "3+1", message: "3+1" },
        { id: "4_1", label: "4+1", message: "4+1" },
      ],
      timeline: [
        { id: "researching", label: "Arastiriyorum", message: "Simdilik arastiriyorum" },
        { id: "immediate", label: "Hemen", message: "Hemen almayi dusunuyorum" },
        { id: "month_1", label: "1 ay", message: "1 ay icinde" },
        { id: "month_3", label: "3 ay", message: "3 ay icinde" },
        { id: "month_6", label: "6+ ay", message: "6 aydan sonra" },
      ],
      fallback_preference: [
        { id: "above_budget", label: "Butce ustunde", message: "Butce ustundeki secenekleri goster" },
        { id: "nearby_areas", label: "Yakin bolgeler", message: "Yakin bolgelerdeki secenekleri goster" },
        { id: "both", label: "Ikisi de", message: "Hem butce ustunde hem yakin bolgeleri goster" },
        { id: "keep_exact", label: "Hayir, ayni filtre", message: "Sadece tam filtre ile goster" },
      ],
      lead_intent: [
        { id: "price_list", label: "Fiyat listesi", message: "Fiyat listesini gonder" },
        { id: "payment_plan", label: "Odeme plani", message: "Odeme planini gonder" },
        { id: "consultation", label: "Gorusme talebi", message: "Gorusme istiyorum" },
        { id: "send_details", label: "Detaylari gonder", message: "Tum detaylari gonder" },
      ],
      preferred_language: [
        { id: "en", label: "Ingilizce", message: "Ingilizce" },
        { id: "tr", label: "Turkce", message: "Turkce" },
        { id: "ru", label: "Rusca", message: "Rusca" },
        { id: "ar", label: "Arapca", message: "Arapca" },
      ],
      contact_method: [
        { id: "whatsapp", label: "WhatsApp", message: "WhatsApp" },
        { id: "phone", label: "Telefon", message: "Telefon" },
        { id: "email", label: "E-posta", message: "E-posta" },
      ],
      consultation_mode: [
        { id: "visit", label: "Ziyaret", message: "Yerinde ziyaret istiyorum" },
        { id: "online", label: "Online", message: "Online gorusme istiyorum" },
      ],
      citizenship: [
        { id: "yes", label: "Evet", message: "Evet, vatandaslik onemli" },
        { id: "no", label: "Hayir", message: "Hayir, vatandaslik hedefim yok" },
      ],
      resource_offer: [
        { id: "guide_yes", label: "Evet, gonder", message: "Evet, rehberi gonder" },
        { id: "guide_no", label: "Hayir", message: "Hayir, rehber istemiyorum" },
      ],
    },
  },
  ru: {
    greetings: {
      home:
        "Ya pomogu bystro podobrat proekty po byudzhetu, rayonu, plane platezha i tseleyam po grazhdanstvu.",
      listing:
        "Napishite byudzhet, rayon ili tip planirovki, i ya suzhu podkhodyashchie varianty.",
      property_detail:
        "Esli vy rassmatrivaete etot obekt, ya mogu sravnit ego s analogami i podgotovit peredachu konsultantu.",
      project_detail:
        "Ya mogu utochnit trebovaniya vokrug etogo proekta i pri neobkhodimosti pokazat silnye alternativy.",
      citizenship:
        "Mogu sdelat fokus na variantakh dlya grazhdanstva, sootvetstvii byudzhetu i bystrom sleduyushchem shage.",
      investment:
        "Mogu sdelat fokus na investitsionnykh proektakh, rassrochke i korotkom spiske po vashemu byudzhetu.",
      contact:
        "Esli hotite, ya bystro podgotovlyu zayavku na konsultatsiyu s nuzhnym spetsialistom.",
      default:
        "Ya mogu pomoch s poiskom, kvalifikatsiey potrebsti, rekomendatsiyami i peredachey konsultantu.",
    },
    questions: {
      purpose:
        "Kakaya u vas osnovnaya tsel: investitsiya, dlya prozhivaniya, grazhdanstvo ili arendnyy dokhod?",
      preferred_area: "Kakoy region vy predpochitaete: Stambul (Aziya/Yevropa), Kipr, Gretsiya, Dubay ili Gruziya?",
      budget: "Kakoy u vas byudzhet i v kakoy valyute?",
      location: "Kakoy gorod, rayon ili proekt vas interesuet?",
      property_type:
        "Kakoy tip nedvizhimosti vam nuzhen: kvartira, villa, ofis, kommercheskiy obekt, townhouse, penthouse ili zemlya?",
      room_type:
        "Esli aktualno, kakaya planirovka nuzhna: 1+1, 2+1, 3+1 ili drugaya?",
      payment_plan: "Predpochitaete nalichnyy raschet, rassrochku ili gibkiy plan oplaty?",
      down_payment: "Kakoy pervonachalnyy vznos vas ustraivaet?",
      delivery_status: "Predpochitaete gotovyy obekt ili stroyashchiysya proekt?",
      citizenship_need: "Vazhno li grazhdanstvo Turtsii dlya etoy pokupki?",
      buyer_profile: "Kto budet prozhivat v nedvizhimosti?",
      amenities: "Chto dlya vas vazhno v proekte? Vyberite do 3 prioritetov.",
      timeline:
        "Kogda planiruete dvigatsya dalshe?",
      fallback_preference: "Khotite uvidet varianty nemnogo vyshe byudzheta ili v sosednikh rayonakh?",
      lead_intent: "Kuda otpravit polnye detali?",
      contact: "Kak udobnee svyazatsya s vami: WhatsApp, telefon ili email?",
      contact_details:
        "Ukazhite imya i email, chtoby ya smog otpravit vam podborku i detali.",
      name: "Kakoe imya mne ukazat dlya shortlista i peredachi konsultantu?",
      consultation_mode: "Vam nuzhen lichnyy pokaz ili onlayn-konsultatsiya?",
      citizenship: "Vam vazhno grazhdanstvo Turtsii, da ili net?",
      nationality: "Kakoe grazhdanstvo ukazat dlya peredachi konsultantu?",
      resource_offer:
        "Posle podbora ya takzhe mogu otpravit svyazannyy gid. Otpavit ego vam?",
    },
    leadCaptureNudge:
      "Esli khotite, ya mogu podgotovit kurirovannyy shortlist i organizovat svyaz s konsultantom.",
    recommendationIntro:
      "Iskhodya iz vashego zaprosa, vot samye silnye sovpadeniya v tekushchem inventare:",
    aboveBudgetNote:
      "V etom tsenovom diapazone obekty ne naydeny; predlagayutsya bolee vysokie tseny.",
    noFilesInRegion:
      "V etom regione v nastoyashchee vremya net dostupnykh obektov. Dostupny varianty v Turtsii i Stambule—khotite posmotret?",
    recommendationFallback: {
      same_city_budget_fallback:
        "V nuzhnom rayone net tochnogo sovpadeniya v etom byudzhete, poetomu ya pokazivayu blizhayshie varianty v tom zhe gorode.",
      above_budget_area_fallback:
        "V nuzhnom rayone net tochnogo sovpadeniya v etom byudzhete, poetomu ya pokazivayu samye blizkie varianty po rayonu, vklyuchaya obekty nemnogo vyshe byudzheta.",
      broad_area_fallback:
        "V tekushchem inventare net tochnogo sovpadeniya po rayonu i byudzhetu, poetomu ya pokazivayu blizhayshie proverennye alternativy.",
    },
    handoff:
      "Vy blizki k kvalifitsirovannoy peredache. Ostavte luchshiy kontakt, i ya podgotovlyu rezume.",
    handoffReady:
      "Otlichno. Osnovnye dannye polucheny. Ukazhite imya i email, i ya srazu otpravlyu detali.",
    resourceOfferByTopic: {
      citizenship_laws:
        "Ya takzhe mogu otpravit gid po grazhdanstvu Turtsii i pravovym shagham. Otpavit?",
      tax_guide:
        "Ya takzhe mogu otpravit gid po nalogam, TAPU i osnovnym raskhodam. Otpavit?",
      investment_guide:
        "Ya takzhe mogu otpravit investitsionnyy gid i statyu po rynku. Otpavit?",
      payment_plan_guide:
        "Ya takzhe mogu otpravit gid po rassrochke i skheme oplaty. Otpavit?",
      default:
        "Ya takzhe mogu otpravit svyazannyy gid po etoy teme. Otpavit?",
    },
    resourceShareIntro: "Ya dobavil svyazannye gajdy nizhe.",
    cta: {
      primary: "Zaprosit konsultatsiyu",
      secondary: "Otpravit detali na email",
    },
    quickReplies: {
      start: [
        {
          id: "turkey",
          label: "Turtsiya",
          children: [
            { id: "find_property", label: "Podobrat obekt", message: "Podberite mne obekt" },
            {
              id: "investment_projects",
              label: "Investitsionnye proekty",
              message: "Pokazhite luchshie proekty dlya investitsiy",
            },
            { id: "european_side", label: "Istanbul Evropa", message: "Khochu obekty na evropeyskoy storone" },
            { id: "asian_side", label: "Istanbul Aziya", message: "Khochu obekty na aziatskoy storone" },
            {
              id: "citizenship",
              label: "Varianty dlya grazhdanstva",
              message: "Pokazhite varianty dlya grazhdanstva Turtsii",
            },
            {
              id: "installment",
              label: "Rassrochka",
              message: "Mne interesny proekty s rassrochkoy",
            },
            {
              id: "consultation",
              label: "Konsultatsiya",
              message: "Khochu zabronirovat konsultatsiyu",
            },
          ],
        },
        { id: "cyprus", label: "Kipr", message: "Khochu obekty na Kipre" },
        { id: "greece", label: "Gretsiya", message: "Khochu obekty v Gretsii" },
        { id: "dubai", label: "Dubay", message: "Khochu obekty v Dubae" },
        { id: "georgia", label: "Gruziya", message: "Khochu obekty v Gruzii" },
      ],
      purpose: [
        { id: "investment", label: "Investitsiya", message: "Dlya investitsii" },
        { id: "living", label: "Prozhivanie", message: "Dlya prozhivaniya" },
        { id: "citizenship", label: "Grazhdanstvo", message: "Dlya grazhdanstva" },
        { id: "rental_income", label: "Arendnyy dokhod", message: "Dlya arendnogo dokhoda" },
      ],
      preferred_area: [
        { id: "european_side", label: "Istanbul Evropa", message: "Evropeyskaya storona" },
        { id: "asian_side", label: "Istanbul Aziya", message: "Aziatskaya storona" },
        { id: "cyprus", label: "Kipr", message: "Kipr" },
        { id: "greece", label: "Gretsiya", message: "Gretsiya" },
        { id: "dubai", label: "Dubay", message: "Dubay" },
        { id: "georgia", label: "Gruziya", message: "Gruziya" },
        { id: "central_istanbul", label: "Tsentr Stambula", message: "Tsentr Stambula" },
        { id: "near_metro", label: "Ryadom s metro", message: "Ryadom s metro" },
        { id: "no_preference", label: "Bez predpochteniya", message: "Bez predpochteniya po rayonu" },
      ],
      property_type: [
        { id: "apartment", label: "Kvartira", message: "Kvartira" },
        { id: "villa", label: "Villa", message: "Villa" },
        { id: "office", label: "Ofis", message: "Ofis" },
        { id: "commercial", label: "Kommercheskiy", message: "Kommercheskiy obekt" },
        { id: "townhouse", label: "Townhouse", message: "Townhouse" },
        { id: "penthouse", label: "Penthouse", message: "Penthouse" },
        { id: "land", label: "Zemlya", message: "Zemlya" },
      ],
      payment_plan: [
        { id: "cash", label: "Nalichnye", message: "Nalichnyy raschet" },
        { id: "installment", label: "Rassrochka", message: "Rassrochka" },
        { id: "flexible", label: "Gibkiy", message: "Gibkiy plan oplaty" },
      ],
      down_payment: [
        { id: "dp_20", label: "20%", message: "20% pervonachalnyy vznos" },
        { id: "dp_30", label: "30%", message: "30% pervonachalnyy vznos" },
        { id: "dp_50", label: "50%+", message: "50%+ pervonachalnyy vznos" },
        { id: "dp_guidance", label: "Nuzhna konsultatsiya", message: "Nuzhna konsultatsiya po pervomu vznosu" },
      ],
      delivery_status: [
        { id: "ready", label: "Gotov k vseleniyu", message: "Gotov k vseleniyu" },
        { id: "under_construction", label: "Stroyashchiysya", message: "Stroyashchiysya proekt podoydet" },
        { id: "no_preference", label: "Bez predpochteniya", message: "Status sdachi ne vazhen" },
      ],
      citizenship_need: [
        { id: "yes", label: "Da", message: "Da, grazhdanstvo vazhno" },
        { id: "no", label: "Net", message: "Net, bez grazhdanstva" },
        { id: "maybe", label: "Vozmozhno", message: "Vozmozhno, otkryt k grazhdanstvu" },
      ],
      buyer_profile: [
        { id: "single", label: "Odin", message: "Odin" },
        { id: "couple", label: "Para", message: "Para" },
        { id: "family", label: "Semya s detmi", message: "Semya s detmi" },
        { id: "large_family", label: "Bolshaya semya", message: "Bolshaya semya" },
      ],
      amenities: [
        { id: "near_metro", label: "Ryadom s metro", message: "Ryadom s metro" },
        { id: "parking", label: "Parkovka", message: "Parkovka" },
        { id: "security", label: "Bezopasnost", message: "Bezopasnost" },
        { id: "family_concept", label: "Semeyniy kontsept", message: "Semeyniy kontsept" },
        { id: "pool_gym", label: "Basseyn / sport", message: "Basseyn i sportzal" },
        { id: "sea_view", label: "Vid na more", message: "Vid na more" },
        { id: "title_deed_ready", label: "TAPU gotov", message: "TAPU gotov" },
      ],
      room_type: [
        { id: "1_1", label: "1+1", message: "1+1" },
        { id: "2_1", label: "2+1", message: "2+1" },
        { id: "3_1", label: "3+1", message: "3+1" },
        { id: "4_1", label: "4+1", message: "4+1" },
      ],
      timeline: [
        { id: "researching", label: "Izuchayu", message: "Poka izuchayu rynok" },
        { id: "immediate", label: "Srazu", message: "Gotov dvigatsya srazu" },
        { id: "month_1", label: "1 mesyats", message: "V techenie 1 mesyatsa" },
        { id: "month_3", label: "3 mesyatsa", message: "V techenie 3 mesyatsev" },
        { id: "month_6", label: "6+ mesyatsev", message: "Pozzhe chem cherez 6 mesyatsev" },
      ],
      fallback_preference: [
        { id: "above_budget", label: "Vyshe byudzheta", message: "Pokazat nemnogo vyshe byudzheta" },
        { id: "nearby_areas", label: "Sosednie rayony", message: "Pokazat sosednie rayony" },
        { id: "both", label: "Oba varianta", message: "Pokazat oba varianta" },
        { id: "keep_exact", label: "Net, tochnye filtry", message: "Ostavit tolko tochnye filtry" },
      ],
      lead_intent: [
        { id: "price_list", label: "Prayis-list", message: "Otpravte prayis-list" },
        { id: "payment_plan", label: "Plan oplaty", message: "Otpravte plan oplaty" },
        { id: "consultation", label: "Konsultatsiya", message: "Khochu konsultatsiyu" },
        { id: "send_details", label: "Otpravit detali", message: "Otpravte vse detali" },
      ],
      preferred_language: [
        { id: "en", label: "Angliyskiy", message: "Angliyskiy" },
        { id: "tr", label: "Turetskiy", message: "Turetskiy" },
        { id: "ru", label: "Russkiy", message: "Russkiy" },
        { id: "ar", label: "Arabskiy", message: "Arabskiy" },
      ],
      contact_method: [
        { id: "whatsapp", label: "WhatsApp", message: "WhatsApp" },
        { id: "phone", label: "Telefon", message: "Telefon" },
        { id: "email", label: "Email", message: "Email" },
      ],
      consultation_mode: [
        { id: "visit", label: "Pokaz", message: "Khochu lichnyy pokaz" },
        {
          id: "online",
          label: "Onlayn-konsultatsiya",
          message: "Predpochitayu onlayn-konsultatsiyu",
        },
      ],
      citizenship: [
        { id: "yes", label: "Da", message: "Da, grazhdanstvo vazhno" },
        { id: "no", label: "Net", message: "Net, bez grazhdanstva" },
      ],
      resource_offer: [
        { id: "guide_yes", label: "Da, otpravit", message: "Da, otpravte gid" },
        { id: "guide_no", label: "Net, spasibo", message: "Net, gid ne nuzhen" },
      ],
    },
  },
};

export const getLocalizedAgentCopy = (locale) => {
  const normalizedLocale = normalizeAiLocale(locale);
  return copy[normalizedLocale] || copy[AI_AGENT_DEFAULT_LOCALE];
};

export const buildQuickReplies = (key, locale) => {
  const localized = getLocalizedAgentCopy(locale);
  const values = localized.quickReplies?.[key];
  return Array.isArray(values) ? values : [];
};

import { normalizeLanguageCode } from "../../utils/languageRouting";

const copy = {
  en: {
    title: "AI Sales Agent",
    subtitle: "Lead qualification and smart property matching",
    minimized: "Ask demo Assistant",
    placeholder: "Tell me your budget, area, purpose, or preferred project",
    restart: "New chat",
    close: "Close",
    typing: "demo AI is preparing the next step",
    welcome: "Start with a quick action or ask naturally.",
    leadFormTitle: "Where should we send the details?",
    leadFormSubtitle:
      "Share your contact details and we will send the curated shortlist to your email.",
    fullName: "Full name",
    phone: "Phone (optional)",
    email: "Email address",
    preferredContact: "Preferred contact",
    preferredLanguage: "Preferred language",
    consultationMode: "Consultation mode",
    submitLead: "Send to my email",
    send: "Send",
    whatsapp: "Talk on WhatsApp",
    schedule: "Request consultation",
    recommendations: "Recommended for you",
    resources: "Useful guides",
    matchReasons: "Why it matches",
    viewDetails: "View details",
    openArticle: "Open article",
    noRecommendations:
      "Recommendations will appear once the agent has enough context.",
    emailHandoff: "Send by email",
    fallbackError:
      "The AI assistant is temporarily unavailable. You can still submit your lead below.",
    nameRequired: "Please enter your name.",
    emailRequired: "Please enter a valid email address.",
    contactRequired: "Please enter your email address.",
    whatsappRequired: "Please enter your WhatsApp number.",
    leadSubmittedSuccess:
      "Thank you. Our team will review your preferences and send the details to your email shortly.",
    leadSavedEmailFailed:
      "Your request was saved, but the shortlist email could not be sent. Please check your email address or try again.",
    leadSubmittedWhatsApp:
      "Your details are confirmed. We are opening WhatsApp now so your shortlist can continue there.",
    leadSubmittedWhatsAppDelivered:
      "Your shortlist has been sent to your WhatsApp automatically.",
    leadSubmittedLocked:
      "This request is already submitted. Start a new chat if you want a different shortlist.",
    leadSubmitRetry: "Something went wrong. Please try again.",
    emailDeliveryFailedToast:
      "We saved your request, but the shortlist email could not be sent yet.",
    hotLead: "Hot lead",
    warmLead: "Warm lead",
    coldLead: "Cold lead",
    turkeyLabel: "Turkey",
  },
  tr: {
    title: "AI Satis Asistani",
    subtitle: "Niteliklendirme ve akilli portfoy eslestirme",
    minimized: "demo AI'ya Sor",
    placeholder: "Butce, bolge, hedef veya proje tercihinizi yazin",
    restart: "Yeni sohbet",
    close: "Kapat",
    typing: "demo AI sonraki adimi hazirliyor",
    welcome: "Hizli aksiyonlardan baslayin veya dogal sekilde yazin.",
    leadFormTitle: "Detaylari nereye gonderelim?",
    leadFormSubtitle:
      "Iletisim bilgilerinizi paylasin, kisa listeyi e-posta ile gonderelim.",
    fullName: "Ad soyad",
    phone: "Telefon (istege bagli)",
    email: "E-posta adresi",
    preferredContact: "Tercih edilen iletisim",
    preferredLanguage: "Tercih edilen dil",
    consultationMode: "Gorusme tipi",
    submitLead: "E-postama gonder",
    send: "Gonder",
    whatsapp: "WhatsApp",
    schedule: "Gorusme talep et",
    recommendations: "Sizin icin onerilenler",
    resources: "Faydali rehberler",
    matchReasons: "Eslesme nedenleri",
    viewDetails: "Detayi gor",
    openArticle: "Makaleyi ac",
    noRecommendations:
      "Asistan yeterli bilgi topladiginda oneriler burada gorunecek.",
    emailHandoff: "E-posta ile gonder",
    fallbackError:
      "AI asistan su anda kullanilamiyor. Yine de asagidan talebinizi gonderebilirsiniz.",
    nameRequired: "Lutfen adinizi yazin.",
    emailRequired: "Lutfen gecerli bir e-posta adresi girin.",
    contactRequired: "Lutfen e-posta adresinizi girin.",
    whatsappRequired: "Lutfen WhatsApp numaranizi girin.",
    leadSubmittedSuccess:
      "Tesekkurler. Ekibimiz tercihlerinizi inceleyip detaylari e-postaniza en kisa surede gonderecek.",
    leadSavedEmailFailed:
      "Talebiniz kaydedildi, ancak kisa liste e-postasi gonderilemedi. E-posta adresinizi kontrol edip tekrar deneyin.",
    leadSubmittedWhatsApp:
      "Bilgileriniz onaylandi. Kisa listeyi WhatsApp'ta surdurmek icin simdi WhatsApp aciliyor.",
    leadSubmittedWhatsAppDelivered:
      "Kisa listeniz WhatsApp numaraniza otomatik olarak gonderildi.",
    leadSubmittedLocked:
      "Bu talep zaten gonderildi. Farkli bir kisa liste icin yeni sohbet baslatin.",
    leadSubmitRetry: "Bir hata olustu. Lutfen tekrar deneyin.",
    emailDeliveryFailedToast:
      "Talebiniz kaydedildi, ancak kisa liste e-postasi henuz gonderilemedi.",
    hotLead: "Sicak lead",
    warmLead: "Ilik lead",
    coldLead: "Soguk lead",
    turkeyLabel: "Turkiye",
  },
  ru: {
    title: "AI Sales Agent",
    subtitle: "Kvalifikatsiya lida i umnyy podbor obektov",
    minimized: "Sprosit demo AI",
    placeholder: "Napishite byudzhet, rayon, tsel ili interesuyushchiy proekt",
    restart: "Novyy chat",
    close: "Zakryt",
    typing: "demo AI gotovit sleduyushchiy shag",
    welcome: "Nachnite s bystroy komandy ili napishite estestvenno.",
    leadFormTitle: "Kuda otpravit detali?",
    leadFormSubtitle:
      "Ukazhite kontaktnye dannye, i my otpravim podborku na vashu pochtu.",
    fullName: "Imya i familiya",
    phone: "Telefon (neobbyazatelno)",
    email: "Email",
    preferredContact: "Predpochtitelnyy kontakt",
    preferredLanguage: "Predpochtitelnyy yazyk",
    consultationMode: "Format konsultatsii",
    submitLead: "Otpravit na email",
    send: "Otpravit",
    whatsapp: "WhatsApp",
    schedule: "Zaprosit konsultatsiyu",
    recommendations: "Rekomendovano dlya vas",
    resources: "Poleznye materialy",
    matchReasons: "Pochemu podkhodit",
    viewDetails: "Otkryt detalno",
    openArticle: "Otkryt statyu",
    noRecommendations:
      "Rekomendatsii poyavyatsya, kogda agent poluchit dostatochno konteksta.",
    emailHandoff: "Otpravit po email",
    fallbackError:
      "AI agent vremenno nedostupen. Vy vse ravno mozhete otpravit zayavku nizhe.",
    nameRequired: "Ukazhite, pozhaluysta, imya.",
    emailRequired: "Ukazhite, pozhaluysta, korrektniy email.",
    contactRequired: "Ukazhite email.",
    whatsappRequired: "Ukazhite, pozhaluysta, nomer WhatsApp.",
    leadSubmittedSuccess:
      "Spasibo. Nasha komanda rassmotrit vashi predpochteniya i otpravit detali na vashu pochtu v blizhayshee vremya.",
    leadSavedEmailFailed:
      "Vasha zayavka sokhranena, no otpravit shortlist na email ne udalos. Proverte adres i poprobuyte eshche raz.",
    leadSubmittedWhatsApp:
      "Dаnnyе podtverzhdeny. Seychas otkroyetsya WhatsApp, chtoby prodolzhit shortlist tam.",
    leadSubmittedWhatsAppDelivered:
      "Vash shortlist avtomaticheski otpravlen v WhatsApp.",
    leadSubmittedLocked:
      "Eta zayavka uzhe otpravlena. Nachnite novyy chat, esli nuzhen drugoy shortlist.",
    leadSubmitRetry: "Proizoshla oshibka. Poprobuyete eshche raz.",
    emailDeliveryFailedToast:
      "Zayavka sokhranena, no shortlist po email poka ne otpravlen.",
    hotLead: "Goryachiy lid",
    warmLead: "Tyoplyy lid",
    coldLead: "Kholodnyy lid",
    turkeyLabel: "Turtsiya",
  },
};

export const getAiSalesAgentUiCopy = (language) => {
  const locale = normalizeLanguageCode(language);
  return copy[locale] || copy.en;
};

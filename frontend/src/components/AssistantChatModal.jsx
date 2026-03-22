import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { MdClose, MdPerson, MdRefresh, MdSend } from "react-icons/md";
import { FaRobot } from "react-icons/fa";
import { useAuth0 } from "@auth0/auth0-react";
import UserDetailContext from "../context/UserDetailContext";
import aiRobotAvatar from "../assets/ai-robot-avatar.svg";
import { chatWithRealEstateAssistant, getUserProfile, sendAssistantResultsEmail } from "../utils/api";
import { buildEmailHref, normalizeWhatsAppNumber } from "../utils/common";
import { resolveBlogPath, resolvePropertyPath } from "../utils/seo";
import { toast } from "react-toastify";

const UI_TEXT = {
  en: {
    title: "AI Property Assistant",
    subtitle: "Ask about budget, rooms, location or payment plans.",
    placeholder: "Example: 2+1 in Istanbul under 200000 USD",
    send: "Send",
    sending: "Sending...",
    empty: "No messages yet.",
    error: "Assistant is temporarily unavailable. Please try again.",
    close: "Close",
    ask: "Ask a question",
    noPrice: "Price on request",
    rooms: "Rooms",
    size: "Size",
    delivery: "Delivery",
    viewProject: "View project",
    projectLink: "Project link",
    newChat: "New chat",
    consultantProfile: "Consultant profile",
    consultantLanguages: "Languages",
    consultantRating: "Rating",
    consultantExperience: "Experience",
    consultantEmail: "Email",
    consultantWhatsApp: "WhatsApp",
    viewBlog: "Read blog",
    blogLink: "Blog link",
    blogCategory: "Category",
    blogCountry: "Country",
    userAvatar: "User",
    assistantAvatar: "AI Assistant",
    contactFormTitle: "Get these properties sent to your email",
    firstName: "First Name",
    lastName: "Last Name",
    phone: "Phone",
    emailLabel: "Email",
    sendToEmail: "Send to my email",
    sendingToEmail: "Sending...",
    emailSent: "Sent! Check your inbox.",
    emailError: "Failed to send. Please try again.",
    emailSuccessToast: "Sent successfully!",
  },
  tr: {
    title: "AI Emlak Asistani",
    subtitle: "Butce, oda tipi, lokasyon veya odeme plani sorun.",
    placeholder: "Ornek: Istanbul'da 200000 USD alti 2+1",
    send: "Gonder",
    sending: "Gonderiliyor...",
    empty: "Henuz mesaj yok.",
    error: "Asistan su anda kullanilamiyor. Lutfen tekrar deneyin.",
    close: "Kapat",
    ask: "Soru sor",
    noPrice: "Fiyat icin iletisime gecin",
    rooms: "Oda",
    size: "Alan",
    delivery: "Teslim",
    viewProject: "Projeyi gor",
    projectLink: "Proje linki",
    newChat: "Yeni sohbet",
    consultantProfile: "Danisman profili",
    consultantLanguages: "Diller",
    consultantRating: "Puan",
    consultantExperience: "Deneyim",
    consultantEmail: "E-posta",
    consultantWhatsApp: "WhatsApp",
    viewBlog: "Blogu oku",
    blogLink: "Blog linki",
    blogCategory: "Kategori",
    blogCountry: "Ulke",
    userAvatar: "Kullanici",
    assistantAvatar: "AI Asistan",
    contactFormTitle: "Bu projeleri e-postaniza gonderelim",
    firstName: "Ad",
    lastName: "Soyad",
    phone: "Telefon",
    emailLabel: "E-posta",
    sendToEmail: "E-postama gonder",
    sendingToEmail: "Gonderiliyor...",
    emailSent: "Gonderildi! Gelen kutunuzu kontrol edin.",
    emailError: "Gonderilemedi. Lutfen tekrar deneyin.",
    emailSuccessToast: "Basariyla gonderildi!",
  },
  ru: {
    title: "AI Assistant po Nedvizhimosti",
    subtitle: "Sprosite pro byudzhet, komnaty, rayon ili rassrochku.",
    placeholder: "Primer: 2+1 v Stambule do 200000 USD",
    send: "Otpravit",
    sending: "Otpravlyaetsya...",
    empty: "Soobshcheniy poka net.",
    error: "Assistant vremenno nedostupen. Poprobuyte snova.",
    close: "Zakryt",
    ask: "Zadaite vopros",
    noPrice: "Tsena po zaprosu",
    rooms: "Komnaty",
    size: "Ploshchad",
    delivery: "Srok sdachi",
    viewProject: "Otkryt proekt",
    projectLink: "Ssylka na proekt",
    newChat: "Novyy chat",
    consultantProfile: "Profil konsultanta",
    consultantLanguages: "Yazyki",
    consultantRating: "Reyting",
    consultantExperience: "Opyt",
    consultantEmail: "Email",
    consultantWhatsApp: "WhatsApp",
    viewBlog: "Chitat blog",
    blogLink: "Ssylka na blog",
    blogCategory: "Kategoriya",
    blogCountry: "Strana",
    userAvatar: "Polzovatel",
    assistantAvatar: "AI Assistant",
    contactFormTitle: "Poluchite eti obekty na vash email",
    firstName: "Imya",
    lastName: "Familiya",
    phone: "Telefon",
    emailLabel: "Email",
    sendToEmail: "Otpravit na moy email",
    sendingToEmail: "Otpravlyaetsya...",
    emailSent: "Otpravleno! Proverte pochtu.",
    emailError: "Ne udalos otpravit. Poprobuyte snova.",
    emailSuccessToast: "Uspeshno otpravleno!",
  },
};

const detectUiLang = (lang) => {
  const normalized = String(lang || "").toLowerCase();
  if (normalized.startsWith("tr")) return "tr";
  if (normalized.startsWith("ru")) return "ru";
  return "en";
};

const formatPrice = (priceUsd, priceTry, labels) => {
  const usd = Number(priceUsd) || 0;
  const tr = Number(priceTry) || 0;

  if (usd > 0) return `$${usd.toLocaleString()}`;
  if (tr > 0) return `${tr.toLocaleString()} TRY`;
  return labels.noPrice;
};

const serializeHistory = (messages) =>
  messages
    .filter((msg) => msg.role === "user" || msg.role === "assistant")
    .map((msg) => ({ role: msg.role, content: msg.content }));

const resolveDetailUrl = (item) => {
  const link = String(item?.detail_url || "").trim();
  if (link) return link;
  const slug = String(item?.slug || item?.seoSlug || "").trim();
  const id = String(item?.id || "").trim();
  if (!slug && !id) return "";
  return resolvePropertyPath({ slug, id });
};

const resolveAbsoluteUrl = (url) => {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const path = value.startsWith("/") ? value : `/${value}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
};

const resolveConsultantProfileUrl = (item) => {
  const link = String(item?.profile_url || "").trim();
  if (link) return link;
  return "/consultants";
};

const resolveBlogUrl = (item) => {
  const link = String(item?.blog_url || "").trim();
  if (link) return link;
  const path = resolveBlogPath(item, { preferSlug: true });
  return path === "/blogs" ? "" : path;
};

const AssistantChatWidget = () => {
  const { i18n } = useTranslation();
  const { user: auth0User, isAuthenticated } = useAuth0();
  const { userDetails } = useContext(UserDetailContext);
  const token = userDetails?.token;
  const profileImageFromContext = String(userDetails?.profile?.image || "").trim();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [userProfileImage, setUserProfileImage] = useState("");
  const [contactForm, setContactForm] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [sendingResults, setSendingResults] = useState(false);
  const [resultsSent, setResultsSent] = useState(false);
  const [resultsEmailError, setResultsEmailError] = useState(false);
  const endRef = useRef(null);

  const uiLang = detectUiLang(i18n.language);
  const labels = useMemo(() => UI_TEXT[uiLang] || UI_TEXT.en, [uiLang]);
  const userAvatarSrc = useMemo(
    () =>
      String(
        userProfileImage || profileImageFromContext || auth0User?.picture || ""
      ).trim(),
    [auth0User?.picture, profileImageFromContext, userProfileImage]
  );

  useEffect(() => {
    let active = true;

    if (profileImageFromContext) {
      setUserProfileImage(profileImageFromContext);
    }

    const loadUserProfileImage = async () => {
      if (!isOpen || !isAuthenticated || !auth0User?.email || !token) return;
      const profileData = await getUserProfile(auth0User.email, token);
      const image = String(profileData?.image || "").trim();
      if (active && image) {
        setUserProfileImage(image);
      }
    };

    loadUserProfileImage();

    return () => {
      active = false;
    };
  }, [auth0User?.email, isAuthenticated, isOpen, profileImageFromContext, token]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const nextMessages = [
      ...messages,
      { role: "user", content: prompt, results: [], consultants: [], blogs: [] },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const response = await chatWithRealEstateAssistant(
        prompt,
        serializeHistory(nextMessages)
      );

      const chunks = [response?.reply, response?.next_question, response?.lead_prompt]
        .map((v) => String(v || "").trim())
        .filter(Boolean);

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: chunks.join("\n\n"),
          results: Array.isArray(response?.results) ? response.results : [],
          consultants: Array.isArray(response?.consultants) ? response.consultants : [],
          blogs: Array.isArray(response?.blogs) ? response.blogs : [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: labels.error,
          results: [],
          consultants: [],
          blogs: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const onInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setInput("");
    setContactForm({ firstName: "", lastName: "", phone: "", email: "" });
    setResultsSent(false);
    setResultsEmailError(false);
  };

  const allResults = useMemo(
    () => messages.flatMap((m) => (Array.isArray(m.results) ? m.results : [])),
    [messages]
  );
  const showContactForm = allResults.length > 0 && !resultsSent;

  const handleSendResults = async () => {
    if (!contactForm.firstName.trim() || !contactForm.email.trim()) return;
    setSendingResults(true);
    setResultsEmailError(false);
    try {
      const resultsWithUrls = allResults.map((r) => {
        const url = resolveDetailUrl(r);
        return { ...r, detail_url: url ? resolveAbsoluteUrl(url) : "" };
      });
      await sendAssistantResultsEmail({
        firstName: contactForm.firstName.trim(),
        lastName: contactForm.lastName.trim(),
        phone: contactForm.phone.trim(),
        email: contactForm.email.trim(),
        results: resultsWithUrls,
      });
      toast.success(labels.emailSuccessToast, { position: "bottom-right" });
      setTimeout(() => {
        handleNewChat();
      }, 1500);
    } catch {
      setResultsEmailError(true);
    } finally {
      setSendingResults(false);
    }
  };

  return (
    <>
      {/* Launcher Button */}
      <div
        className={`fixed bottom-5 right-5 z-[70] ${
          isOpen ? "pointer-events-none opacity-0" : "opacity-100"
        } transition`}
      >
        <span className="absolute inset-0 animate-[ripple_2.4s_ease-out_infinite] rounded-full bg-emerald-400/40" />
        <span className="absolute inset-0 animate-[ripple_2.4s_ease-out_0.6s_infinite] rounded-full bg-emerald-400/25" />
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white shadow-[0_14px_34px_-10px_rgba(16,185,129,0.7)] transition hover:scale-110"
        >
          <FaRobot className="animate-[vibrate_2s_ease-in-out_infinite]" size={24} />
        </button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
      <div className="fixed bottom-5 right-5 z-[80] flex h-[min(80vh,720px)] w-[min(420px,calc(100vw-20px))] flex-col overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,250,252,0.98)_100%)] shadow-[0_38px_80px_-38px_rgba(15,23,42,0.72)] backdrop-blur-xl">
        <div className="relative overflow-hidden border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50 via-white to-teal-50 px-5 py-4">
          <div className="pointer-events-none absolute -left-10 -top-10 h-28 w-28 rounded-full bg-emerald-200/35 blur-2xl" />
          <div className="pointer-events-none absolute -right-10 -bottom-12 h-28 w-28 rounded-full bg-teal-200/40 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[linear-gradient(135deg,#0f766e_0%,#10b981_100%)] text-white shadow-sm">
                <FaRobot size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[15px] font-semibold text-gray-900">
                  {labels.title}
                </p>
                <p className="truncate text-xs text-gray-500">{labels.subtitle}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleNewChat}
                disabled={messages.length === 0}
                className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white/85 p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label={labels.newChat}
                title={labels.newChat}
              >
                <MdRefresh size={20} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-full border border-white/80 bg-white/80 p-2 text-gray-500 transition hover:text-gray-700"
                aria-label={labels.close}
              >
                <MdClose size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="ai-chat-body flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="mx-auto mt-6 max-w-[520px] rounded-xl border border-dashed border-emerald-200 bg-white/95 px-5 py-8 text-center text-sm text-gray-600">
              {labels.ask}
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((msg, index) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={`${msg.role}-${index}`}
                    className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                    style={{ animationDelay: `${Math.min(index * 45, 220)}ms` }}
                  >
                    <div
                      className={`flex max-w-[96%] items-end gap-2 ${
                        isUser ? "flex-row-reverse" : "flex-row"
                      }`}
                    >
                      <div
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm shadow-sm ${
                          isUser
                            ? "border-emerald-200 bg-white text-emerald-600"
                            : "border-emerald-500 bg-emerald-50 text-emerald-600"
                        }`}
                        title={isUser ? labels.userAvatar : labels.assistantAvatar}
                        aria-label={isUser ? labels.userAvatar : labels.assistantAvatar}
                      >
                        {isUser ? (
                          userAvatarSrc ? (
                            <img
                              src={userAvatarSrc}
                              alt={labels.userAvatar}
                              className="h-full w-full rounded-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <MdPerson size={18} />
                          )
                        ) : (
                          <img
                            src={aiRobotAvatar}
                            alt={labels.assistantAvatar}
                            className="h-full w-full rounded-full object-cover"
                            loading="lazy"
                          />
                        )}
                      </div>
                      <div
                        className={`ai-chat-bubble max-w-[90%] px-4 py-3 text-sm leading-relaxed ${
                          isUser ? "ai-chat-bubble-user" : "ai-chat-bubble-assistant"
                        }`}
                      >
                        <div className="whitespace-pre-line">{msg.content || labels.empty}</div>

                        {!isUser && Array.isArray(msg.results) && msg.results.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {msg.results.map((item) => (
                              <div
                                key={item.id}
                                className="ai-chat-result-card overflow-hidden rounded-xl border border-emerald-100 bg-white"
                              >
                                {item.image_url ? (
                                  <div className="relative overflow-hidden">
                                    <img
                                      src={item.image_url}
                                      alt={item.title || "project"}
                                      className="h-44 w-full object-cover"
                                      loading="lazy"
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                                  </div>
                                ) : null}
                                <div className="space-y-2 p-3">
                                  <p className="text-sm font-semibold text-gray-900">
                                    {item.title}
                                  </p>
                                  <p className="text-xs text-gray-600">
                                    {[item.city, item.district].filter(Boolean).join(" - ")}
                                  </p>
                                  <p className="text-sm font-semibold text-emerald-600">
                                    {formatPrice(item.price_usd, item.price_try, labels)}
                                  </p>
                                  <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                                    {item.rooms ? <span>{labels.rooms}: {item.rooms}</span> : null}
                                    {item.size_m2 ? <span>{labels.size}: {item.size_m2} m2</span> : null}
                                    {item.delivery_date ? <span>{labels.delivery}: {item.delivery_date}</span> : null}
                                  </div>
                                  {resolveDetailUrl(item) ? (
                                    <div className="space-y-1 pt-1">
                                      <a
                                        href={resolveDetailUrl(item)}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="ai-chat-link-btn inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                                      >
                                        {labels.viewProject}
                                      </a>
                                      <p className="break-all text-[11px] text-gray-500">
                                        {labels.projectLink}: {resolveAbsoluteUrl(resolveDetailUrl(item))}
                                      </p>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {!isUser && Array.isArray(msg.blogs) && msg.blogs.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {msg.blogs.map((blog, blogIndex) => {
                              const blogUrl = resolveBlogUrl(blog);
                              return (
                                <div
                                  key={`${blog.id || blog.title || "blog"}-${blogIndex}`}
                                  className="ai-chat-result-card overflow-hidden rounded-xl border border-emerald-100 bg-white"
                                >
                                  {blog.image_url ? (
                                    <div className="relative overflow-hidden">
                                      <img
                                        src={blog.image_url}
                                        alt={blog.title || "blog"}
                                        className="h-40 w-full object-cover"
                                        loading="lazy"
                                      />
                                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                                    </div>
                                  ) : null}
                                  <div className="space-y-2 p-3">
                                    <p className="text-sm font-semibold text-gray-900">
                                      {blog.title}
                                    </p>
                                    {blog.summary ? (
                                      <p className="line-clamp-3 text-xs text-gray-600">
                                        {blog.summary}
                                      </p>
                                    ) : null}
                                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                                      {blog.category ? (
                                        <span>
                                          {labels.blogCategory}: {blog.category}
                                        </span>
                                      ) : null}
                                      {blog.country ? (
                                        <span>
                                          {labels.blogCountry}: {blog.country}
                                        </span>
                                      ) : null}
                                    </div>
                                    {blogUrl ? (
                                      <div className="space-y-1 pt-1">
                                        <a
                                          href={blogUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="ai-chat-link-btn inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                                        >
                                          {labels.viewBlog}
                                        </a>
                                        <p className="break-all text-[11px] text-gray-500">
                                          {labels.blogLink}: {resolveAbsoluteUrl(blogUrl)}
                                        </p>
                                      </div>
                                    ) : null}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {!isUser &&
                          Array.isArray(msg.consultants) &&
                          msg.consultants.length > 0 && (
                            <div className="mt-3 space-y-3">
                              {msg.consultants.map((consultant, consultantIndex) => {
                                const whatsappNumber = normalizeWhatsAppNumber(
                                  consultant?.whatsapp
                                );
                                const profileUrl = resolveConsultantProfileUrl(consultant);

                                return (
                                  <div
                                    key={`${consultant.id || consultant.email || "consultant"}-${consultantIndex}`}
                                    className="ai-chat-result-card overflow-hidden rounded-xl border border-emerald-100 bg-white"
                                  >
                                    <div className="flex items-start gap-3 p-3">
                                      <img
                                        src={
                                          consultant.image_url ||
                                          "https://via.placeholder.com/120x120?text=Consultant"
                                        }
                                        alt={consultant.name || "consultant"}
                                        className="h-16 w-16 rounded-lg object-cover"
                                        loading="lazy"
                                      />
                                      <div className="min-w-0 flex-1 space-y-1.5">
                                        <p className="truncate text-sm font-semibold text-gray-900">
                                          {consultant.name || labels.consultantProfile}
                                        </p>
                                        {consultant.title ? (
                                          <p className="text-xs text-gray-600">{consultant.title}</p>
                                        ) : null}
                                        {consultant.specialty ? (
                                          <p className="text-xs text-gray-500">
                                            {consultant.specialty}
                                          </p>
                                        ) : null}
                                        <div className="flex flex-wrap gap-2 text-[11px] text-gray-600">
                                          {consultant.rating ? (
                                            <span>
                                              {labels.consultantRating}: {consultant.rating}
                                            </span>
                                          ) : null}
                                          {consultant.experience ? (
                                            <span>
                                              {labels.consultantExperience}: {consultant.experience}
                                            </span>
                                          ) : null}
                                          {Array.isArray(consultant.languages) &&
                                          consultant.languages.length > 0 ? (
                                            <span>
                                              {labels.consultantLanguages}: {" "}
                                              {consultant.languages.join(", ")}
                                            </span>
                                          ) : null}
                                        </div>
                                        <div className="flex flex-wrap gap-2 pt-1">
                                          {whatsappNumber ? (
                                            <a
                                              href={`https://wa.me/${whatsappNumber}`}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="ai-chat-link-btn inline-flex rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                                            >
                                              {labels.consultantWhatsApp}
                                            </a>
                                          ) : null}
                                          {consultant.email ? (
                                            <a
                                              href={buildEmailHref(consultant.email)}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                                            >
                                              {labels.consultantEmail}
                                            </a>
                                          ) : null}
                                          {profileUrl ? (
                                            <a
                                              href={profileUrl}
                                              target="_blank"
                                              rel="noreferrer"
                                              className="inline-flex rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                                            >
                                              {labels.consultantProfile}
                                            </a>
                                          ) : null}
                                        </div>
                                        {profileUrl ? (
                                          <p className="break-all text-[11px] text-gray-500">
                                            {resolveAbsoluteUrl(profileUrl)}
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-end gap-2">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm"
                      title={labels.assistantAvatar}
                      aria-label={labels.assistantAvatar}
                    >
                      <img
                        src={aiRobotAvatar}
                        alt={labels.assistantAvatar}
                        className="h-full w-full rounded-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="ai-chat-bubble ai-chat-bubble-assistant max-w-[220px] px-4 py-3">
                      <div className="ai-chat-typing">
                        <span />
                        <span />
                        <span />
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{labels.sending}</p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="border-t border-emerald-100/80 bg-white/95 px-4 py-3">
          {showContactForm && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/60 p-3">
              <p className="mb-2.5 text-xs font-semibold text-emerald-700">
                {labels.contactFormTitle}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={contactForm.firstName}
                  onChange={(e) => setContactForm((p) => ({ ...p, firstName: e.target.value }))}
                  placeholder={labels.firstName + " *"}
                  className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  type="text"
                  value={contactForm.lastName}
                  onChange={(e) => setContactForm((p) => ({ ...p, lastName: e.target.value }))}
                  placeholder={labels.lastName}
                  className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder={labels.phone}
                  className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder={labels.emailLabel + " *"}
                  className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              {resultsEmailError && (
                <p className="mt-2 text-xs text-red-500">{labels.emailError}</p>
              )}
              <button
                type="button"
                onClick={handleSendResults}
                disabled={sendingResults || !contactForm.firstName.trim() || !contactForm.email.trim()}
                className="mt-2.5 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <MdSend size={14} className="mr-1 inline-block" />
                {sendingResults ? labels.sendingToEmail : labels.sendToEmail}
              </button>
            </div>
          )}
          {resultsSent && (
            <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center text-xs font-medium text-emerald-700">
              {labels.emailSent}
            </div>
          )}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onInputKeyDown}
              className="min-h-[46px] max-h-32 flex-1 resize-y rounded-xl border border-emerald-200 bg-emerald-50/35 px-3 py-2 text-sm text-gray-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              placeholder={labels.placeholder}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="inline-flex h-11 items-center gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-teal-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <MdSend size={18} />
              {labels.send}
            </button>
          </div>
        </div>
      </div>
      )}
    </>
  );
};

export default AssistantChatWidget;

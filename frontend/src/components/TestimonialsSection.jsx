import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FaStar } from "react-icons/fa6";
import { MdChevronLeft, MdChevronRight } from "react-icons/md";
import useTestimonials from "../hooks/useTestimonials";
import sampleOne from "../assets/p01.jpg";
import sampleTwo from "../assets/p02.png";

const buildInitials = (name) => {
  if (!name) return "?";
  return name.trim().charAt(0).toUpperCase();
};

const normalizeLanguage = (language = "en") =>
  language.split("-")[0].toLowerCase();

const ROLE_LABELS = {
  tr: {
    investor: "Yatirimci",
    buyer: "Alici",
    corporate: "Kurumsal musteri",
    tenant: "Kiraci",
  },
  ru: {
    investor: "Инвестор",
    buyer: "Покупатель",
    corporate: "Корпоративный клиент",
    tenant: "Арендатор",
  },
};

const STAFF_BEHAVIOR_LABELS = {
  tr: {
    professional: "Profesyonel",
    friendly: "Dostca",
    responsive: "Hizli donus",
    helpful: "Yardimsever",
  },
  ru: {
    professional: "Профессионально",
    friendly: "Дружелюбно",
    responsive: "Оперативно",
    helpful: "Полезно",
  },
};

const RU_COMMENT_FALLBACKS = {
  "Clear guidance and fast communication. The team supported every step and closed early.":
    "Четкие рекомендации и быстрая коммуникация. Команда поддерживала нас на каждом этапе и помогла закрыть сделку раньше.",
  "They listened to our priorities and brought us real options instead of random listings.":
    "Они учли наши приоритеты и предложили действительно подходящие варианты вместо случайных объявлений.",
  "Strong marketing plan, transparent process, and fast feedback on every question.":
    "Сильный маркетинговый план, прозрачный процесс и быстрые ответы на каждый вопрос.",
  "Viewings were easy to schedule and the team was respectful and helpful.":
    "Просмотры было легко планировать, а команда работала уважительно и очень полезно.",
  "Clear pricing guidance and honest feedback. We felt confident throughout the process.":
    "Четкие рекомендации по цене и честная обратная связь. Мы чувствовали уверенность на всем этапе.",
  "Fast responses, solid market insight, and smooth paperwork support.":
    "Быстрые ответы, глубокая экспертиза рынка и аккуратная поддержка по документам.",
  "They helped us find a great place quickly and made the viewing schedule easy.":
    "Они быстро помогли найти отличный вариант и удобно организовали график просмотров.",
  "We appreciated the clear explanations and fast follow-ups after each visit.":
    "Мы оценили понятные объяснения и быстрые последующие ответы после каждого просмотра.",
  "Excellent market knowledge and smooth closing support. Very reliable team.":
    "Отличное знание рынка и спокойное сопровождение закрытия сделки. Очень надежная команда.",
  "The process was organized and transparent. Scheduling was easy and quick.":
    "Процесс был организованным и прозрачным. Все встречи планировались быстро и удобно.",
  "The team guided us with clarity and speed. Every step felt transparent and we closed earlier than expected.":
    "Команда вела нас четко и быстро. Каждый этап был прозрачным, и мы закрыли сделку раньше ожидаемого.",
  "They listened to our priorities and matched us with options we actually wanted to see. Great experience overall.":
    "Они учли наши приоритеты и подобрали именно те варианты, которые мы хотели смотреть. В целом отличный опыт.",
  "Fast responses, strong negotiation support, and a clear marketing plan. We felt supported throughout.":
    "Быстрые ответы, сильная поддержка в переговорах и понятный маркетинговый план. Мы чувствовали поддержку на всем пути.",
  "Scheduling viewings was easy and the team was respectful. They helped us finalize quickly.":
    "Организовать просмотры было легко, команда работала уважительно и помогла быстро завершить процесс.",
};

const localizeKnownValue = (value, language, dictionary) => {
  if (!value) return "";
  const normalized = value.trim().toLowerCase();
  return dictionary[language]?.[normalized] || value;
};

const TestimonialsSection = ({
  testimonials,
  limit = 8,
  showHeader = true,
  showCta = true,
  autoScroll = false,
  autoScrollSpeed = 12,
  className = "",
}) => {
  const { t, i18n } = useTranslation();
  const languageCode = normalizeLanguage(i18n.language);
  const currentLang = ["tr", "ru"].includes(languageCode) ? languageCode : "en";
  const useRemote = !Array.isArray(testimonials);
  const { data, isLoading } = useTestimonials({ enabled: useRemote });

  const items = Array.isArray(testimonials) ? testimonials : data || [];
  const displayTestimonials = limit ? items.slice(0, limit) : items;
  const sampleTestimonials = [
    {
      id: "sample-1",
      name: "Aylin Demir",
      role: "Investor",
      company: "Atlas Capital",
      rating: 5,
      staffBehavior: "Professional",
      comment:
        "Clear guidance and fast communication. The team supported every step and closed early.",
      comment_en:
        "Clear guidance and fast communication. The team supported every step and closed early.",
      comment_tr:
        "Açık yönlendirme ve hızlı iletişim. Ekip her adımda destek oldu ve erken kapattık.",
      image: sampleOne,
    },
    {
      id: "sample-2",
      name: "Kerem Yilmaz",
      role: "Buyer",
      company: "Istanbul",
      rating: 4,
      staffBehavior: "Friendly",
      comment:
        "They listened to our priorities and brought us real options instead of random listings.",
      comment_en:
        "They listened to our priorities and brought us real options instead of random listings.",
      comment_tr:
        "Önceliklerimizi dinlediler ve rastgele ilanlar yerine bize gerçekten uygun seçenekler sundular.",
      image: sampleTwo,
    },
    {
      id: "sample-3",
      name: "Selin Kaya",
      role: "Corporate",
      company: "Kaya Holdings",
      rating: 5,
      staffBehavior: "Responsive",
      comment:
        "Strong marketing plan, transparent process, and fast feedback on every question.",
      comment_en:
        "Strong marketing plan, transparent process, and fast feedback on every question.",
      comment_tr:
        "Güçlü pazarlama planı, şeffaf süreç ve her soruya hızlı geri dönüş.",
      image: "",
    },
    {
      id: "sample-4",
      name: "Emre Sahin",
      role: "Tenant",
      company: "",
      rating: 4,
      staffBehavior: "Helpful",
      comment:
        "Viewings were easy to schedule and the team was respectful and helpful.",
      comment_en:
        "Viewings were easy to schedule and the team was respectful and helpful.",
      comment_tr:
        "Görüntüleme randevuları kolaydı; ekip saygılı ve yardımcıydı.",
      image: "",
    },
    {
      id: "sample-5",
      name: "Derya Aydin",
      role: "Buyer",
      company: "Ankara",
      rating: 5,
      staffBehavior: "Professional",
      comment:
        "Clear pricing guidance and honest feedback. We felt confident throughout the process.",
      comment_en:
        "Clear pricing guidance and honest feedback. We felt confident throughout the process.",
      comment_tr:
        "Net fiyatlandırma yönlendirmesi ve dürüst geri bildirim. Süreç boyunca kendimizi güvende hissettik.",
      image: "",
    },
    {
      id: "sample-6",
      name: "Hakan Yildiz",
      role: "Investor",
      company: "Yildiz Group",
      rating: 4,
      staffBehavior: "Responsive",
      comment:
        "Fast responses, solid market insight, and smooth paperwork support.",
      comment_en:
        "Fast responses, solid market insight, and smooth paperwork support.",
      comment_tr:
        "Hızlı dönüşler, güçlü piyasa bilgisi ve sorunsuz evrak desteği.",
      image: "",
    },
    {
      id: "sample-7",
      name: "Melis Kara",
      role: "Tenant",
      company: "Izmir",
      rating: 5,
      staffBehavior: "Friendly",
      comment:
        "They helped us find a great place quickly and made the viewing schedule easy.",
      comment_en:
        "They helped us find a great place quickly and made the viewing schedule easy.",
      comment_tr:
        "Hızlıca güzel bir yer bulmamıza yardımcı oldular ve randevu planı çok kolaydı.",
      image: "",
    },
    {
      id: "sample-8",
      name: "Ali Can",
      role: "Buyer",
      company: "Bursa",
      rating: 4,
      staffBehavior: "Professional",
      comment:
        "We appreciated the clear explanations and fast follow-ups after each visit.",
      comment_en:
        "We appreciated the clear explanations and fast follow-ups after each visit.",
      comment_tr:
        "Her ziyaret sonrası net açıklamalar ve hızlı geri dönüşleri takdir ettik.",
      image: "",
    },
    {
      id: "sample-9",
      name: "Zehra Yilmaz",
      role: "Investor",
      company: "Yilmaz Ventures",
      rating: 5,
      staffBehavior: "Responsive",
      comment:
        "Excellent market knowledge and smooth closing support. Very reliable team.",
      comment_en:
        "Excellent market knowledge and smooth closing support. Very reliable team.",
      comment_tr:
        "Mükemmel piyasa bilgisi ve sorunsuz kapanış desteği. Çok güvenilir bir ekip.",
      image: "",
    },
    {
      id: "sample-10",
      name: "Onur Kaplan",
      role: "Tenant",
      company: "Antalya",
      rating: 4,
      staffBehavior: "Helpful",
      comment:
        "The process was organized and transparent. Scheduling was easy and quick.",
      comment_en:
        "The process was organized and transparent. Scheduling was easy and quick.",
      comment_tr:
        "Süreç düzenli ve şeffaftı. Randevu ayarlamak hızlı ve kolaydı.",
      image: "",
    },
  ];
  const sampleDisplay = limit ? sampleTestimonials.slice(0, limit) : sampleTestimonials;
  const resolvedTestimonials =
    displayTestimonials.length > 0 ? displayTestimonials : sampleDisplay;
  const hasTestimonials = resolvedTestimonials.length > 0;
  const baseTestimonials = hasTestimonials ? resolvedTestimonials : sampleDisplay;

  // Ensure enough items for horizontal motion even with few testimonials
  const minSliderItems = 5;
  const sliderItems =
    baseTestimonials.length >= minSliderItems
      ? baseTestimonials
      : Array.from({ length: minSliderItems }, (_, idx) => {
          const item = baseTestimonials[idx % baseTestimonials.length];
          return {
            ...item,
            _dupKey: `${item.id || item.name || "item"}-dup-${idx}`,
          };
        });

  const averageRating = baseTestimonials.length
    ? Math.round(
        (baseTestimonials.reduce(
          (sum, item) => sum + (Number(item.rating) || 0),
          0
        ) /
          baseTestimonials.length) *
          10
      ) / 10
    : 0;

  const resolveComment = (testimonial) => {
    if (currentLang === "ru") {
      const fallbackComment =
        testimonial.comment_ru ||
        testimonial.comment_en ||
        testimonial.comment ||
        testimonial.comment_tr ||
        "";
      return RU_COMMENT_FALLBACKS[fallbackComment] || fallbackComment;
    }

    if (currentLang === "tr") {
      return (
        testimonial.comment_tr ||
        testimonial.comment ||
        testimonial.comment_en ||
        ""
      );
    }
    return (
      testimonial.comment_en ||
      testimonial.comment ||
      testimonial.comment_tr ||
      ""
    );
  };

  const resolveRole = (testimonial) => {
    if (currentLang === "ru") {
      return (
        testimonial.role_ru ||
        localizeKnownValue(
          testimonial.role_en || testimonial.role,
          "ru",
          ROLE_LABELS
        ) ||
        testimonial.role_tr ||
        ""
      );
    }

    if (currentLang === "tr") {
      return (
        testimonial.role_tr ||
        localizeKnownValue(
          testimonial.role_en || testimonial.role,
          "tr",
          ROLE_LABELS
        ) ||
        testimonial.role ||
        ""
      );
    }

    return (
      testimonial.role_en ||
      testimonial.role ||
      testimonial.role_tr ||
      testimonial.role_ru ||
      ""
    );
  };

  const resolveCompany = (testimonial) => {
    if (currentLang === "ru") {
      return (
        testimonial.company_ru ||
        testimonial.company_en ||
        testimonial.company ||
        testimonial.company_tr ||
        ""
      );
    }

    if (currentLang === "tr") {
      return (
        testimonial.company_tr ||
        testimonial.company ||
        testimonial.company_en ||
        testimonial.company_ru ||
        ""
      );
    }

    return (
      testimonial.company_en ||
      testimonial.company ||
      testimonial.company_tr ||
      testimonial.company_ru ||
      ""
    );
  };

  const resolveStaffBehavior = (testimonial) => {
    if (currentLang === "ru") {
      return (
        testimonial.staffBehavior_ru ||
        localizeKnownValue(
          testimonial.staffBehavior_en || testimonial.staffBehavior,
          "ru",
          STAFF_BEHAVIOR_LABELS
        ) ||
        testimonial.staffBehavior_tr ||
        ""
      );
    }

    if (currentLang === "tr") {
      return (
        testimonial.staffBehavior_tr ||
        localizeKnownValue(
          testimonial.staffBehavior_en || testimonial.staffBehavior,
          "tr",
          STAFF_BEHAVIOR_LABELS
        ) ||
        testimonial.staffBehavior ||
        ""
      );
    }

    return (
      testimonial.staffBehavior_en ||
      testimonial.staffBehavior ||
      testimonial.staffBehavior_tr ||
      testimonial.staffBehavior_ru ||
      ""
    );
  };

  const trackRef = useRef(null);
  const viewportRef = useRef(null);
  const autoScrollPausedRef = useRef(false);

  const handleScroll = (direction) => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    
    if (!viewport || !track) return;
    
    // Pause autoScroll temporarily when user clicks
    autoScrollPausedRef.current = true;
    setTimeout(() => {
      autoScrollPausedRef.current = false;
    }, 2000);
    
    // Force a reflow to ensure dimensions are correct
    void viewport.offsetHeight;
    
    const card = track.querySelector("[data-testimonial-card]");
    if (!card) return;
    
    const cards = track.querySelectorAll("[data-testimonial-card]");
    if (!cards || cards.length === 0) return;
    
    const firstCard = cards[0];
    const cardWidth = firstCard.getBoundingClientRect().width;
    const computedGap =
      parseFloat(
        window.getComputedStyle(track).columnGap?.replace("px", "") || "0"
      ) || 0;
    const gap = computedGap || 16;
    const viewportWidth = viewport.clientWidth;
    const isMobile = viewportWidth < 768; // sm breakpoint
    
    const currentScroll = viewport.scrollLeft;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    
    // Check if scrolling is needed
    if (maxScroll <= 0) return;
    
    let target;
    if (isMobile) {
      // On mobile: scroll exactly one card at a time to show full cards
      const scrollAmount = cardWidth + gap;
      // Calculate which card we're currently viewing
      const currentCardIndex = Math.round(currentScroll / scrollAmount);
      
      if (direction === -1) {
        // Scroll left - go to previous card
        target = Math.max(0, (currentCardIndex - 1) * scrollAmount);
      } else {
        // Scroll right - go to next card
        target = Math.min(maxScroll, (currentCardIndex + 1) * scrollAmount);
      }
    } else {
      // On desktop: scroll 1.5 cards for better view
      const scrollAmount = (cardWidth + gap) * 1.5;
      if (direction === -1) {
        target = Math.max(0, currentScroll - scrollAmount);
      } else {
        target = Math.min(maxScroll, currentScroll + scrollAmount);
      }
    }
    
    // Direct scroll for immediate response
    viewport.scrollTo({ 
      left: target, 
      behavior: "smooth" 
    });
  };

  useEffect(() => {
    if (!autoScroll) return;
    const viewport = viewportRef.current;
    if (!viewport) return;
    let animationId;
    let lastTime = null;

    const step = (time) => {
      if (!viewport) return;
      
      // Pause autoScroll if user manually scrolled
      if (autoScrollPausedRef.current) {
        animationId = window.requestAnimationFrame(step);
        return;
      }
      
      if (lastTime === null) lastTime = time;
      const delta = time - lastTime;
      lastTime = time;
      const distance = (autoScrollSpeed / 1000) * delta;

      if (viewport.scrollWidth > viewport.clientWidth) {
        viewport.scrollLeft += distance;
        if (
          viewport.scrollLeft + viewport.clientWidth >=
          viewport.scrollWidth - 1
        ) {
          viewport.scrollLeft = 0;
        }
      }

      animationId = window.requestAnimationFrame(step);
    };

    animationId = window.requestAnimationFrame(step);
    return () => {
      window.cancelAnimationFrame(animationId);
    };
  }, [autoScroll, autoScrollSpeed, sliderItems.length]);

  return (
    <section className={`max-padd-container py-16 xl:py-24 ${className}`}>
      <div className="relative isolate overflow-hidden rounded-3xl bg-white text-gray-900 shadow-lg ring-1 ring-gray-200">
        <div className="relative z-10 flex flex-col xl:flex-row gap-10 px-6 py-10 sm:px-10 lg:px-12 overflow-hidden">
          {showHeader && (
            <div className="xl:w-[38%]">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-600">
                {t("testimonials.subtitle")}
              </span>
              <h2 className="mt-3 text-2xl sm:text-3xl font-semibold leading-tight">
                {t("testimonials.title")}
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed max-w-md">
                {t("testimonials.description")}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-xs uppercase tracking-wide text-emerald-700">
                  <span>{t("testimonials.avg")}</span>
                  <span className="text-emerald-900">{averageRating.toFixed(1)}</span>
                  <div className="flex items-center gap-0.5">
                    {[...Array(5)].map((_, index) => (
                      <FaStar
                        key={index}
                        className={`text-[10px] ${
                          index < Math.round(averageRating)
                            ? "text-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {t("testimonials.reviewsLabel", {
                    count: resolvedTestimonials.length,
                  })}
                </span>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isLoading && useRemote ? (
              <div className="flexCenter py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-400"></div>
              </div>
            ) : hasTestimonials ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleScroll(-1);
                  }}
                  className="absolute -left-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-100"
                  aria-label="Scroll left"
                >
                  <MdChevronLeft size={22} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleScroll(1);
                  }}
                  className="absolute -right-3 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-md transition hover:bg-gray-100"
                  aria-label="Scroll right"
                >
                  <MdChevronRight size={22} />
                </button>
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 sm:w-10 bg-gradient-to-r from-white via-white/80 to-transparent backdrop-blur-sm"></div>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 sm:w-10 bg-gradient-to-l from-white via-white/80 to-transparent backdrop-blur-sm"></div>
                <div 
                  ref={viewportRef} 
                  className="overflow-x-auto overflow-y-hidden pb-2 scroll-smooth scrollbar-hide w-full snap-x snap-mandatory px-2"
                  style={{ 
                    scrollbarWidth: 'none', 
                    msOverflowStyle: 'none',
                    WebkitOverflowScrolling: 'touch',
                    scrollBehavior: 'smooth',
                    scrollSnapType: 'x mandatory'
                  }}
                  onScroll={() => {
                    // Pause autoScroll when user manually scrolls
                    autoScrollPausedRef.current = true;
                    setTimeout(() => {
                      autoScrollPausedRef.current = false;
                    }, 2000);
                  }}
                >
                  <div
                    ref={trackRef}
                    className="flex gap-4 sm:gap-6"
                    style={{ width: 'max-content', minWidth: '100%' }}
                  >
                  {sliderItems.map((testimonial) => {
                    const displayRole = resolveRole(testimonial);
                    const displayCompany = resolveCompany(testimonial);
                    const displayStaffBehavior = resolveStaffBehavior(testimonial);

                    return (
                      <article
                        key={testimonial.id || testimonial._dupKey || testimonial.name}
                        data-testimonial-card
                        className="group relative w-[260px] sm:w-[300px] lg:w-[340px] flex-none overflow-hidden rounded-2xl border border-[#1b2a3a] bg-gradient-to-br from-[#142030] via-[#1b2a3a] to-[#0f1a28] p-5 shadow-md transition hover:-translate-y-1 hover:border-emerald-400/40 snap-center sm:snap-start"
                        style={{ scrollSnapAlign: "center", scrollSnapStop: "always" }}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            {testimonial.image ? (
                              <img
                                src={testimonial.image}
                                alt={testimonial.name}
                                className="h-12 w-12 rounded-2xl object-cover ring-2 ring-white/10"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center font-semibold text-white">
                                {buildInitials(testimonial.name)}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-white">
                                {testimonial.name}
                              </p>
                              {(displayRole || displayCompany) && (
                                <p className="text-xs text-white/60">
                                  {[displayRole, displayCompany]
                                    .filter(Boolean)
                                    .join(" | ")}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-amber-300">
                            <FaStar className="text-amber-400" />
                            <span className="text-amber-200">
                              {testimonial.rating || 0}
                            </span>
                          </div>
                        </div>

                        <p className="mt-4 text-sm text-white/70 leading-relaxed">
                          {resolveComment(testimonial)}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, index) => (
                              <FaStar
                                key={index}
                                className={`text-xs ${
                                  index < Math.round(testimonial.rating || 0)
                                    ? "text-amber-400"
                                    : "text-white/20"
                                }`}
                              />
                            ))}
                            <span className="text-xs text-white/60 ml-1">
                              {testimonial.rating || 0}/5
                            </span>
                          </div>
                          {displayStaffBehavior && (
                            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-white/70">
                              {t("testimonials.staffBehavior")}:{" "}
                              {displayStaffBehavior}
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
                <p className="text-sm font-semibold">
                  {t("testimonials.emptyTitle")}
                </p>
                <p className="mt-2 text-xs">{t("testimonials.emptyText")}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;

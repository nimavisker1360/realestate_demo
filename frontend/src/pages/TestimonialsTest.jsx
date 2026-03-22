import { useTranslation } from "react-i18next";
import TestimonialsSection from "../components/TestimonialsSection";
import sampleOne from "../assets/p01.jpg";
import sampleTwo from "../assets/p02.png";

const mockTestimonials = [
  {
    id: "preview-1",
    name: "Aylin Demir",
    role: "Investor",
    company: "Atlas Capital",
    rating: 5,
    staffBehavior: "Professional",
    comment:
      "The team guided us with clarity and speed. Every step felt transparent and we closed earlier than expected.",
    comment_en:
      "The team guided us with clarity and speed. Every step felt transparent and we closed earlier than expected.",
    comment_tr:
      "Ekip bizi net ve hızlı şekilde yönlendirdi. Her adım şeffaftı ve beklenenden erken kapattık.",
    image: sampleOne,
  },
  {
    id: "preview-2",
    name: "Kerem Yilmaz",
    role: "Buyer",
    company: "Istanbul",
    rating: 4,
    staffBehavior: "Friendly",
    comment:
      "They listened to our priorities and matched us with options we actually wanted to see. Great experience overall.",
    comment_en:
      "They listened to our priorities and matched us with options we actually wanted to see. Great experience overall.",
    comment_tr:
      "Önceliklerimizi dinlediler ve gerçekten görmek istediğimiz seçeneklerle eşleştirdiler. Genel deneyim çok iyiydi.",
    image: sampleTwo,
  },
  {
    id: "preview-3",
    name: "Selin Kaya",
    role: "Corporate",
    company: "Kaya Holdings",
    rating: 5,
    staffBehavior: "Responsive",
    comment:
      "Fast responses, strong negotiation support, and a clear marketing plan. We felt supported throughout.",
    comment_en:
      "Fast responses, strong negotiation support, and a clear marketing plan. We felt supported throughout.",
    comment_tr:
      "Hızlı dönüşler, güçlü pazarlık desteği ve net bir pazarlama planı. Süreç boyunca desteklendiğimizi hissettik.",
    image: "",
  },
  {
    id: "preview-4",
    name: "Emre Sahin",
    role: "Tenant",
    company: "",
    rating: 4,
    staffBehavior: "Helpful",
    comment:
      "Scheduling viewings was easy and the team was respectful. They helped us finalize quickly.",
    comment_en:
      "Scheduling viewings was easy and the team was respectful. They helped us finalize quickly.",
    comment_tr:
      "Görüntüleme randevuları kolaydı ve ekip saygılıydı. Hızlıca sonuçlandırmamıza yardımcı oldular.",
    image: "",
  },
];

const TestimonialsTest = () => {
  const { t } = useTranslation();

  return (
    <main>
      <section className="max-padd-container pt-12 pb-6">
        <div className="rounded-3xl bg-gradient-to-r from-[#101a2d] via-[#1a2b40] to-[#101a2d] px-6 py-10 text-white shadow-xl">
          <h1 className="text-3xl sm:text-4xl font-semibold">
            {t("testimonials.testPageTitle")}
          </h1>
          <p className="mt-3 text-sm sm:text-base text-white/70 max-w-2xl">
            {t("testimonials.pageSubtitle")}
          </p>
        </div>
      </section>

      <TestimonialsSection
        testimonials={mockTestimonials}
        limit={0}
        showCta={false}
      />
    </main>
  );
};

export default TestimonialsTest;

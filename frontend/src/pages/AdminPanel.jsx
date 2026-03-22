import { useState, useContext, useEffect, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import {
  Container,
  Stepper,
  Paper,
  Title,
  Text,
  Group,
  Badge,
  Divider,
  Button,
  Avatar,
  Table,
  Loader,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  NumberInput,
  Switch,
  MultiSelect,
  Select,
} from "@mantine/core";
import { useAuth0 } from "@auth0/auth0-react";
import { Navigate, useNavigate } from "react-router-dom";
import AddLocation from "../components/AddLocation";
import UploadImage from "../components/UploadImage";
import BasicDetails from "../components/BasicDetails";
import Facilities from "../components/Facilities";
import ProjectDetails from "../components/ProjectDetails";
import EditPropertyModal from "../components/EditPropertyModal";
import useAdmin from "../hooks/useAdmin";
import useProperties from "../hooks/useProperties";
import useConsultants from "../hooks/useConsultants";
import useCountries from "../hooks/useCountries";
import UserDetailContext from "../context/UserDetailContext";
import { aboutTurkeyMenu } from "../constant/aboutTurkeyMenu";
import { buyerGuideMenu } from "../constant/buyerGuideMenu";
import {
  getAdminAllBookings,
  deleteResidency,
  createConsultant,
  updateConsultant,
  deleteConsultant,
  toggleConsultantAvailability,
  getAllContactMessages,
  deleteContactMessage,
  reorderConsultants,
  getAllBlogsAdmin,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleBlogPublish,
  getAllTestimonialsAdmin,
  createTestimonial,
  updateTestimonial,
  deleteTestimonial,
  toggleTestimonialPublish,
  generateAIBlog,
} from "../utils/api";
import { toast } from "react-toastify";
import { bilingualFromMessage, bilingualKey } from "../utils/bilingualToast";
import { resolveProjectPath } from "../utils/seo";
import {
  MdDashboard,
  MdAddHome,
  MdList,

 
  MdHome,
  MdRefresh,
  MdEdit,
  MdDelete,
  MdPeople,
  MdPersonAdd,
  MdPhone,
  MdEmail,
  MdOutlineCloudUpload,
  MdClose,
  MdMessage,
  MdDragIndicator,
  MdArticle,
  MdAdd,
  MdBlock,
  MdCheckCircle,
  MdRateReview,
} from "react-icons/md";
import { FaStar } from "react-icons/fa6";
import { pickAndUploadImages, pickAndUploadVideos } from "../utils/blobUpload";
import UploadProgressBar from "../components/UploadProgressBar";

// DnD Kit imports
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Sortable Table Row Component
const SortableTableRow = ({ consultant, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: consultant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    backgroundColor: isDragging ? "#f0f0f0" : undefined,
  };

  return (
    <Table.Tr ref={setNodeRef} style={style}>
      <Table.Td>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-gray-100 rounded"
        >
          <MdDragIndicator size={20} className="text-gray-400" />
        </div>
      </Table.Td>
      {children}
    </Table.Tr>
  );
};

SortableTableRow.propTypes = {
  consultant: PropTypes.shape({
    id: PropTypes.string.isRequired,
  }).isRequired,
  children: PropTypes.node.isRequired,
};

const CURRENCY_SYMBOLS = {
  USD: "$",
  EUR: "\u20AC",
  GBP: "\u00A3",
  TRY: "\u20BA",
};

const getCurrencySymbol = (currencyCode) =>
  CURRENCY_SYMBOLS[String(currencyCode || "USD").toUpperCase()] || "$";

const getDefaultFiatCurrency = () => {
  const currency = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || "USD"
  ).toUpperCase();
  return ["USD", "EUR", "GBP", "TRY"].includes(currency) ? currency : "USD";
};

const AdminPanel = () => {
  const [active, setActive] = useState(0);
  const [activeTab, setActiveTab] = useState("bookings");
  const { user, isAuthenticated, isLoading: authLoading } = useAuth0();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const {
    userDetails: { token },
  } = useContext(UserDetailContext);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Bookings state (reserved for future use)
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [totalBookings, setTotalBookings] = useState(0);

  // Properties state
  const {
    data: properties,
    isLoading: propertiesLoading,
    refetch: refetchProperties,
  } = useProperties();
  const [propertyFilter, setPropertyFilter] = useState("all"); // all, sale, local-project, international-project
  const [editModalOpened, setEditModalOpened] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Consultants state
  const {
    data: consultants,
    isLoading: consultantsLoading,
    refetch: refetchConsultants,
  } = useConsultants();
  const [consultantModalOpened, setConsultantModalOpened] = useState(false);
  const [editConsultantModalOpened, setEditConsultantModalOpened] =
    useState(false);
  const [selectedConsultant, setSelectedConsultant] = useState(null);
  const [deleteConsultantModalOpened, setDeleteConsultantModalOpened] =
    useState(false);
  const [consultantToDelete, setConsultantToDelete] = useState(null);
  const [consultantLoading, setConsultantLoading] = useState(false);

  // Ordered consultants state for drag-and-drop
  const [orderedConsultants, setOrderedConsultants] = useState([]);

  // Update ordered consultants when consultants data changes
  useEffect(() => {
    if (consultants && consultants.length > 0) {
      setOrderedConsultants(consultants);
    }
  }, [consultants]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Consultant IDs for sortable context
  const consultantIds = useMemo(
    () => orderedConsultants.map((c) => c.id),
    [orderedConsultants]
  );

  // Handle drag end for consultants reordering
  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setOrderedConsultants((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);

        // Save the new order to backend
        const orderedIds = newItems.map((c) => c.id);
        reorderConsultants(orderedIds, token)
          .then(() => {
            toast.success(bilingualKey("toast.consultantOrderUpdated"));
          })
          .catch((error) => {
            console.error("Error saving order:", error);
            // Revert on error
            setOrderedConsultants(items);
          });

        return newItems;
      });
    }
  };

  // Contact Messages state
  const [contactMessages, setContactMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [totalMessages, setTotalMessages] = useState(0);

  // Blogs state
  const [blogs, setBlogs] = useState([]);
  const [blogsLoading, setBlogsLoading] = useState(true);
  const [totalBlogs, setTotalBlogs] = useState(0);
  const [blogModalOpened, setBlogModalOpened] = useState(false);
  const [editBlogModalOpened, setEditBlogModalOpened] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [deleteBlogModalOpened, setDeleteBlogModalOpened] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [blogLoading, setBlogLoading] = useState(false);
  const [aiGenerateModalOpened, setAiGenerateModalOpened] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [contentEditorLang, setContentEditorLang] = useState("en");
  const { getAll: getAllCountries } = useCountries();
  const extractCountryFromTitle = (rawTitle) => {
    if (!rawTitle || typeof rawTitle !== "string") return "";
    const cleaned = rawTitle.replace(/[?!\u061f]+$/g, "").trim();
    const lower = cleaned.toLowerCase();
    const inIndex = lower.lastIndexOf(" in ");
    if (inIndex !== -1 && inIndex + 4 < cleaned.length) {
      return cleaned.slice(inIndex + 4).trim();
    }
    return "";
  };

  const countryOptions = useMemo(() => {
    const allCountries = getAllCountries();
    const countryMap = new Map(
      allCountries.map((country) => [
        country.value.toLowerCase(),
        { value: country.value, label: country.label },
      ])
    );
    const blogCountries = new Set();

    (blogs || []).forEach((blog) => {
      const direct = (blog.country || "").trim();
      if (direct) {
        blogCountries.add(direct.toLowerCase());
        return;
      }
      const candidates = [blog.title_en, blog.title_tr, blog.title, blog.title_en];
      for (const candidate of candidates) {
        const extracted = extractCountryFromTitle(candidate);
        if (extracted) {
          blogCountries.add(extracted.toLowerCase());
          break;
        }
      }
    });
    blogCountries.add("turkey");
    const options = [];

    blogCountries.forEach((lower) => {
      const option = countryMap.get(lower);
      if (option) {
        options.push(option);
        return;
      }
      const original =
        (blogs || []).find(
          (blog) => (blog.country || "").trim().toLowerCase() === lower
        )?.country || lower;
      const label = original.charAt(0).toUpperCase() + original.slice(1);
      options.push({ value: label, label });
    });

    return options.sort((a, b) => a.value.localeCompare(b.value));
  }, [blogs, getAllCountries]);

  const aboutTurkeyMenuOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    aboutTurkeyMenu.forEach((section) => {
      const sectionLabel = t(section.titleKey);
      section.items.forEach((item) => {
        const value = item.menuKey || item.labelKey;
        if (!value || seen.has(value)) return;
        seen.add(value);
        options.push({
          value,
          label: `${sectionLabel} - ${t(item.labelKey)}`,
        });
      });
    });
    return options;
  }, [t, i18n.language]);

  const buyerGuideMenuOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    buyerGuideMenu.forEach((column) => {
      column.sections.forEach((section) => {
        const sectionLabel = t(section.titleKey);
        section.items.forEach((item) => {
          const value = item.menuKey || item.labelKey;
          if (!value || seen.has(value)) return;
          seen.add(value);
          options.push({
            value,
            label: `${sectionLabel} - ${t(item.labelKey)}`,
          });
        });
      });
    });
    return options;
  }, [t, i18n.language]);

  const citizenshipMenuOptions = useMemo(
    () => [{ value: "nav.citizenship", label: t("nav.citizenship") }],
    [t, i18n.language]
  );
  const investmentOpportunitiesMenuOptions = useMemo(
    () => [
      {
        value: "nav.investmentOpportunities",
        label: t("nav.investmentOpportunities"),
      },
    ],
    [t, i18n.language]
  );

  // Testimonials state
  const [testimonials, setTestimonials] = useState([]);
  const [testimonialsLoading, setTestimonialsLoading] = useState(true);
  const [totalTestimonials, setTotalTestimonials] = useState(0);
  const [testimonialModalOpened, setTestimonialModalOpened] = useState(false);
  const [editTestimonialModalOpened, setEditTestimonialModalOpened] =
    useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState(null);
  const [deleteTestimonialModalOpened, setDeleteTestimonialModalOpened] =
    useState(false);
  const [testimonialToDelete, setTestimonialToDelete] = useState(null);
  const [testimonialLoading, setTestimonialLoading] = useState(false);

  const [testimonialForm, setTestimonialForm] = useState({
    name: "",
    role: "",
    company: "",
    comment_tr: "",
    comment_en: "",
    staffBehavior: "",
    rating: 5,
    image: "",
    published: true,
  });

  const [blogForm, setBlogForm] = useState({
    title: "",
    title_en: "",
    title_tr: "",
    title_ru: "",
    category: "",
    country: "",
    menuKey: "",
    content: "",
    content_en: "",
    content_tr: "",
    content_ru: "",
    contentBlocks: [],
    contentBlocks_en: [],
    contentBlocks_tr: [],
    contentBlocks_ru: [],
    summary: "",
    summary_en: "",
    summary_tr: "",
    summary_ru: "",
    image: "",
    video: "",
    images: [], // Multiple images for gallery
    published: true,
  });

  const [aiBlogForm, setAiBlogForm] = useState({
    title_en: "",
    title_tr: "",
    category: "",
    country: "",
    menuKey: "",
    summary_en: "",
    summary_tr: "",
    image: "",
  });

  const [aiMarketData, setAiMarketData] = useState({
    autoPublish: false,
  });

  const [consultantForm, setConsultantForm] = useState({
    name: "",
    title: "",
    title_en: "",
    title_tr: "",
    specialty: "",
    specialty_en: "",
    specialty_tr: "",
    experience: "",
    languages: [],
    rating: 5.0,
    reviews: 0,
    phone: "",
    whatsapp: "",
    email: "",
    linkedin: "",
    image: "",
    bio: "",
    bio_en: "",
    bio_tr: "",
    available: true,
  });

  const languageOptions = [
    { value: "English", label: "English" },
    { value: "Turkish", label: "Turkish" },
    { value: "Arabic", label: "Arabic" },
    { value: "German", label: "German" },
    { value: "French", label: "French" },
    { value: "Russian", label: "Russian" },
    { value: "Mandarin", label: "Mandarin" },
    { value: "Spanish", label: "Spanish" },
    { value: "Persian", label: "Persian" },
  ];

  const [imageUploading, setImageUploading] = useState(false);
  const [testimonialImageUploading, setTestimonialImageUploading] =
    useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const openConsultantImageUpload = async () => {
    try {
      setImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) setConsultantForm((prev) => ({ ...prev, image: urls[0] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setImageUploading(false);
      setUploadProgress(null);
    }
  };

  const removeConsultantImage = () => {
    setConsultantForm((prev) => ({ ...prev, image: "" }));
  };

  const openTestimonialImageUpload = async () => {
    try {
      setTestimonialImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) setTestimonialForm((prev) => ({ ...prev, image: urls[0] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setTestimonialImageUploading(false);
      setUploadProgress(null);
    }
  };

  const removeTestimonialImage = () => {
    setTestimonialForm((prev) => ({ ...prev, image: "" }));
  };

  const [blogImageUploading, setBlogImageUploading] = useState(false);
  const [aiBlogImageUploading, setAiBlogImageUploading] = useState(false);
  const [blogVideoUploading, setBlogVideoUploading] = useState(false);
  const [blogGalleryUploading, setBlogGalleryUploading] = useState(false);
  const [blockImageUploadingIndex, setBlockImageUploadingIndex] = useState(null);
  const [blockVideoUploadingIndex, setBlockVideoUploadingIndex] = useState(null);
  const [lineImageUploadingKey, setLineImageUploadingKey] = useState(null);
  const [lineVideoUploadingKey, setLineVideoUploadingKey] = useState(null);


  const openBlogImageUpload = async () => {
    try {
      setBlogImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) setBlogForm((prev) => ({ ...prev, image: urls[0] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setBlogImageUploading(false);
      setUploadProgress(null);
    }
  };

  const openAiBlogImageUpload = async () => {
    try {
      setAiBlogImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) setAiBlogForm((prev) => ({ ...prev, image: urls[0] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setAiBlogImageUploading(false);
      setUploadProgress(null);
    }
  };

  const openBlogVideoUpload = async () => {
    try {
      setBlogVideoUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadVideos({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) setBlogForm((prev) => ({ ...prev, video: urls[0] }));
    } catch (err) {
      console.error("Video upload error:", err);
    } finally {
      setBlogVideoUploading(false);
      setUploadProgress(null);
    }
  };

  const openBlogGalleryUpload = async () => {
    try {
      setBlogGalleryUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: true, onProgress: setUploadProgress });
      if (urls.length) setBlogForm((prev) => ({ ...prev, images: [...(prev.images || []), ...urls] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setBlogGalleryUploading(false);
      setUploadProgress(null);
    }
  };

  const removeBlogImage = () => {
    setBlogForm((prev) => ({ ...prev, image: "" }));
  };

  const removeAiBlogImage = () => {
    setAiBlogForm((prev) => ({ ...prev, image: "" }));
  };

  const removeBlogVideo = () => {
    setBlogForm((prev) => ({ ...prev, video: "" }));
  };

  const removeBlogGalleryImage = (indexToRemove) => {
    setBlogForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, index) => index !== indexToRemove),
    }));
  };

  const setCoverFromGallery = (index) => {
    setBlogForm((prev) => ({
      ...prev,
      image: prev.images[index] || prev.image,
    }));
  };

  const getBlocksField = (lang) => {
    if (lang === "tr") return "contentBlocks_tr";
    if (lang === "ru") return "contentBlocks_ru";
    return "contentBlocks_en";
  };

  const addContentBlock = (lang = contentEditorLang) => {
    setBlogForm((prev) => ({
      ...prev,
      [getBlocksField(lang)]: [
        ...(prev[getBlocksField(lang)] || []),
        {
          image: "",
          video: "",
          lines: [{ text: "", icon: "•", bold: false, image: "", video: "" }],
        },
      ],
    }));
  };

  const ensureBlockLines = (block) => {
    if (Array.isArray(block.lines) && block.lines.length > 0) {
      return {
        ...block,
        lines: block.lines.map((line) => ({
          text: line?.text || "",
          icon: line?.icon ?? "•",
          bold: !!line?.bold,
          image: line?.image || "",
          video: line?.video || "",
        })),
      };
    }

    if (block.text) {
      const lines = block.text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => ({ text: line, icon: "•", bold: false, image: "", video: "" }));
      return { ...block, lines };
    }

    return {
      ...block,
      lines: [{ text: "", icon: "•", bold: false, image: "", video: "" }],
    };
  };
  const updateContentBlockLine = (blockIndex, lineIndex, data, lang = contentEditorLang) => {
    setBlogForm((prev) => {
      const blocks = [...(prev[getBlocksField(lang)] || [])];
      const block = ensureBlockLines(blocks[blockIndex] || {});
      const lines = [...(block.lines || [])];
      lines[lineIndex] = { ...(lines[lineIndex] || {}), ...data };
      blocks[blockIndex] = { ...block, lines };
      return { ...prev, [getBlocksField(lang)]: blocks };
    });
  };

  const addContentBlockLine = (blockIndex, lang = contentEditorLang) => {
    setBlogForm((prev) => {
      const blocks = [...(prev[getBlocksField(lang)] || [])];
      const block = ensureBlockLines(blocks[blockIndex] || {});
      blocks[blockIndex] = {
        ...block,
        lines: [
          ...(block.lines || []),
          { text: "", icon: "•", bold: false, image: "", video: "" },
        ],
      };
      return { ...prev, [getBlocksField(lang)]: blocks };
    });
  };
  const removeContentBlockLine = (blockIndex, lineIndex, lang = contentEditorLang) => {
    setBlogForm((prev) => {
      const blocks = [...(prev[getBlocksField(lang)] || [])];
      const block = ensureBlockLines(blocks[blockIndex] || {});
      const lines = block.lines.filter((_, idx) => idx !== lineIndex);
      blocks[blockIndex] = {
        ...block,
        lines: lines.length
          ? lines
          : [{ text: "", icon: "•", bold: false, image: "", video: "" }],
      };
      return { ...prev, [getBlocksField(lang)]: blocks };
    });
  };
  const removeContentBlock = (index, lang = contentEditorLang) => {
    setBlogForm((prev) => ({
      ...prev,
      [getBlocksField(lang)]: (prev[getBlocksField(lang)] || []).filter(
        (_, idx) => idx !== index
      ),
    }));
  };

  const openContentBlockImageUpload = async (index, lang = contentEditorLang) => {
    try {
      setBlockImageUploadingIndex(index);
      setLineImageUploadingKey(null);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length && index !== null) {
        setBlogForm((prev) => {
          const field = getBlocksField(lang);
          const blocks = [...(prev[field] || [])];
          const target = ensureBlockLines(blocks[index] || {});
          blocks[index] = { ...target, image: urls[0] };
          return { ...prev, [field]: blocks };
        });
      }
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setBlockImageUploadingIndex(null);
      setUploadProgress(null);
    }
  };

  const openContentBlockVideoUpload = async (index, lang = contentEditorLang) => {
    try {
      setBlockVideoUploadingIndex(index);
      setLineVideoUploadingKey(null);
      setUploadProgress(0);
      const urls = await pickAndUploadVideos({ multiple: false, onProgress: setUploadProgress });
      if (urls.length && index !== null) {
        setBlogForm((prev) => {
          const field = getBlocksField(lang);
          const blocks = [...(prev[field] || [])];
          const target = ensureBlockLines(blocks[index] || {});
          blocks[index] = { ...target, video: urls[0] };
          return { ...prev, [field]: blocks };
        });
      }
    } catch (err) {
      console.error("Video upload error:", err);
    } finally {
      setBlockVideoUploadingIndex(null);
      setUploadProgress(null);
    }
  };

  const getLineUploadKey = (blockIndex, lineIndex, lang = contentEditorLang) =>
    `${lang}-${blockIndex}-${lineIndex}`;

  const openContentBlockLineImageUpload = async (
    blockIndex,
    lineIndex,
    lang = contentEditorLang
  ) => {
    try {
      setBlockImageUploadingIndex(null);
      setLineImageUploadingKey(getLineUploadKey(blockIndex, lineIndex, lang));
      setUploadProgress(0);
      const urls = await pickAndUploadImages({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) {
        setBlogForm((prev) => {
          const field = getBlocksField(lang);
          const blocks = [...(prev[field] || [])];
          const target = ensureBlockLines(blocks[blockIndex] || {});
          const lines = [...(target.lines || [])];
          const line = lines[lineIndex] || { text: "", icon: "•", bold: false, image: "", video: "" };
          lines[lineIndex] = { ...line, image: urls[0] };
          blocks[blockIndex] = { ...target, lines };
          return { ...prev, [field]: blocks };
        });
      }
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setLineImageUploadingKey(null);
      setUploadProgress(null);
    }
  };

  const openContentBlockLineVideoUpload = async (
    blockIndex,
    lineIndex,
    lang = contentEditorLang
  ) => {
    try {
      setBlockVideoUploadingIndex(null);
      setLineVideoUploadingKey(getLineUploadKey(blockIndex, lineIndex, lang));
      setUploadProgress(0);
      const urls = await pickAndUploadVideos({ multiple: false, onProgress: setUploadProgress });
      if (urls.length) {
        setBlogForm((prev) => {
          const field = getBlocksField(lang);
          const blocks = [...(prev[field] || [])];
          const target = ensureBlockLines(blocks[blockIndex] || {});
          const lines = [...(target.lines || [])];
          const line = lines[lineIndex] || { text: "", icon: "•", bold: false, image: "", video: "" };
          lines[lineIndex] = { ...line, video: urls[0] };
          blocks[blockIndex] = { ...target, lines };
          return { ...prev, [field]: blocks };
        });
      }
    } catch (err) {
      console.error("Video upload error:", err);
    } finally {
      setLineVideoUploadingKey(null);
      setUploadProgress(null);
    }
  };

  const removeContentBlockLineImage = (
    blockIndex,
    lineIndex,
    lang = contentEditorLang
  ) => {
    updateContentBlockLine(blockIndex, lineIndex, { image: "" }, lang);
  };

  const removeContentBlockLineVideo = (
    blockIndex,
    lineIndex,
    lang = contentEditorLang
  ) => {
    updateContentBlockLine(blockIndex, lineIndex, { video: "" }, lang);
  };

  const removeContentBlockImage = (blockIndex, lang = contentEditorLang) => {
    setBlogForm((prev) => {
      const field = getBlocksField(lang);
      const blocks = [...(prev[field] || [])];
      const block = ensureBlockLines(blocks[blockIndex] || {});
      blocks[blockIndex] = { ...block, image: "" };
      return { ...prev, [field]: blocks };
    });
  };

  const removeContentBlockVideo = (blockIndex, lang = contentEditorLang) => {
    setBlogForm((prev) => {
      const field = getBlocksField(lang);
      const blocks = [...(prev[field] || [])];
      const block = ensureBlockLines(blocks[blockIndex] || {});
      blocks[blockIndex] = { ...block, video: "" };
      return { ...prev, [field]: blocks };
    });
  };

  const getSummaryBullets = (text) =>
    (text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 4);

  const blockIconOptions = [
    { value: "", label: "None" },
    { value: "•", label: "Dot" },
    { value: "✓", label: "Check" },
    { value: "★", label: "Star" },
    { value: "→", label: "Arrow" },
    { value: "🏛️", label: "Greece" },
    { value: "🏖️", label: "Beach" },
    { value: "🏡", label: "Home" },
    { value: "💶", label: "Euro" },
  ];

  const extractBlocksFromContent = (html = "") => {
    if (!html) return { baseContent: "", blocks: [] };
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, "text/html");
      const blockNodes = Array.from(
        doc.body.querySelectorAll('div.not-prose.blog-block, div.not-prose.grid')
      );
      const blocks = blockNodes.map((node) => {
        const blockMediaNode = node.querySelector(".blog-block-media");
        const hasDedicatedBlockMedia = Boolean(blockMediaNode);
        const img = blockMediaNode
          ? blockMediaNode.querySelector("img")
          : node.querySelector("img");
        const video = blockMediaNode
          ? blockMediaNode.querySelector("video")
          : node.querySelector("video");
        const videoSrc =
          video?.getAttribute("src") ||
          video?.querySelector("source")?.getAttribute("src") ||
          "";

        const lineNodes = Array.from(node.querySelectorAll(".blog-line-item"));
        const lines =
          lineNodes.length > 0
            ? lineNodes
                .map((lineNode) => {
                  const paragraph = lineNode.querySelector("p");
                  const text = (paragraph?.textContent || "").trim();
                  const firstToken = text ? text.split(" ")[0] : "";
                  const iconMatch = firstToken
                    ? blockIconOptions.find((option) => option.value === firstToken)
                    : null;
                  const cleanedText = iconMatch
                    ? text.replace(firstToken, "").trim()
                    : text;
                  const isBold = paragraph?.querySelector("strong") !== null;
                  const lineVideo = lineNode.querySelector("video");
                  const lineVideoSrc =
                    lineVideo?.getAttribute("src") ||
                    lineVideo?.querySelector("source")?.getAttribute("src") ||
                    "";
                  const lineImage = lineNode.querySelector("img");

                  return {
                    text: cleanedText,
                    icon: iconMatch ? iconMatch.value : "•",
                    bold: isBold,
                    image: lineImage?.getAttribute("src") || "",
                    video: lineVideoSrc,
                  };
                })
                .filter((line) => line.text || line.image || line.video)
            : Array.from(node.querySelectorAll("p"))
                .map((p) => {
                  const text = (p.textContent || "").trim();
                  if (!text) return null;
                  const firstToken = text.split(" ")[0];
                  const iconMatch = blockIconOptions.find(
                    (option) => option.value === firstToken
                  );
                  const cleanedText = iconMatch
                    ? text.replace(firstToken, "").trim()
                    : text;
                  const isBold = p.querySelector("strong") !== null;
                  return {
                    text: cleanedText,
                    icon: iconMatch ? iconMatch.value : "•",
                    bold: isBold,
                    image: "",
                    video: "",
                  };
                })
                .filter(Boolean);

        return {
          image:
            hasDedicatedBlockMedia || lineNodes.length === 0
              ? img?.getAttribute("src") || ""
              : "",
          video: hasDedicatedBlockMedia || lineNodes.length === 0 ? videoSrc : "",
          lines: lines.length
            ? lines
            : [{ text: "", icon: "•", bold: false, image: "", video: "" }],
        };
      });

      blockNodes.forEach((node) => node.remove());
      const baseContent = (doc.body.innerText || "").trim();
      return { baseContent, blocks };
    } catch (error) {
      return { baseContent: html, blocks: [] };
    }
  };
  const [propertyDetails, setPropertyDetails] = useState({
    title: "",
    description: "",
    description_en: "",
    description_tr: "",
    description_ru: "",
    price: 0,
    currency: getDefaultFiatCurrency(),
    country: "",
    city: "",
    address: "",
    image: null,
    images: [],
    facilities: {
      bedrooms: 0,
      parkings: 0,
      bathrooms: 0,
    },
    propertyType: "sale",
    category: "residential",
    consultantId: null,
    userEmail: user?.email,
    // Turkish real estate fields
    listingNo: "",
    listingDate: null,
    area: { gross: 0, net: 0 },
    rooms: "",
    buildingAge: 0,
    floor: 0,
    totalFloors: 0,
    bathrooms: 0,
    heating: "",
    kitchen: "",
    balcony: false,
    elevator: false,
    parking: "",
    furnished: false,
    usageStatus: "",
    siteName: "",
    dues: 0,
    mortgageEligible: false,
    deedStatus: "",
    imarDurumu: "",
    // Land/Arsa features
    altyapiFeatures: [],
    konumFeatures: [],
    genelOzellikler: [],
    manzaraFeatures: [],
    // Interior/Exterior features
    interiorFeatures: [],
    exteriorFeatures: [],
    muhitFeatures: [],
    // Project-specific fields (Yurt İçi Proje)
    projeHakkinda: null,
    dairePlanlari: [],
    vaziyetPlani: "",
    brochureUrl: "",
    iletisim: null,
    ozellikler: null,
    gyo: false,
  });

  // Check if current property type is local-project or international-project
  const isLocalProject = propertyDetails.propertyType === "local-project";
  const isInternationalProject =
    propertyDetails.propertyType === "international-project";
  const isProjectType = isLocalProject || isInternationalProject;

  // Fetch all bookings
  const fetchBookings = useCallback(async () => {
    if (!token) return;
    setBookingsLoading(true);
    try {
      const data = await getAdminAllBookings(token);
      setBookings(data.bookings || []);
      setTotalBookings(data.totalBookings || 0);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    } finally {
      setBookingsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchBookings();
    }
  }, [token, isAdmin, fetchBookings]);

  // Fetch all contact messages
  const fetchMessages = useCallback(async () => {
    if (!token) return;
    setMessagesLoading(true);
    try {
      const data = await getAllContactMessages(token);
      setContactMessages(data.messages || []);
      setTotalMessages(data.totalMessages || 0);
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setMessagesLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchMessages();
    }
  }, [token, isAdmin, fetchMessages]);

  // Fetch all blogs
  const fetchBlogs = useCallback(async () => {
    if (!token) return;
    setBlogsLoading(true);
    try {
      const data = await getAllBlogsAdmin(token);
      setBlogs(data.blogs || []);
      setTotalBlogs(data.totalBlogs || 0);
    } catch (error) {
      console.error("Error fetching blogs:", error);
    } finally {
      setBlogsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchBlogs();
    }
  }, [token, isAdmin, fetchBlogs]);

  // Fetch all testimonials
  const fetchTestimonials = useCallback(async () => {
    if (!token) return;
    setTestimonialsLoading(true);
    try {
      const data = await getAllTestimonialsAdmin(token);
      setTestimonials(data.testimonials || []);
      setTotalTestimonials(data.totalTestimonials || 0);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
    } finally {
      setTestimonialsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token && isAdmin) {
      fetchTestimonials();
    }
  }, [token, isAdmin, fetchTestimonials]);

  // Blog functions
  const resetBlogForm = () => {
    setBlogForm({
      title: "",
      title_en: "",
      title_tr: "",
      title_ru: "",
      category: "",
      country: "",
      menuKey: "",
      content: "",
      content_en: "",
      content_tr: "",
      content_ru: "",
      contentBlocks: [],
      contentBlocks_en: [],
      contentBlocks_tr: [],
      contentBlocks_ru: [],
      summary: "",
      summary_en: "",
      summary_tr: "",
      summary_ru: "",
      image: "",
      video: "",
      images: [],
      published: true,
    });
    setContentEditorLang("en");
  };

  const buildContentWithBlocks = (content, blocks = []) => {
    const baseContent = content || "";
    if (!blocks.length) return baseContent;

    const blockHtml = blocks
      .map((block, index) => {
        const lines = ensureBlockLines(block || {}).lines || [];
        const hasLineContent = lines.some(
          (line) => line.text?.trim() || line?.image || line?.video
        );
        const hasBlockMedia = block?.image || block?.video;
        if (!hasLineContent && !hasBlockMedia) return "";

        const lineItemsHtml = lines
          .filter((line) => line.text?.trim() || line?.image || line?.video)
          .map((line, lineIndex) => {
            const lineHasText = Boolean(line.text?.trim());
            const icon = lineHasText && line.icon ? `${line.icon} ` : "";
            const text = line.bold ? `<strong>${line.text}</strong>` : line.text || "";
            const textHtml = lineHasText ? `<p>${icon}${text}</p>` : "";
            const imageHtml = line?.image
              ? `<div class="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100"><img src="${line.image}" alt="Blog block ${index + 1} line ${lineIndex + 1}" class="w-full h-full object-cover" /></div>`
              : "";
            const videoHtml = line?.video
              ? `<div class="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100"><video src="${line.video}" controls playsinline preload="metadata" class="w-full h-full object-cover"></video></div>`
              : "";
            const mediaHtml = `${imageHtml}${videoHtml}`;

            if (mediaHtml && textHtml) {
              return `<div class="blog-line-item flex flex-col gap-4">${mediaHtml}<div>${textHtml}</div></div>`;
            }
            if (mediaHtml) {
              return `<div class="blog-line-item">${mediaHtml}</div>`;
            }
            return `<div class="blog-line-item">${textHtml}</div>`;
          })
          .join("");

        const blockImageHtml = block?.image
          ? `<div class="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100"><img src="${block.image}" alt="Blog block ${index + 1}" class="w-full h-full object-cover" /></div>`
          : "";
        const blockVideoHtml = block?.video
          ? `<div class="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100"><video src="${block.video}" controls playsinline preload="metadata" class="w-full h-full object-cover"></video></div>`
          : "";
        const blockMediaFallback = hasBlockMedia
          ? `<div class="blog-block-media flex flex-col gap-4">${blockImageHtml}${blockVideoHtml}</div>`
          : "";

        return `<div class="not-prose blog-block flex flex-col gap-6 my-10">${blockMediaFallback}${lineItemsHtml ? `<div class="space-y-4">${lineItemsHtml}</div>` : ""}</div>`;
      })
      .filter(Boolean)
      .join("");

    return `${baseContent}${blockHtml ? `${baseContent ? "\n" : ""}${blockHtml}` : ""}`;
  };

  const blockHasContent = (block) => {
    const lines = ensureBlockLines(block || {}).lines || [];
    return (
      lines.some((line) => line.text?.trim() || line?.image || line?.video) ||
      block?.image ||
      block?.video
    );
  };

  const handleCreateBlog = async () => {
    if (!token) return;
    const hasBlocksEn = (blogForm.contentBlocks_en || []).some(blockHasContent);
    const hasBlocksTr = (blogForm.contentBlocks_tr || []).some(blockHasContent);
    const hasBlocksRu = (blogForm.contentBlocks_ru || []).some(blockHasContent);
    const hasAnyContent =
      blogForm.content_en?.trim() ||
      blogForm.content_tr?.trim() ||
      blogForm.content_ru?.trim() ||
      blogForm.content?.trim() ||
      hasBlocksEn ||
      hasBlocksTr ||
      hasBlocksRu;

    const hasRequiredTitle =
      blogForm.title_en?.trim() ||
      blogForm.title_tr?.trim() ||
      blogForm.title_ru?.trim() ||
      blogForm.title?.trim();
    const hasRequiredSummary =
      blogForm.summary_en?.trim() ||
      blogForm.summary_tr?.trim() ||
      blogForm.summary_ru?.trim() ||
      blogForm.summary?.trim();
    if (
      !hasRequiredTitle ||
      !blogForm.category ||
      !hasAnyContent ||
      !hasRequiredSummary
    ) {
      toast.error(bilingualKey("toast.blogRequiredFields"), {
        position: "bottom-right",
      });
      return;
    }

    setBlogLoading(true);
    try {
      const content_en = buildContentWithBlocks(
        blogForm.content_en,
        blogForm.contentBlocks_en
      );
      const content_tr = buildContentWithBlocks(
        blogForm.content_tr,
        blogForm.contentBlocks_tr
      );
      const content_ru = buildContentWithBlocks(
        blogForm.content_ru,
        blogForm.contentBlocks_ru
      );
      const payload = {
        ...blogForm,
        title: blogForm.title_en || blogForm.title_tr || blogForm.title_ru || blogForm.title,
        summary:
          blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary,
        content: content_en || content_tr || content_ru || blogForm.content,
        content_en,
        content_tr,
        content_ru,
      };
      if (!payload.image && payload.images?.length) {
        payload.image = payload.images[0];
      }
      delete payload.contentBlocks;
      delete payload.contentBlocks_en;
      delete payload.contentBlocks_tr;
      delete payload.contentBlocks_ru;
      await createBlog(payload, token);
      toast.success(bilingualKey("toast.blogCreatedSuccess"), {
        position: "bottom-right",
      });
      setBlogModalOpened(false);
      resetBlogForm();
      fetchBlogs();
    } catch (error) {
      console.error("Create blog error:", error);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleEditBlog = (blog) => {
    const fallbackImage =
      !blog.image && blog.images?.length ? blog.images[0] : blog.image;
    const { baseContent: baseEn, blocks: blocksEn } = extractBlocksFromContent(
      blog.content_en || blog.content || ""
    );
    const { baseContent: baseTr, blocks: blocksTr } = extractBlocksFromContent(
      blog.content_tr || ""
    );
    const { baseContent: baseRu, blocks: blocksRu } = extractBlocksFromContent(
      blog.content_ru || ""
    );
    setSelectedBlog(blog);
    setBlogForm({
      title: blog.title || "",
      title_en: blog.title_en || blog.title || "",
      title_tr: blog.title_tr || "",
      title_ru: blog.title_ru || "",
      category: blog.category || "",
      country: blog.country || "",
      menuKey: blog.menuKey || "",
      content: blog.content || baseEn || "",
      content_en: baseEn,
      content_tr: baseTr,
      content_ru: baseRu,
      contentBlocks: [],
      contentBlocks_en: blocksEn || [],
      contentBlocks_tr: blocksTr || [],
      contentBlocks_ru: blocksRu || [],
      summary: blog.summary || "",
      summary_en: blog.summary_en || blog.summary || "",
      summary_tr: blog.summary_tr || "",
      summary_ru: blog.summary_ru || "",
      image: fallbackImage || "",
      video: blog.video || "",
      images: blog.images || [],
      published: blog.published !== undefined ? blog.published : true,
    });
    setContentEditorLang("en");
    setEditBlogModalOpened(true);
  };

  const handleUpdateBlog = async () => {
    if (!selectedBlog || !token) return;

    const hasBlocksEn = (blogForm.contentBlocks_en || []).some(blockHasContent);
    const hasBlocksTr = (blogForm.contentBlocks_tr || []).some(blockHasContent);
    const hasBlocksRu = (blogForm.contentBlocks_ru || []).some(blockHasContent);
    const hasAnyContent =
      blogForm.content_en?.trim() ||
      blogForm.content_tr?.trim() ||
      blogForm.content_ru?.trim() ||
      blogForm.content?.trim() ||
      hasBlocksEn ||
      hasBlocksTr ||
      hasBlocksRu;
    const hasRequiredTitle =
      blogForm.title_en?.trim() ||
      blogForm.title_tr?.trim() ||
      blogForm.title_ru?.trim() ||
      blogForm.title?.trim();
    const hasRequiredSummary =
      blogForm.summary_en?.trim() ||
      blogForm.summary_tr?.trim() ||
      blogForm.summary_ru?.trim() ||
      blogForm.summary?.trim();

    if (
      !hasRequiredTitle ||
      !blogForm.category ||
      !hasAnyContent ||
      !hasRequiredSummary
    ) {
      toast.error(bilingualKey("toast.blogRequiredFields"), {
        position: "bottom-right",
      });
      return;
    }

    setBlogLoading(true);
    try {
      const content_en = buildContentWithBlocks(
        blogForm.content_en,
        blogForm.contentBlocks_en
      );
      const content_tr = buildContentWithBlocks(
        blogForm.content_tr,
        blogForm.contentBlocks_tr
      );
      const content_ru = buildContentWithBlocks(
        blogForm.content_ru,
        blogForm.contentBlocks_ru
      );
      const payload = {
        ...blogForm,
        title: blogForm.title_en || blogForm.title_tr || blogForm.title_ru || blogForm.title,
        summary:
          blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary,
        content: content_en || content_tr || content_ru || blogForm.content,
        content_en,
        content_tr,
        content_ru,
      };
      if (!payload.image && payload.images?.length) {
        payload.image = payload.images[0];
      }
      delete payload.contentBlocks;
      delete payload.contentBlocks_en;
      delete payload.contentBlocks_tr;
      delete payload.contentBlocks_ru;
      await updateBlog(selectedBlog.id, payload, token);
      toast.success(bilingualKey("toast.blogUpdatedSuccess"), {
        position: "bottom-right",
      });
      setEditBlogModalOpened(false);
      setSelectedBlog(null);
      resetBlogForm();
      fetchBlogs();
    } catch (error) {
      console.error("Update blog error:", error);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleDeleteBlogClick = (blog) => {
    setBlogToDelete(blog);
    setDeleteBlogModalOpened(true);
  };

  const confirmDeleteBlog = async () => {
    if (!blogToDelete || !token) return;

    setBlogLoading(true);
    try {
      await deleteBlog(blogToDelete.id, token);
      toast.success(bilingualKey("toast.blogDeletedSuccess"), {
        position: "bottom-right",
      });
      setDeleteBlogModalOpened(false);
      setBlogToDelete(null);
      fetchBlogs();
    } catch (error) {
      console.error("Delete blog error:", error);
    } finally {
      setBlogLoading(false);
    }
  };

  const handleTogglePublish = async (blog) => {
    if (!token) return;
    try {
      await toggleBlogPublish(blog.id, token);
      fetchBlogs();
    } catch (error) {
      console.error("Toggle publish error:", error);
    }
  };

  const resetAiMarketData = () => {
    setAiMarketData({
      autoPublish: false,
    });
  };

  const resetAiBlogForm = () => {
    setAiBlogForm({
      title_en: "",
      title_tr: "",
      category: "",
      country: "",
      menuKey: "",
      summary_en: "",
      summary_tr: "",
      image: "",
    });
    setAiBlogImageUploading(false);
  };

  const handleGenerateAIBlog = async () => {
    if (!token) return;
    setAiGenerating(true);
    try {
      const marketData = {};

      const blogMeta = {
        title_en: aiBlogForm.title_en?.trim(),
        title_tr: aiBlogForm.title_tr?.trim(),
        category: aiBlogForm.category?.trim(),
        country: aiBlogForm.country?.trim(),
        menuKey: aiBlogForm.menuKey?.trim(),
        summary_en: aiBlogForm.summary_en?.trim(),
        summary_tr: aiBlogForm.summary_tr?.trim(),
        image: aiBlogForm.image?.trim(),
      };
      const sanitizedBlogMeta = Object.fromEntries(
        Object.entries(blogMeta).filter(([, value]) => value)
      );

      await generateAIBlog(
        marketData,
        aiMarketData.autoPublish,
        sanitizedBlogMeta,
        token
      );
      
      toast.success(bilingualKey("toast.aiBlogGeneratedSuccess"), {
        position: "bottom-right",
        autoClose: 5000,
      });
      
      setAiGenerateModalOpened(false);
      resetAiMarketData();
      resetAiBlogForm();
      fetchBlogs();
    } catch (error) {
      console.error("AI generation error:", error);
      // Error toast is handled by the API function
    } finally {
      setAiGenerating(false);
    }
  };

  // Testimonial functions
  const resetTestimonialForm = () => {
    setTestimonialForm({
      name: "",
      role: "",
      company: "",
      comment_tr: "",
      comment_en: "",
      staffBehavior: "",
      rating: 5,
      image: "",
      published: true,
    });
  };

  const handleCreateTestimonial = async () => {
    if (!token) return;
    if (
      !testimonialForm.name ||
      !testimonialForm.comment_tr ||
      !testimonialForm.comment_en
    ) {
      toast.error(bilingualKey("toast.testimonialRequiredFields"), {
        position: "bottom-right",
      });
      return;
    }

    setTestimonialLoading(true);
    try {
      const payload = {
        ...testimonialForm,
        comment:
          testimonialForm.comment_tr ||
          testimonialForm.comment_en ||
          "",
      };
      await createTestimonial(payload, token);
      toast.success(bilingualKey("toast.testimonialCreatedSuccess"), {
        position: "bottom-right",
      });
      setTestimonialModalOpened(false);
      resetTestimonialForm();
      fetchTestimonials();
    } catch (error) {
      console.error("Create testimonial error:", error);
    } finally {
      setTestimonialLoading(false);
    }
  };

  const handleEditTestimonial = (testimonial) => {
    setSelectedTestimonial(testimonial);
    const fallbackComment = testimonial.comment || "";
    setTestimonialForm({
      name: testimonial.name || "",
      role: testimonial.role || "",
      company: testimonial.company || "",
      comment_tr: testimonial.comment_tr || fallbackComment,
      comment_en: testimonial.comment_en || fallbackComment,
      staffBehavior: testimonial.staffBehavior || "",
      rating: testimonial.rating || 5,
      image: testimonial.image || "",
      published:
        testimonial.published !== undefined ? testimonial.published : true,
    });
    setEditTestimonialModalOpened(true);
  };

  const handleUpdateTestimonial = async () => {
    if (!selectedTestimonial || !token) return;
    if (
      !testimonialForm.name ||
      !testimonialForm.comment_tr ||
      !testimonialForm.comment_en
    ) {
      toast.error(bilingualKey("toast.testimonialRequiredFields"), {
        position: "bottom-right",
      });
      return;
    }

    setTestimonialLoading(true);
    try {
      const payload = {
        ...testimonialForm,
        comment:
          testimonialForm.comment_tr ||
          testimonialForm.comment_en ||
          "",
      };
      await updateTestimonial(
        selectedTestimonial.id,
        payload,
        token
      );
      toast.success(bilingualKey("toast.testimonialUpdatedSuccess"), {
        position: "bottom-right",
      });
      setEditTestimonialModalOpened(false);
      setSelectedTestimonial(null);
      resetTestimonialForm();
      fetchTestimonials();
    } catch (error) {
      console.error("Update testimonial error:", error);
    } finally {
      setTestimonialLoading(false);
    }
  };

  const handleDeleteTestimonialClick = (testimonial) => {
    setTestimonialToDelete(testimonial);
    setDeleteTestimonialModalOpened(true);
  };

  const confirmDeleteTestimonial = async () => {
    if (!testimonialToDelete || !token) return;

    setTestimonialLoading(true);
    try {
      await deleteTestimonial(testimonialToDelete.id, token);
      toast.success(bilingualKey("toast.testimonialDeletedSuccess"), {
        position: "bottom-right",
      });
      setDeleteTestimonialModalOpened(false);
      setTestimonialToDelete(null);
      fetchTestimonials();
    } catch (error) {
      console.error("Delete testimonial error:", error);
    } finally {
      setTestimonialLoading(false);
    }
  };

  const handleToggleTestimonialPublish = async (testimonial) => {
    if (!token) return;
    try {
      await toggleTestimonialPublish(testimonial.id, token);
      fetchTestimonials();
    } catch (error) {
      console.error("Toggle testimonial publish error:", error);
    }
  };

  // Handle delete contact message
  const handleDeleteMessage = async (messageId) => {
    if (!token || !messageId) return;

    try {
      await deleteContactMessage(messageId, token);
      toast.success(bilingualKey("toast.messageDeletedSuccess"), {
        position: "bottom-right",
      });
      fetchMessages();
    } catch (error) {
      console.error("Delete message error:", error);
      toast.error(bilingualKey("toast.messageDeleteFailed"), {
        position: "bottom-right",
      });
    }
  };

  // Handle edit property
  const handleEditProperty = (property) => {
    setSelectedProperty(property);
    setEditModalOpened(true);
  };

  // Handle delete property
  const handleDeleteClick = (property) => {
    setPropertyToDelete(property);
    setDeleteModalOpened(true);
  };

  const confirmDelete = async () => {
    if (!propertyToDelete || !token) return;

    setDeleteLoading(true);
    try {
      await deleteResidency(propertyToDelete.id, token);
      toast.success(bilingualKey("toast.deleteOperationSuccess"), {
        position: "bottom-right",
      });
      setDeleteModalOpened(false);
      setPropertyToDelete(null);
      refetchProperties();
    } catch (error) {
      console.error("Delete error:", error);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Consultant functions
  const resetConsultantForm = () => {
    setConsultantForm({
      name: "",
      title: "",
      title_en: "",
      title_tr: "",
      specialty: "",
      specialty_en: "",
      specialty_tr: "",
      experience: "",
      languages: [],
      rating: 5.0,
      reviews: 0,
      phone: "",
      whatsapp: "",
      email: "",
      linkedin: "",
      image: "",
      bio: "",
      bio_en: "",
      bio_tr: "",
      available: true,
    });
  };

  const handleCreateConsultant = async () => {
    if (!token) return;
    if (
      !consultantForm.name ||
      !consultantForm.email ||
      !consultantForm.phone
    ) {
      toast.error(bilingualKey("toast.consultantRequiredFields"), {
        position: "bottom-right",
      });
      return;
    }

    setConsultantLoading(true);
    try {
      await createConsultant(consultantForm, token);
      toast.success(bilingualKey("toast.consultantAddedSuccess"), {
        position: "bottom-right",
      });
      setConsultantModalOpened(false);
      resetConsultantForm();
      refetchConsultants();
    } catch (error) {
      console.error("Create consultant error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to add consultant";
      toast.error(
        bilingualFromMessage(errorMessage, "toast.consultantCreateError"),
        {
          position: "bottom-right",
        }
      );
    } finally {
      setConsultantLoading(false);
    }
  };

  const handleEditConsultant = (consultant) => {
    setSelectedConsultant(consultant);
    setConsultantForm({
      name: consultant.name || "",
      title: consultant.title || "",
      title_en: consultant.title_en || "",
      title_tr: consultant.title_tr || "",
      specialty: consultant.specialty || "",
      specialty_en: consultant.specialty_en || "",
      specialty_tr: consultant.specialty_tr || "",
      experience: consultant.experience || "",
      languages: consultant.languages || [],
      rating: consultant.rating || 5.0,
      reviews: consultant.reviews || 0,
      phone: consultant.phone || "",
      whatsapp: consultant.whatsapp || "",
      email: consultant.email || "",
      linkedin: consultant.linkedin || "",
      image: consultant.image || "",
      bio: consultant.bio || "",
      bio_en: consultant.bio_en || "",
      bio_tr: consultant.bio_tr || "",
      available:
        consultant.available !== undefined ? consultant.available : true,
    });
    setEditConsultantModalOpened(true);
  };

  const handleUpdateConsultant = async () => {
    if (!selectedConsultant || !token) return;

    setConsultantLoading(true);
    try {
      await updateConsultant(selectedConsultant.id, consultantForm, token);
      toast.success(bilingualKey("toast.consultantUpdatedSuccess"), {
        position: "bottom-right",
      });
      setEditConsultantModalOpened(false);
      setSelectedConsultant(null);
      resetConsultantForm();
      refetchConsultants();
    } catch (error) {
      console.error("Update consultant error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update consultant";
      toast.error(
        bilingualFromMessage(errorMessage, "toast.consultantUpdateError"),
        {
          position: "bottom-right",
        }
      );
    } finally {
      setConsultantLoading(false);
    }
  };

  const handleDeleteConsultantClick = (consultant) => {
    setConsultantToDelete(consultant);
    setDeleteConsultantModalOpened(true);
  };

  const confirmDeleteConsultant = async () => {
    if (!consultantToDelete || !token) return;

    setConsultantLoading(true);
    try {
      await deleteConsultant(consultantToDelete.id, token);
      toast.success(bilingualKey("toast.consultantDeletedSuccess"), {
        position: "bottom-right",
      });
      setDeleteConsultantModalOpened(false);
      setConsultantToDelete(null);
      refetchConsultants();
    } catch (error) {
      console.error("Delete consultant error:", error);
    } finally {
      setConsultantLoading(false);
    }
  };

  const handleToggleAvailability = async (consultant) => {
    if (!token) return;
    try {
      await toggleConsultantAvailability(consultant.id, token);
      refetchConsultants();
    } catch (error) {
      console.error("Toggle availability error:", error);
    }
  };

  // All flows complete in 4 steps.
  // Project types skip "Detaylar" and go directly to "Proje Detayları".
  const maxSteps = 4;

  const nextStep = () => {
    setActive((current) => (current < maxSteps ? current + 1 : current));
  };

  const prevStep = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  const resetForm = () => {
    setPropertyDetails({
      title: "",
      description: "",
      description_en: "",
      description_tr: "",
      description_ru: "",
      price: 0,
      currency: getDefaultFiatCurrency(),
      country: "",
      city: "",
      address: "",
      image: null,
      images: [],
      facilities: {
        bedrooms: 0,
        parkings: 0,
        bathrooms: 0,
      },
      propertyType: "sale",
      category: "residential",
      consultantId: null,
      userEmail: user?.email,
      // Turkish real estate fields
      listingNo: "",
      listingDate: null,
      area: { gross: 0, net: 0 },
      rooms: "",
      buildingAge: 0,
      floor: 0,
      totalFloors: 0,
      bathrooms: 0,
      heating: "",
      kitchen: "",
      balcony: false,
      elevator: false,
      parking: "",
      furnished: false,
      usageStatus: "",
      siteName: "",
      dues: 0,
      mortgageEligible: false,
      deedStatus: "",
      imarDurumu: "",
      // Land/Arsa features
      altyapiFeatures: [],
      konumFeatures: [],
      genelOzellikler: [],
      manzaraFeatures: [],
      // Interior/Exterior features
      interiorFeatures: [],
      exteriorFeatures: [],
      muhitFeatures: [],
      // Project-specific fields
      projeHakkinda: null,
      dairePlanlari: [],
      vaziyetPlani: "",
      brochureUrl: "",
      iletisim: null,
      ozellikler: null,
      gyo: false,
    });
    setActive(0);
  };

  // Loading states
  if (authLoading || adminLoading) {
    return (
      <div className="min-h-screen flexCenter bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary mx-auto mb-4"></div>
          <p className="text-gray-600">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flexCenter bg-gray-50">
        <Paper shadow="md" p="xl" radius="md" className="text-center max-w-md">
          <div className="mb-4 flex justify-center">
            <MdBlock className="text-red-500 text-7xl" />
          </div>
          <Title order={3} className="mb-2">
            Yetkisiz Erişim
          </Title>
          <Text color="dimmed" className="mb-4">
            Yönetim paneline erişim yetkiniz bulunmamaktadır.
          </Text>
          <Button onClick={() => navigate("/")} color="gray">
            Ana Sayfaya Dön
          </Button>
        </Paper>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <UploadProgressBar progress={uploadProgress} floating />
      <Container size="xl">
        {/* Admin Header */}
        <Paper shadow="sm" p="lg" radius="md" className="mb-6">
          <div className="flexBetween flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-secondary text-white p-3 rounded-full">
                <MdDashboard size={24} />
              </div>
              <div>
                <Title order={2} className="text-gray-800">
                  Yönetim Paneli
                </Title>
                <Text size="sm" color="dimmed">
                  Hoş geldiniz, {user?.name || user?.email}
                </Text>
              </div>
            </div>
            <Badge size="lg" color="green" variant="light">
              Admin
            </Badge>
          </div>
        </Paper>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "addProperty" ? "border-2 border-secondary" : ""
            }`}
            onClick={() => setActiveTab("addProperty")}
          >
            <Group>
              <div className="bg-secondary/10 text-secondary p-3 rounded-full">
                <MdAddHome size={24} />
              </div>
              <div>
                <Text fw={600}>Add New Property</Text>
                <Text size="sm" color="dimmed">
                  Add new property to system
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "propertyList" ? "border-2 border-blue-500" : ""
            }`}
            onClick={() => setActiveTab("propertyList")}
          >
            <Group>
              <div className="bg-blue-100 text-blue-600 p-3 rounded-full">
                <MdList size={24} />
              </div>
              <div>
                <Text fw={600}>Property List</Text>
                <Text size="sm" color="dimmed">
                  {properties?.length || 0} registered properties
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "consultants" ? "border-2 border-purple-500" : ""
            }`}
            onClick={() => setActiveTab("consultants")}
          >
            <Group>
              <div className="bg-purple-100 text-purple-600 p-3 rounded-full">
                <MdPeople size={24} />
              </div>
              <div>
                <Text fw={600}>Consultants</Text>
                <Text size="sm" color="dimmed">
                  {consultants?.length || 0} registered consultants
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "messages" ? "border-2 border-orange-500" : ""
            }`}
            onClick={() => setActiveTab("messages")}
          >
            <Group>
              <div className="bg-orange-100 text-orange-600 p-3 rounded-full">
                <MdMessage size={24} />
              </div>
              <div>
                <Text fw={600}>Mesajlar</Text>
                <Text size="sm" color="dimmed">
                  {totalMessages} contact message
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "blogs" ? "border-2 border-teal-500" : ""
            }`}
            onClick={() => setActiveTab("blogs")}
          >
            <Group>
              <div className="bg-teal-100 text-teal-600 p-3 rounded-full">
                <MdArticle size={24} />
              </div>
              <div>
                <Text fw={600}>Blogs</Text>
                <Text size="sm" color="dimmed">
                  {totalBlogs} blog posts
                </Text>
              </div>
            </Group>
          </Paper>

          <Paper
            shadow="sm"
            p="lg"
            radius="md"
            className={`cursor-pointer hover:shadow-md transition-shadow ${
              activeTab === "testimonials" ? "border-2 border-pink-500" : ""
            }`}
            onClick={() => setActiveTab("testimonials")}
          >
            <Group>
              <div className="bg-pink-100 text-pink-600 p-3 rounded-full">
                <MdRateReview size={24} />
              </div>
              <div>
                <Text fw={600}>Testimonials</Text>
                <Text size="sm" color="dimmed">
                  {totalTestimonials} reviews
                </Text>
              </div>
            </Group>
          </Paper>
        </div>

        {/* Property List Section */}
        {activeTab === "propertyList" && (
          <Paper shadow="sm" p="xl" radius="md" className="mb-6">
            <div className="flexBetween mb-6">
              <div>
                <Title
                  order={3}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <MdList className="text-blue-500" />
                  Property List
                </Title>
                <Text size="sm" color="dimmed" className="mt-1">
                  View, edit or delete all registered properties
                </Text>
              </div>
              <Button
                variant="light"
                color="blue"
                leftSection={<MdRefresh size={18} />}
                onClick={() => refetchProperties()}
                loading={propertiesLoading}
              >
                Yenile
              </Button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              <Button
                variant={propertyFilter === "all" ? "filled" : "light"}
                color="gray"
                size="sm"
                onClick={() => setPropertyFilter("all")}
              >
                Tümü ({properties?.length || 0})
              </Button>
              <Button
                variant={propertyFilter === "sale" ? "filled" : "light"}
                color="green"
                size="sm"
                onClick={() => setPropertyFilter("sale")}
              >
                Satılık ({properties?.filter((p) => p.propertyType === "sale").length || 0})
              </Button>
              <Button
                variant={propertyFilter === "local-project" ? "filled" : "light"}
                color="blue"
                size="sm"
                onClick={() => setPropertyFilter("local-project")}
              >
                Yurt İçi Projeler ({properties?.filter((p) => p.propertyType === "local-project").length || 0})
              </Button>
              <Button
                variant={propertyFilter === "international-project" ? "filled" : "light"}
                color="blue"
                size="sm"
                onClick={() => setPropertyFilter("international-project")}
              >
                Yurt Dışı Projeler ({properties?.filter((p) => p.propertyType === "international-project").length || 0})
              </Button>
            </div>

            <Divider className="mb-6" />

            {propertiesLoading ? (
              <div className="flexCenter py-12">
                <Loader color="blue" />
              </div>
            ) : !properties || properties.length === 0 ? (
              <div className="text-center py-12">
                <MdHome size={64} className="text-gray-300 mx-auto mb-4" />
                <Text color="dimmed">No properties registered yet</Text>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Property</Table.Th>
                      <Table.Th>Konum</Table.Th>
                      <Table.Th>Fiyat</Table.Th>
                      <Table.Th>Tür</Table.Th>
                      <Table.Th>Consultant</Table.Th>
                      <Table.Th>İşlemler</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {properties
                      .filter((p) => propertyFilter === "all" || p.propertyType === propertyFilter)
                      .map((property) => (
                      <Table.Tr key={property.id}>
                        <Table.Td>
                          <div className="flex items-center gap-3">
                            {property.image && (
                              <img
                                src={property.image}
                                alt={property.title}
                                className="w-14 h-14 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <Text size="sm" fw={500} lineClamp={1} maw={200}>
                                {property.title}
                              </Text>
                              <Text
                                size="xs"
                                color="dimmed"
                                lineClamp={1}
                                maw={200}
                              >
                                {property.address}
                              </Text>
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div className="flex items-center gap-1">
                            <MdHome size={16} className="text-gray-400" />
                            <Text size="sm">
                              {property.city}, {property.country}
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} color="green">
                            {(() => {
                              let displayPrice = property.price;
                              let displayCurrency = property.currency;
                              if (!displayPrice || displayPrice === 0) {
                                if (property.dairePlanlari?.length > 0) {
                                  const prices = property.dairePlanlari
                                    .map(plan => plan.fiyat || plan.fiyatUSD || 0)
                                    .filter(p => p > 0);
                                  if (prices.length > 0) {
                                    displayPrice = Math.min(...prices);
                                    if (!displayCurrency) {
                                      const firstPlan = property.dairePlanlari.find(plan => (plan.fiyat || plan.fiyatUSD) > 0);
                                      displayCurrency = firstPlan?.currency || "USD";
                                    }
                                  }
                                }
                              }
                              return displayPrice > 0
                                ? `${getCurrencySymbol(displayCurrency)}${displayPrice.toLocaleString()}`
                                : `${getCurrencySymbol(displayCurrency || "USD")}0`;
                            })()}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              property.propertyType === "sale"
                                ? "green"
                                : property.propertyType === "local-project"
                                ? "blue"
                                : property.propertyType === "international-project"
                                ? "blue"
                                : "red"
                            }
                            variant="light"
                          >
                            {property.propertyType === "sale"
                              ? "SATILIK"
                              : property.propertyType === "local-project"
                              ? "YURT İÇİ PROJE"
                              : property.propertyType === "international-project"
                              ? "YURT DIŞI PROJE"
                              : "SPECIAL OFFER"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          {property.consultant ? (
                            <div className="flex items-center gap-2">
                              <Avatar
                                src={property.consultant.image}
                                size="sm"
                                radius="xl"
                              />
                              <div>
                                <Text size="xs" fw={500}>
                                  {property.consultant.name}
                                </Text>
                                <Text size="xs" color="dimmed">
                                  {property.consultant.phone}
                                </Text>
                              </div>
                            </div>
                          ) : (
                            <Badge color="gray" variant="light" size="sm">
                              Not Assigned
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="lg"
                              onClick={() => handleEditProperty(property)}
                              title="Düzenle"
                            >
                              <MdEdit size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="lg"
                              onClick={() => handleDeleteClick(property)}
                              title="Sil"
                            >
                              <MdDelete size={18} />
                            </ActionIcon>
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() =>
                                navigate(
                                  property.propertyType === "local-project" ||
                                    property.propertyType === "international-project"
                                    ? resolveProjectPath(property)
                                    : `/listing/${property.id}`
                                )
                              }
                            >
                              Görüntüle
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {/* Properties Summary */}
            {properties && properties.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Text size="sm" color="dimmed">
                    Total: {properties.length} properties
                  </Text>
                  <div className="flex gap-4">
                    <Text size="sm" color="dimmed">
                      Satılık:{" "}
                      {
                        properties.filter((p) => p.propertyType === "sale")
                          .length
                      }
                    </Text>
                    <Text size="sm" color="dimmed">
                      Yurt İçi Proje:{" "}
                      {
                        properties.filter(
                          (p) => p.propertyType === "local-project"
                        ).length
                      }
                    </Text>
                    <Text size="sm" color="dimmed">
                      Yurt Dışı Proje:{" "}
                      {
                        properties.filter(
                          (p) => p.propertyType === "international-project"
                        ).length
                      }
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </Paper>
        )}

        {/* Consultants Section */}
        {activeTab === "consultants" && (
          <Paper shadow="sm" p="xl" radius="md" className="mb-6">
            <div className="flexBetween mb-6">
              <div>
                <Title
                  order={3}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <MdPeople className="text-purple-500" />
                  Consultant Management
                </Title>
                <Text size="sm" color="dimmed" className="mt-1">
                  View, add, edit or delete consultants
                </Text>
              </div>
              <Group>
                <Button
                  variant="light"
                  color="purple"
                  leftSection={<MdRefresh size={18} />}
                  onClick={() => refetchConsultants()}
                  loading={consultantsLoading}
                >
                  Yenile
                </Button>
                <Button
                  color="grape"
                  leftSection={<MdPersonAdd size={18} />}
                  onClick={() => setConsultantModalOpened(true)}
                >
                  Add New Consultant
                </Button>
              </Group>
            </div>

            <Divider className="mb-6" />

            {consultantsLoading ? (
              <div className="flexCenter py-12">
                <Loader color="grape" />
              </div>
            ) : !consultants || consultants.length === 0 ? (
              <div className="text-center py-12">
                <MdPeople size={64} className="text-gray-300 mx-auto mb-4" />
                <Text color="dimmed">No consultants registered yet</Text>
                <Button
                  color="grape"
                  className="mt-4"
                  leftSection={<MdPersonAdd size={18} />}
                  onClick={() => setConsultantModalOpened(true)}
                >
                  Add First Consultant
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 40 }}></Table.Th>
                        <Table.Th>Consultant</Table.Th>
                        <Table.Th>Uzmanlık</Table.Th>
                        <Table.Th>Contact</Table.Th>
                        <Table.Th>İstatistik</Table.Th>
                        <Table.Th>Durum</Table.Th>
                        <Table.Th>İşlemler</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      <SortableContext
                        items={consultantIds}
                        strategy={verticalListSortingStrategy}
                      >
                        {orderedConsultants.map((consultant) => (
                          <SortableTableRow
                            key={consultant.id}
                            consultant={consultant}
                          >
                            <Table.Td>
                              <div className="flex items-center gap-3">
                                <Avatar
                                  src={consultant.image}
                                  alt={consultant.name}
                                  radius="xl"
                                  size="lg"
                                />
                                <div>
                                  <Text size="sm" fw={600}>
                                    {consultant.name}
                                  </Text>
                                  <Text size="xs" color="dimmed">
                                    {consultant.title}
                                  </Text>
                                  <Text size="xs" color="dimmed">
                                    {consultant.experience} deneyim
                                  </Text>
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <div>
                                <Text size="sm" fw={500}>
                                  {consultant.specialty}
                                </Text>
                                <Text size="xs" color="dimmed">
                                  {consultant.languages?.join(", ")}
                                </Text>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <div className="space-y-1">
                                <div className="flex items-center gap-1">
                                  <MdPhone
                                    size={14}
                                    className="text-gray-400"
                                  />
                                  <Text size="xs">{consultant.phone}</Text>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MdEmail
                                    size={14}
                                    className="text-gray-400"
                                  />
                                  <Text size="xs">{consultant.email}</Text>
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <div className="flex items-center gap-3">
                                <div className="text-center">
                                  <div className="flex items-center gap-1">
                                    <FaStar className="text-amber-500 text-xs" />
                                    <Text size="sm" fw={600}>
                                      {consultant.rating}
                                    </Text>
                                  </div>
                                  <Text size="xs" color="dimmed">
                                    {consultant.reviews} yorum
                                  </Text>
                                </div>
                              </div>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                color={consultant.available ? "green" : "gray"}
                                variant="light"
                                className="cursor-pointer"
                                onClick={() =>
                                  handleToggleAvailability(consultant)
                                }
                              >
                                {consultant.available ? "Müsait" : "Meşgul"}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Group gap="xs">
                                <ActionIcon
                                  variant="light"
                                  color="blue"
                                  size="lg"
                                  onClick={() =>
                                    handleEditConsultant(consultant)
                                  }
                                  title="Düzenle"
                                >
                                  <MdEdit size={18} />
                                </ActionIcon>
                                <ActionIcon
                                  variant="light"
                                  color="red"
                                  size="lg"
                                  onClick={() =>
                                    handleDeleteConsultantClick(consultant)
                                  }
                                  title="Sil"
                                >
                                  <MdDelete size={18} />
                                </ActionIcon>
                              </Group>
                            </Table.Td>
                          </SortableTableRow>
                        ))}
                      </SortableContext>
                    </Table.Tbody>
                  </Table>
                </DndContext>
              </div>
            )}

            {/* Consultants Summary */}
            {consultants && consultants.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Text size="sm" color="dimmed">
                    Total: {consultants.length} consultants
                  </Text>
                  <div className="flex gap-4">
                    <Text size="sm" color="dimmed">
                      Müsait: {consultants.filter((c) => c.available).length}
                    </Text>
                    <Text size="sm" color="dimmed">
                      Meşgul: {consultants.filter((c) => !c.available).length}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </Paper>
        )}

        {/* Contact Messages Section */}
        {activeTab === "messages" && (
          <Paper shadow="sm" p="xl" radius="md" className="mb-6">
            <div className="flexBetween mb-6">
              <div>
                <Title
                  order={3}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <MdMessage className="text-orange-500" />
                  İletişim Mesajları
                </Title>
                <Text size="sm" color="dimmed" className="mt-1">
                  Form üzerinden gönderilen tüm mesajlar
                </Text>
              </div>
              <Group>
                <Button
                  variant="light"
                  color="orange"
                  leftSection={<MdRefresh size={18} />}
                  onClick={() => fetchMessages()}
                  loading={messagesLoading}
                >
                  Yenile
                </Button>
              </Group>
            </div>

            <Divider className="mb-6" />

            {messagesLoading ? (
              <div className="flexCenter py-12">
                <Loader color="orange" />
              </div>
            ) : contactMessages.length === 0 ? (
              <div className="text-center py-12">
                <MdMessage size={64} className="text-gray-300 mx-auto mb-4" />
                <Text color="dimmed">Henüz mesaj bulunmamaktadır</Text>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Gönderen</Table.Th>
                      <Table.Th>İletişim</Table.Th>
                      <Table.Th>ملک</Table.Th>
                      <Table.Th>Konu</Table.Th>
                      <Table.Th>Danışman</Table.Th>
                      <Table.Th>Mesaj</Table.Th>
                      <Table.Th>Tarih</Table.Th>
                      <Table.Th>Aksiyon</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {contactMessages.map((m) => (
                      <Table.Tr key={m.id}>
                        <Table.Td>
                          <div className="flex items-center gap-2">
                            <Avatar
                              radius="xl"
                              size="md"
                              color="cyan"
                              variant="light"
                            >
                              {m.name?.[0]?.toUpperCase() || "?"}
                            </Avatar>
                            <div>
                              <Text size="sm" fw={500}>
                                {m.name || "AI visitor"}
                              </Text>
                              {m.leadSource === "ai_agent" && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <Badge color="teal" variant="light" size="xs">
                                    AI Agent
                                  </Badge>
                                  {m.leadTemperature ? (
                                    <Badge
                                      color={
                                        m.leadTemperature === "hot"
                                          ? "red"
                                          : m.leadTemperature === "warm"
                                          ? "orange"
                                          : "gray"
                                      }
                                      variant="light"
                                      size="xs"
                                    >
                                      {m.leadTemperature}
                                    </Badge>
                                  ) : null}
                                  {typeof m.leadScore === "number" ? (
                                    <Badge color="blue" variant="light" size="xs">
                                      {m.leadScore}
                                    </Badge>
                                  ) : null}
                                </div>
                              )}
                              {m.phone && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <MdPhone size={12} />
                                  {m.phone}
                                </div>
                              )}
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div className="flex items-center gap-1 text-xs text-gray-600">
                            <MdEmail size={14} className="text-gray-400" />
                            <Text size="xs" className="truncate max-w-[180px]">
                              {m.email || "-"}
                            </Text>
                          </div>
                          {m.preferredLanguage && (
                            <Text size="xs" color="dimmed" className="mt-1 uppercase">
                              {m.preferredLanguage}
                            </Text>
                          )}
                        </Table.Td>
                        <Table.Td>
                          {m.propertyTitle ? (
                            <div className="max-w-[200px]">
                              <Text
                                size="xs"
                                fw={500}
                                lineClamp={2}
                                className="text-green-600"
                              >
                                {m.propertyTitle}
                              </Text>
                              {m.propertyId && (
                                <Button
                                  variant="subtle"
                                  size="xs"
                                  compact
                                  onClick={() =>
                                    navigate(`/listing/${m.propertyId}`)
                                  }
                                  className="mt-1"
                                >
                                  مشاهده ملک
                                </Button>
                              )}
                            </div>
                          ) : (
                            <Badge color="gray" variant="light" size="sm">
                              عمومی
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {m.subject || "Property Inquiry"}
                          </Text>
                          {m.purpose || m.locationInterest || m.projectInterest ? (
                            <Text size="xs" color="dimmed" lineClamp={2}>
                              {[m.purpose, m.locationInterest, m.projectInterest]
                                .filter(Boolean)
                                .join(" | ")}
                            </Text>
                          ) : null}
                        </Table.Td>
                        <Table.Td>
                          {m.consultantName ? (
                            <div className="max-w-[180px]">
                              <Text size="xs" fw={500} className="text-emerald-600">
                                {m.consultantName}
                              </Text>
                              {m.consultantEmail && (
                                <Text size="xs" color="dimmed" lineClamp={1}>
                                  {m.consultantEmail}
                                </Text>
                              )}
                            </div>
                          ) : (
                            <Badge color="gray" variant="light" size="sm">
                              -
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" color="dimmed" lineClamp={2}>
                            {m.message}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" color="dimmed">
                            {m.createdAt
                              ? new Date(m.createdAt).toLocaleString("tr-TR")
                              : "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => handleDeleteMessage(m.id)}
                              title="Sil"
                            >
                              <MdDelete size={16} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}
          </Paper>
        )}

        {/* Blogs Section */}
        {activeTab === "blogs" && (
          <Paper shadow="sm" p="xl" radius="md" className="mb-6">
            <div className="flexBetween mb-6">
              <div>
                <Title
                  order={3}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <MdArticle className="text-teal-500" />
                  Blog Management
                </Title>
                <Text size="sm" color="dimmed" className="mt-1">
                  Create, edit or delete blog posts
                </Text>
              </div>
              <Group>
                <Button
                  variant="light"
                  color="teal"
                  leftSection={<MdRefresh size={18} />}
                  onClick={() => fetchBlogs()}
                  loading={blogsLoading}
                >
                  Refresh
                </Button>
                <Button
                  variant="gradient"
                  gradient={{ from: "indigo", to: "cyan" }}
                  leftSection={<MdAdd size={18} />}
                  onClick={() => setAiGenerateModalOpened(true)}
                >
                  🤖 Generate with AI
                </Button>
                <Button
                  color="teal"
                  leftSection={<MdAdd size={18} />}
                  onClick={() => setBlogModalOpened(true)}
                >
                  Add New Blog
                </Button>
              </Group>
            </div>

            <Divider className="mb-6" />

            {blogsLoading ? (
              <div className="flexCenter py-12">
                <Loader color="teal" />
              </div>
            ) : blogs.length === 0 ? (
              <div className="text-center py-12">
                <MdArticle size={64} className="text-gray-300 mx-auto mb-4" />
                <Text color="dimmed">No blog posts yet</Text>
                <Button
                  color="teal"
                  className="mt-4"
                  leftSection={<MdAdd size={18} />}
                  onClick={() => setBlogModalOpened(true)}
                >
                  Create First Blog
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Blog</Table.Th>
                      <Table.Th>Category</Table.Th>
                      <Table.Th>Country</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {blogs.map((blog) => (
                      <Table.Tr key={blog.id}>
                        <Table.Td>
                          <div className="flex items-center gap-3">
                            {blog.image && (
                              <img
                                src={blog.image}
                                alt={blog.title}
                                className="w-16 h-12 rounded-lg object-cover"
                              />
                            )}
                            <div>
                              <Text size="sm" fw={500} lineClamp={1} maw={250}>
                                {blog.title}
                              </Text>
                              {blog.summary && (
                                <Text
                                  size="xs"
                                  color="dimmed"
                                  lineClamp={1}
                                  maw={250}
                                >
                                  {blog.summary}
                                </Text>
                              )}
                              {blog.menuKey && (
                                <Text
                                  size="xs"
                                  color="dimmed"
                                  lineClamp={1}
                                  maw={250}
                                >
                                  Menu: {t(blog.menuKey)}
                                </Text>
                              )}
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge color="teal" variant="light">
                            {blog.category}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" color="dimmed">
                            {blog.country || "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={blog.published ? "green" : "gray"}
                            variant="light"
                            className="cursor-pointer"
                            onClick={() => handleTogglePublish(blog)}
                          >
                            {blog.published ? "Published" : "Draft"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" color="dimmed">
                            {new Date(blog.createdAt).toLocaleDateString(
                              "tr-TR"
                            )}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="lg"
                              onClick={() => handleEditBlog(blog)}
                              title="Edit"
                            >
                              <MdEdit size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="lg"
                              onClick={() => handleDeleteBlogClick(blog)}
                              title="Delete"
                            >
                              <MdDelete size={18} />
                            </ActionIcon>
                            <Button
                              variant="subtle"
                              size="xs"
                              onClick={() => navigate(`/blog/${blog.id}`)}
                            >
                              View
                            </Button>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {/* Blogs Summary */}
            {blogs.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Text size="sm" color="dimmed">
                    Total: {blogs.length} blogs
                  </Text>
                  <div className="flex gap-4">
                    <Text size="sm" color="dimmed">
                      Published: {blogs.filter((b) => b.published).length}
                    </Text>
                    <Text size="sm" color="dimmed">
                      Draft: {blogs.filter((b) => !b.published).length}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </Paper>
        )}

        {/* Testimonials Section */}
        {activeTab === "testimonials" && (
          <Paper shadow="sm" p="xl" radius="md" className="mb-6">
            <div className="flexBetween mb-6">
              <div>
                <Title
                  order={3}
                  className="flex items-center gap-2 text-gray-800"
                >
                  <MdRateReview className="text-pink-500" />
                  Testimonials
                </Title>
                <Text size="sm" color="dimmed" className="mt-1">
                  Manage customer reviews and ratings
                </Text>
              </div>
              <Group>
                <Button
                  variant="light"
                  color="pink"
                  leftSection={<MdRefresh size={18} />}
                  onClick={() => fetchTestimonials()}
                  loading={testimonialsLoading}
                >
                  Refresh
                </Button>
                <Button
                  color="pink"
                  leftSection={<MdAdd size={18} />}
                  onClick={() => setTestimonialModalOpened(true)}
                >
                  Add Testimonial
                </Button>
              </Group>
            </div>

            <Divider className="mb-6" />

            {testimonialsLoading ? (
              <div className="flexCenter py-12">
                <Loader color="pink" />
              </div>
            ) : testimonials.length === 0 ? (
              <div className="text-center py-12">
                <MdRateReview size={64} className="text-gray-300 mx-auto mb-4" />
                <Text color="dimmed">No testimonials yet</Text>
                <Button
                  color="pink"
                  className="mt-4"
                  leftSection={<MdAdd size={18} />}
                  onClick={() => setTestimonialModalOpened(true)}
                >
                  Create First Testimonial
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Customer</Table.Th>
                      <Table.Th>Rating</Table.Th>
                      <Table.Th>Staff Behavior</Table.Th>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {testimonials.map((testimonial) => (
                      <Table.Tr key={testimonial.id}>
                        <Table.Td>
                          <div className="flex items-start gap-3">
                            <Avatar
                              src={testimonial.image}
                              size="md"
                              radius="xl"
                              color="pink"
                            >
                              {testimonial.name?.[0]?.toUpperCase() || "?"}
                            </Avatar>
                            <div>
                              <Text size="sm" fw={500}>
                                {testimonial.name}
                              </Text>
                              {(testimonial.role || testimonial.company) && (
                                <Text size="xs" color="dimmed">
                                  {[testimonial.role, testimonial.company]
                                    .filter(Boolean)
                                    .join(" • ")}
                                </Text>
                              )}
                              <Text size="xs" color="dimmed" lineClamp={2}>
                                {testimonial.comment_tr ||
                                  testimonial.comment_en ||
                                  testimonial.comment}
                              </Text>
                            </div>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, index) => (
                              <FaStar
                                key={index}
                                className={`text-xs ${
                                  index < Math.round(testimonial.rating || 0)
                                    ? "text-amber-500"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                            <Text size="xs" color="dimmed" className="ml-1">
                              {testimonial.rating || 0}/5
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          {testimonial.staffBehavior ? (
                            <Badge color="pink" variant="light">
                              {testimonial.staffBehavior}
                            </Badge>
                          ) : (
                            <Badge color="gray" variant="light">
                              -
                            </Badge>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={testimonial.published ? "green" : "gray"}
                            variant="light"
                            className="cursor-pointer"
                            onClick={() =>
                              handleToggleTestimonialPublish(testimonial)
                            }
                          >
                            {testimonial.published ? "Published" : "Draft"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" color="dimmed">
                            {testimonial.createdAt
                              ? new Date(
                                  testimonial.createdAt
                                ).toLocaleDateString("tr-TR")
                              : "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <ActionIcon
                              variant="light"
                              color="blue"
                              size="lg"
                              onClick={() => handleEditTestimonial(testimonial)}
                              title="Edit"
                            >
                              <MdEdit size={18} />
                            </ActionIcon>
                            <ActionIcon
                              variant="light"
                              color="red"
                              size="lg"
                              onClick={() =>
                                handleDeleteTestimonialClick(testimonial)
                              }
                              title="Delete"
                            >
                              <MdDelete size={18} />
                            </ActionIcon>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </div>
            )}

            {testimonials.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <Text size="sm" color="dimmed">
                    Total: {testimonials.length} testimonials
                  </Text>
                  <div className="flex gap-4">
                    <Text size="sm" color="dimmed">
                      Published:{" "}
                      {testimonials.filter((t) => t.published).length}
                    </Text>
                    <Text size="sm" color="dimmed">
                      Draft: {testimonials.filter((t) => !t.published).length}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </Paper>
        )}

        {/* Add Property Form */}
        {activeTab === "addProperty" && (
          <Paper shadow="sm" p="xl" radius="md">
            <div className="mb-6">
              <Title
                order={3}
                className="flex items-center gap-2 text-gray-800"
              >
                <MdAddHome className="text-secondary" />
                Save New Property
              </Title>
              <Text size="sm" color="dimmed" className="mt-1">
                Enter property information in the following steps
              </Text>
            </div>

            <Divider className="mb-6" />

            <Stepper
              key={
                isLocalProject
                  ? "local-project-stepper"
                  : isInternationalProject
                  ? "international-project-stepper"
                  : "regular-stepper"
              }
              active={active}
              onStepClick={setActive}
              breakpoint="sm"
              allowNextStepsSelect={false}
              color="green"
            >
              <Stepper.Step label="Konum" description="Adres ve şehir">
                <div className="mt-6">
                  <AddLocation
                    nextStep={nextStep}
                    propertyDetails={propertyDetails}
                    setPropertyDetails={setPropertyDetails}
                  />
                </div>
              </Stepper.Step>

              <Stepper.Step label="Görseller" description="Fotoğraf yükle">
                <div className="mt-6">
                  <UploadImage
                    prevStep={prevStep}
                    nextStep={nextStep}
                    propertyDetails={propertyDetails}
                    setPropertyDetails={setPropertyDetails}
                  />
                </div>
              </Stepper.Step>

              {/* Skip Detaylar for project types - go directly to Proje Detayları */}
              {!isProjectType && (
                <Stepper.Step label="Detaylar" description="Ana özellikler">
                  <div className="mt-6">
                    <BasicDetails
                      prevStep={prevStep}
                      nextStep={nextStep}
                      propertyDetails={propertyDetails}
                      setPropertyDetails={setPropertyDetails}
                    />
                  </div>
                </Stepper.Step>
              )}

              {(isLocalProject || isInternationalProject) && (
                <Stepper.Step label="Proje Detayları" description="Proje bilgileri">
                  <div className="mt-6">
                    <ProjectDetails
                      prevStep={prevStep}
                      nextStep={nextStep}
                      propertyDetails={propertyDetails}
                      setPropertyDetails={setPropertyDetails}
                    />
                  </div>
                </Stepper.Step>
              )}

              <Stepper.Step label="Olanaklar" description="Oda sayısı">
                <div className="mt-6">
                  <Facilities
                    prevStep={prevStep}
                    propertyDetails={propertyDetails}
                    setPropertyDetails={setPropertyDetails}
                    setOpened={() => {}} // Not used in page mode
                    setActiveStep={setActive}
                    onSuccess={resetForm}
                    isPageMode={true}
                  />
                </div>
              </Stepper.Step>

              <Stepper.Completed>
                <div className="text-center py-8">
                  <div className="mb-4 flex justify-center">
                    <MdCheckCircle className="text-green-500 text-7xl" />
                  </div>
                  <Title order={3} className="mb-2">
                    Property saved successfully!
                  </Title>
                  <Text color="dimmed" className="mb-6">
                    New property added to the list and will be displayed on the
                    site.
                  </Text>
                  <Group position="center">
                    <Button onClick={resetForm} color="green">
                      Save New Property
                    </Button>
                    <Button
                      onClick={() => navigate("/listing")}
                      variant="outline"
                    >
                      Property Listni Görüntüle
                    </Button>
                  </Group>
                </div>
              </Stepper.Completed>
            </Stepper>
          </Paper>
        )}

        {/* Edit Property Modal */}
        <EditPropertyModal
          opened={editModalOpened}
          setOpened={setEditModalOpened}
          property={selectedProperty}
          onSuccess={() => {
            refetchProperties();
          }}
        />

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpened}
          onClose={() => {
            setDeleteModalOpened(false);
            setPropertyToDelete(null);
          }}
          title={
            <Text fw={600} color="red">
              Delete Property
            </Text>
          }
          centered
        >
          <div className="py-4">
            <Text size="sm" color="dimmed" mb="md">
              Are you sure you want to delete this property? This action cannot
              be undone.
            </Text>
            {propertyToDelete && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                {propertyToDelete.image && (
                  <img
                    src={propertyToDelete.image}
                    alt={propertyToDelete.title}
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                )}
                <div>
                  <Text size="sm" fw={500}>
                    {propertyToDelete.title}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {propertyToDelete.city}, {propertyToDelete.country}
                  </Text>
                  <Text size="xs" color="green" fw={500}>
                    {getCurrencySymbol(propertyToDelete.currency)}
                    {propertyToDelete.price?.toLocaleString()}
                  </Text>
                </div>
              </div>
            )}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setDeleteModalOpened(false);
                  setPropertyToDelete(null);
                }}
              >
                İptal
              </Button>
              <Button
                color="red"
                onClick={confirmDelete}
                loading={deleteLoading}
              >
                Sil
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Add Consultant Modal */}
        <Modal
          opened={consultantModalOpened}
          onClose={() => {
            setConsultantModalOpened(false);
            resetConsultantForm();
          }}
          title={
            <Text fw={600} color="grape">
              <div className="flex items-center gap-2">
                <MdPersonAdd />
                Add New Consultant
              </div>
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <TextInput
              label="Ad Soyad / Full Name"
              placeholder="Consultant name"
              required
              value={consultantForm.name}
              onChange={(e) =>
                setConsultantForm({ ...consultantForm, name: e.target.value })
              }
            />

            {/* Title - Bilingual */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="blue">
                Title (Bilingual)
              </Text>
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Title (English)"
                  placeholder="e.g., Senior Property Advisor"
                  value={consultantForm.title_en}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      title_en: e.target.value,
                      title: e.target.value || consultantForm.title_tr,
                    })
                  }
                />
                <TextInput
                  label="Ünvan (Türkçe)"
                  placeholder="Örn: Kıdemli Gayrimenkul Danışmanı"
                  value={consultantForm.title_tr}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      title_tr: e.target.value,
                      title: consultantForm.title_en || e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Specialty - Bilingual */}
            <div className="p-3 bg-green-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="green">
                Specialty (Bilingual)
              </Text>
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Specialty (English)"
                  placeholder="e.g., Luxury Villas & Apartments"
                  value={consultantForm.specialty_en}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      specialty_en: e.target.value,
                      specialty: e.target.value || consultantForm.specialty_tr,
                    })
                  }
                />
                <TextInput
                  label="Uzmanlık Alanı (Türkçe)"
                  placeholder="Örn: Lüks Villalar ve Daireler"
                  value={consultantForm.specialty_tr}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      specialty_tr: e.target.value,
                      specialty: consultantForm.specialty_en || e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <TextInput
              label="Deneyim / Experience"
              placeholder="e.g., 10 years"
              value={consultantForm.experience}
              onChange={(e) =>
                setConsultantForm({
                  ...consultantForm,
                  experience: e.target.value,
                })
              }
            />

            <MultiSelect
              label="Diller / Languages"
              placeholder="Select languages spoken"
              data={languageOptions}
              value={consultantForm.languages}
              onChange={(value) =>
                setConsultantForm({ ...consultantForm, languages: value })
              }
              searchable
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Email"
                placeholder="email@example.com"
                required
                value={consultantForm.email}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    email: e.target.value,
                  })
                }
              />
              <TextInput
                label="Telefon / Phone"
                placeholder="+90 5XX XXX XXXX"
                required
                value={consultantForm.phone}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="WhatsApp"
                placeholder="+905XXXXXXXXX"
                value={consultantForm.whatsapp}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    whatsapp: e.target.value,
                  })
                }
              />
              <TextInput
                label="LinkedIn URL"
                placeholder="https://linkedin.com/in/..."
                value={consultantForm.linkedin}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    linkedin: e.target.value,
                  })
                }
              />
            </div>

            {/* Profile Image Upload */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Profil Fotoğrafı / Profile Photo
              </Text>
              {consultantForm.image ? (
                <div className="relative inline-block">
                  <img
                    src={consultantForm.image}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    radius="xl"
                    className="absolute top-0 right-0"
                    onClick={removeConsultantImage}
                  >
                    <MdClose size={14} />
                  </ActionIcon>
                </div>
              ) : (
                <div
                  onClick={openConsultantImageUpload}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-grape-500 hover:bg-gray-50 transition-colors"
                >
                  <MdOutlineCloudUpload size={28} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </div>
              )}
              {consultantForm.image && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={openConsultantImageUpload}
                  loading={imageUploading}
                >
                  Change
                </Button>
              )}
            </div>

            {/* Biography - Bilingual */}
            <div className="p-3 bg-purple-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="grape">
                Biography (Bilingual)
              </Text>
              <Textarea
                label="Biography (English)"
                placeholder="Short description about consultant in English"
                rows={3}
                value={consultantForm.bio_en}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    bio_en: e.target.value,
                    bio: e.target.value || consultantForm.bio_tr,
                  })
                }
              />
              <Textarea
                label="Biyografi (Türkçe)"
                placeholder="Danışman hakkında kısa açıklama"
                rows={3}
                value={consultantForm.bio_tr}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    bio_tr: e.target.value,
                    bio: consultantForm.bio_en || e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <NumberInput
                label="Puan / Rating"
                placeholder="5.0"
                min={0}
                max={5}
                step={0.1}
                decimalScale={1}
                value={consultantForm.rating}
                onChange={(value) =>
                  setConsultantForm({ ...consultantForm, rating: value || 0 })
                }
              />
              <NumberInput
                label="Yorum Sayısı / Reviews"
                placeholder="0"
                min={0}
                value={consultantForm.reviews}
                onChange={(value) =>
                  setConsultantForm({ ...consultantForm, reviews: value || 0 })
                }
              />
            </div>

            <Switch
              label="Müsait / Available"
              checked={consultantForm.available}
              onChange={(e) =>
                setConsultantForm({
                  ...consultantForm,
                  available: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setConsultantModalOpened(false);
                  resetConsultantForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="grape"
                onClick={handleCreateConsultant}
                loading={consultantLoading}
              >
                Add Consultant
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Edit Consultant Modal */}
        <Modal
          opened={editConsultantModalOpened}
          onClose={() => {
            setEditConsultantModalOpened(false);
            setSelectedConsultant(null);
            resetConsultantForm();
          }}
          title={
            <Text fw={600} color="blue">
              <div className="flex items-center gap-2">
                <MdEdit />
                Edit Consultant
              </div>
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <TextInput
              label="Ad Soyad / Full Name"
              placeholder="Consultant name"
              required
              value={consultantForm.name}
              onChange={(e) =>
                setConsultantForm({ ...consultantForm, name: e.target.value })
              }
            />

            {/* Title - Bilingual */}
            <div className="p-3 bg-blue-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="blue">
                Title (Bilingual)
              </Text>
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Title (English)"
                  placeholder="e.g., Senior Property Advisor"
                  value={consultantForm.title_en}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      title_en: e.target.value,
                      title: e.target.value || consultantForm.title_tr,
                    })
                  }
                />
                <TextInput
                  label="Ünvan (Türkçe)"
                  placeholder="Örn: Kıdemli Gayrimenkul Danışmanı"
                  value={consultantForm.title_tr}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      title_tr: e.target.value,
                      title: consultantForm.title_en || e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Specialty - Bilingual */}
            <div className="p-3 bg-green-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="green">
                Specialty (Bilingual)
              </Text>
              <div className="grid grid-cols-2 gap-4">
                <TextInput
                  label="Specialty (English)"
                  placeholder="e.g., Luxury Villas & Apartments"
                  value={consultantForm.specialty_en}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      specialty_en: e.target.value,
                      specialty: e.target.value || consultantForm.specialty_tr,
                    })
                  }
                />
                <TextInput
                  label="Uzmanlık Alanı (Türkçe)"
                  placeholder="Örn: Lüks Villalar ve Daireler"
                  value={consultantForm.specialty_tr}
                  onChange={(e) =>
                    setConsultantForm({
                      ...consultantForm,
                      specialty_tr: e.target.value,
                      specialty: consultantForm.specialty_en || e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <TextInput
              label="Deneyim / Experience"
              placeholder="e.g., 10 years"
              value={consultantForm.experience}
              onChange={(e) =>
                setConsultantForm({
                  ...consultantForm,
                  experience: e.target.value,
                })
              }
            />

            <MultiSelect
              label="Diller / Languages"
              placeholder="Select languages spoken"
              data={languageOptions}
              value={consultantForm.languages}
              onChange={(value) =>
                setConsultantForm({ ...consultantForm, languages: value })
              }
              searchable
            />

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="Email"
                placeholder="email@example.com"
                required
                value={consultantForm.email}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    email: e.target.value,
                  })
                }
              />
              <TextInput
                label="Telefon / Phone"
                placeholder="+90 5XX XXX XXXX"
                required
                value={consultantForm.phone}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <TextInput
                label="WhatsApp"
                placeholder="+905XXXXXXXXX"
                value={consultantForm.whatsapp}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    whatsapp: e.target.value,
                  })
                }
              />
              <TextInput
                label="LinkedIn URL"
                placeholder="https://linkedin.com/in/..."
                value={consultantForm.linkedin}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    linkedin: e.target.value,
                  })
                }
              />
            </div>

            {/* Profile Image Upload */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Profil Fotoğrafı / Profile Photo
              </Text>
              {consultantForm.image ? (
                <div className="relative inline-block">
                  <img
                    src={consultantForm.image}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-2 border-gray-200"
                  />
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    radius="xl"
                    className="absolute top-0 right-0"
                    onClick={removeConsultantImage}
                  >
                    <MdClose size={14} />
                  </ActionIcon>
                </div>
              ) : (
                <div
                  onClick={openConsultantImageUpload}
                  className="w-32 h-32 rounded-full border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors"
                >
                  <MdOutlineCloudUpload size={28} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Upload</span>
                </div>
              )}
              {consultantForm.image && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={openConsultantImageUpload}
                  loading={imageUploading}
                >
                  Change
                </Button>
              )}
            </div>

            {/* Biography - Bilingual */}
            <div className="p-3 bg-purple-50 rounded-lg space-y-3">
              <Text size="sm" fw={600} c="grape">
                Biography (Bilingual)
              </Text>
              <Textarea
                label="Biography (English)"
                placeholder="Short description about consultant in English"
                rows={3}
                value={consultantForm.bio_en}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    bio_en: e.target.value,
                    bio: e.target.value || consultantForm.bio_tr,
                  })
                }
              />
              <Textarea
                label="Biyografi (Türkçe)"
                placeholder="Danışman hakkında kısa açıklama"
                rows={3}
                value={consultantForm.bio_tr}
                onChange={(e) =>
                  setConsultantForm({
                    ...consultantForm,
                    bio_tr: e.target.value,
                    bio: consultantForm.bio_en || e.target.value,
                  })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <NumberInput
                label="Puan / Rating"
                placeholder="5.0"
                min={0}
                max={5}
                step={0.1}
                decimalScale={1}
                value={consultantForm.rating}
                onChange={(value) =>
                  setConsultantForm({ ...consultantForm, rating: value || 0 })
                }
              />
              <NumberInput
                label="Yorum Sayısı / Reviews"
                placeholder="0"
                min={0}
                value={consultantForm.reviews}
                onChange={(value) =>
                  setConsultantForm({ ...consultantForm, reviews: value || 0 })
                }
              />
            </div>

            <Switch
              label="Müsait / Available"
              checked={consultantForm.available}
              onChange={(e) =>
                setConsultantForm({
                  ...consultantForm,
                  available: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setEditConsultantModalOpened(false);
                  setSelectedConsultant(null);
                  resetConsultantForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleUpdateConsultant}
                loading={consultantLoading}
              >
                Update
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Delete Consultant Confirmation Modal */}
        <Modal
          opened={deleteConsultantModalOpened}
          onClose={() => {
            setDeleteConsultantModalOpened(false);
            setConsultantToDelete(null);
          }}
          title={
            <Text fw={600} color="red">
              Delete Consultant
            </Text>
          }
          centered
        >
          <div className="py-4">
            <Text size="sm" color="dimmed" mb="md">
              Are you sure you want to delete this consultant? This action
              cannot be undone.
            </Text>
            {consultantToDelete && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                {consultantToDelete.image && (
                  <Avatar
                    src={consultantToDelete.image}
                    alt={consultantToDelete.name}
                    size="lg"
                    radius="xl"
                  />
                )}
                <div>
                  <Text size="sm" fw={500}>
                    {consultantToDelete.name}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {consultantToDelete.title}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {consultantToDelete.email}
                  </Text>
                </div>
              </div>
            )}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setDeleteConsultantModalOpened(false);
                  setConsultantToDelete(null);
                }}
              >
                İptal
              </Button>
              <Button
                color="red"
                onClick={confirmDeleteConsultant}
                loading={consultantLoading}
              >
                Sil
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Add Testimonial Modal */}
        <Modal
          opened={testimonialModalOpened}
          onClose={() => {
            setTestimonialModalOpened(false);
            resetTestimonialForm();
          }}
          title={
            <Text fw={600} color="pink">
              <div className="flex items-center gap-2">
                <MdAdd />
                Add Testimonial
              </div>
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <div>
              <Text size="sm" fw={500} mb={4}>
                Customer Photo
              </Text>
              {testimonialForm.image ? (
                <div className="relative inline-block">
                  <img
                    src={testimonialForm.image}
                    alt={testimonialForm.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    radius="xl"
                    className="absolute -top-1 -right-1"
                    onClick={removeTestimonialImage}
                  >
                    <MdClose size={14} />
                  </ActionIcon>
                </div>
              ) : (
                <div
                  onClick={openTestimonialImageUpload}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-pink-400 hover:bg-gray-50 transition-colors"
                >
                  <MdOutlineCloudUpload size={24} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                </div>
              )}
              {testimonialForm.image && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={openTestimonialImageUpload}
                  loading={testimonialImageUploading}
                >
                  Change Photo
                </Button>
              )}
            </div>

            <TextInput
              label="Name"
              placeholder="Customer name"
              required
              value={testimonialForm.name}
              onChange={(e) =>
                setTestimonialForm({ ...testimonialForm, name: e.target.value })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Role"
                placeholder="Investor, Buyer, etc."
                value={testimonialForm.role}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    role: e.target.value,
                  })
                }
              />
              <TextInput
                label="Company"
                placeholder="Optional"
                value={testimonialForm.company}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    company: e.target.value,
                  })
                }
              />
            </div>

            <TextInput
              label="Staff Behavior"
              placeholder="Friendly, Professional, etc."
              value={testimonialForm.staffBehavior}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  staffBehavior: e.target.value,
                })
              }
            />

            <NumberInput
              label="Rating (1-5)"
              min={1}
              max={5}
              step={1}
              value={testimonialForm.rating}
              onChange={(value) =>
                setTestimonialForm({ ...testimonialForm, rating: value })
              }
            />

            <Textarea
              label="Comment (TR)"
              placeholder="Customer review (Turkish)..."
              required
              rows={4}
              value={testimonialForm.comment_tr}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  comment_tr: e.target.value,
                })
              }
            />

            <Textarea
              label="Comment (EN)"
              placeholder="Customer review (English)..."
              required
              rows={4}
              value={testimonialForm.comment_en}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  comment_en: e.target.value,
                })
              }
            />

            <Switch
              label="Publish immediately"
              checked={testimonialForm.published}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  published: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setTestimonialModalOpened(false);
                  resetTestimonialForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="pink"
                onClick={handleCreateTestimonial}
                loading={testimonialLoading}
              >
                Create
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Edit Testimonial Modal */}
        <Modal
          opened={editTestimonialModalOpened}
          onClose={() => {
            setEditTestimonialModalOpened(false);
            setSelectedTestimonial(null);
            resetTestimonialForm();
          }}
          title={
            <Text fw={600} color="pink">
              <div className="flex items-center gap-2">
                <MdEdit />
                Edit Testimonial
              </div>
            </Text>
          }
          size="lg"
          centered
        >
          <div className="space-y-4 py-2">
            <div>
              <Text size="sm" fw={500} mb={4}>
                Customer Photo
              </Text>
              {testimonialForm.image ? (
                <div className="relative inline-block">
                  <img
                    src={testimonialForm.image}
                    alt={testimonialForm.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                  />
                  <ActionIcon
                    variant="filled"
                    color="red"
                    size="sm"
                    radius="xl"
                    className="absolute -top-1 -right-1"
                    onClick={removeTestimonialImage}
                  >
                    <MdClose size={14} />
                  </ActionIcon>
                </div>
              ) : (
                <div
                  onClick={openTestimonialImageUpload}
                  className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-pink-400 hover:bg-gray-50 transition-colors"
                >
                  <MdOutlineCloudUpload size={24} className="text-gray-400" />
                  <span className="text-[10px] text-gray-400 mt-1">Upload</span>
                </div>
              )}
              {testimonialForm.image && (
                <Button
                  variant="subtle"
                  size="xs"
                  mt="xs"
                  onClick={openTestimonialImageUpload}
                  loading={testimonialImageUploading}
                >
                  Change Photo
                </Button>
              )}
            </div>

            <TextInput
              label="Name"
              placeholder="Customer name"
              required
              value={testimonialForm.name}
              onChange={(e) =>
                setTestimonialForm({ ...testimonialForm, name: e.target.value })
              }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextInput
                label="Role"
                placeholder="Investor, Buyer, etc."
                value={testimonialForm.role}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    role: e.target.value,
                  })
                }
              />
              <TextInput
                label="Company"
                placeholder="Optional"
                value={testimonialForm.company}
                onChange={(e) =>
                  setTestimonialForm({
                    ...testimonialForm,
                    company: e.target.value,
                  })
                }
              />
            </div>

            <TextInput
              label="Staff Behavior"
              placeholder="Friendly, Professional, etc."
              value={testimonialForm.staffBehavior}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  staffBehavior: e.target.value,
                })
              }
            />

            <NumberInput
              label="Rating (1-5)"
              min={1}
              max={5}
              step={1}
              value={testimonialForm.rating}
              onChange={(value) =>
                setTestimonialForm({ ...testimonialForm, rating: value })
              }
            />

            <Textarea
              label="Comment (TR)"
              placeholder="Customer review (Turkish)..."
              required
              rows={4}
              value={testimonialForm.comment_tr}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  comment_tr: e.target.value,
                })
              }
            />

            <Textarea
              label="Comment (EN)"
              placeholder="Customer review (English)..."
              required
              rows={4}
              value={testimonialForm.comment_en}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  comment_en: e.target.value,
                })
              }
            />

            <Switch
              label="Published"
              checked={testimonialForm.published}
              onChange={(e) =>
                setTestimonialForm({
                  ...testimonialForm,
                  published: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setEditTestimonialModalOpened(false);
                  setSelectedTestimonial(null);
                  resetTestimonialForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="pink"
                onClick={handleUpdateTestimonial}
                loading={testimonialLoading}
              >
                Update
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Delete Testimonial Confirmation Modal */}
        <Modal
          opened={deleteTestimonialModalOpened}
          onClose={() => {
            setDeleteTestimonialModalOpened(false);
            setTestimonialToDelete(null);
          }}
          title={
            <Text fw={600} color="red">
              Delete Testimonial
            </Text>
          }
          centered
        >
          <div className="py-4">
            <Text size="sm" color="dimmed" mb="md">
              Are you sure you want to delete this testimonial? This action
              cannot be undone.
            </Text>
            {testimonialToDelete && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                {testimonialToDelete.image && (
                  <Avatar
                    src={testimonialToDelete.image}
                    alt={testimonialToDelete.name}
                    size="lg"
                    radius="xl"
                  />
                )}
                <div>
                  <Text size="sm" fw={500}>
                    {testimonialToDelete.name}
                  </Text>
                  <Text size="xs" color="dimmed" lineClamp={2}>
                    {testimonialToDelete.comment_tr ||
                      testimonialToDelete.comment_en ||
                      testimonialToDelete.comment}
                  </Text>
                </div>
              </div>
            )}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setDeleteTestimonialModalOpened(false);
                  setTestimonialToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={confirmDeleteTestimonial}
                loading={testimonialLoading}
              >
                Delete
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Add Blog Modal */}
        <Modal
          opened={blogModalOpened}
          onClose={() => {
            setBlogModalOpened(false);
            resetBlogForm();
          }}
          title={
            <Text fw={600} color="teal">
              <div className="flex items-center gap-2">
                <MdAdd />
                Add New Blog
              </div>
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <div className="grid gap-3 md:grid-cols-3">
              <TextInput
                label="Title (English)"
                placeholder="Blog title in English"
                required
                value={blogForm.title_en}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_en: e.target.value })
                }
              />
              <TextInput
                label="Title (Turkish)"
                placeholder="Blog title in Turkish"
                required
                value={blogForm.title_tr}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_tr: e.target.value })
                }
              />
              <TextInput
                label="Title (Russian)"
                placeholder="Blog title in Russian"
                value={blogForm.title_ru}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_ru: e.target.value })
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Category"
                placeholder="e.g., Real Estate, Investment, Tips"
                required
                value={blogForm.category}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, category: e.target.value })
                }
              />
              <Select
                label="Country"
                placeholder="e.g., Greece"
                searchable
                clearable
                data={countryOptions}
                value={blogForm.country || null}
                onChange={(value) =>
                  setBlogForm({ ...blogForm, country: value || "" })
                }
              />
            </div>

            <Select
              label="About Turkey menu (optional)"
              placeholder="Link this post to a navbar title"
              searchable
              clearable
              data={aboutTurkeyMenuOptions}
              value={
                aboutTurkeyMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Buyer Guide menu (optional)"
              placeholder="Link this post to a buyer guide item"
              searchable
              clearable
              data={buyerGuideMenuOptions}
              value={
                buyerGuideMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Turkish Citizenship (optional)"
              placeholder="Link this post to Turkish Citizenship"
              searchable
              clearable
              data={citizenshipMenuOptions}
              value={
                citizenshipMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Investment Opportunities (optional)"
              placeholder="Link this post to Investment Opportunities"
              searchable
              clearable
              data={investmentOpportunitiesMenuOptions}
              value={
                investmentOpportunitiesMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Textarea
                label="Summary (English)"
                placeholder="Brief summary in English"
                rows={3}
                value={blogForm.summary_en}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_en: e.target.value })
                }
              />
              <Textarea
                label="Summary (Turkish)"
                placeholder="Brief summary in Turkish"
                rows={3}
                value={blogForm.summary_tr}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_tr: e.target.value })
                }
              />
              <Textarea
                label="Summary (Russian)"
                placeholder="Brief summary in Russian"
                rows={3}
                value={blogForm.summary_ru}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_ru: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <Textarea
                  label="Content (English)"
                  placeholder="Full blog content in English..."
                  rows={10}
                  value={blogForm.content_en}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_en: e.target.value })
                  }
                />
                <Textarea
                  label="Content (Turkish)"
                  placeholder="Full blog content in Turkish..."
                  rows={10}
                  value={blogForm.content_tr}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_tr: e.target.value })
                  }
                />
                <Textarea
                  label="Content (Russian)"
                  placeholder="Full blog content in Russian..."
                  rows={10}
                  value={blogForm.content_ru}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_ru: e.target.value })
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Text size="sm" fw={600}>
                      Content Blocks (Text + Media)
                    </Text>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Blocks language:</span>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "en" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("en")}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "tr" ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("tr")}
                      >
                        Turkish
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "ru" ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("ru")}
                      >
                        Russian
                      </button>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<MdAdd size={14} />}
                    onClick={() => addContentBlock(contentEditorLang)}
                  >
                    Add Block
                  </Button>
                </div>
                {(blogForm[getBlocksField(contentEditorLang)] || []).length ? (
                  <div className="space-y-4">
                    {(blogForm[getBlocksField(contentEditorLang)] || []).map((block, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Text size="xs" fw={600}>
                            Block {index + 1}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeContentBlock(index, contentEditorLang)}
                          >
                            <MdClose size={14} />
                          </ActionIcon>
                        </div>
                        <div className="space-y-3">
                          {ensureBlockLines(block).lines.map((line, lineIndex) => (
                            <div
                              key={lineIndex}
                              className="rounded-lg border border-slate-200 bg-white p-2 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <Text size="xs" fw={600}>
                                  Line {lineIndex + 1}
                                </Text>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="xs"
                                  onClick={() =>
                                    removeContentBlockLine(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  <MdClose size={12} />
                                </ActionIcon>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-500">
                                  Icon
                                  <select
                                    className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                                    value={line.icon ?? "•"}
                                    onChange={(e) =>
                                      updateContentBlockLine(
                                        index,
                                        lineIndex,
                                        { icon: e.target.value },
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    {blockIconOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <Switch
                                  size="sm"
                                  label="Bold"
                                  checked={!!line.bold}
                                  onChange={(e) =>
                                    updateContentBlockLine(
                                      index,
                                      lineIndex,
                                      { bold: e.currentTarget.checked },
                                      contentEditorLang
                                    )
                                  }
                                />
                              </div>
                              <Textarea
                                placeholder="Write line text..."
                                minRows={2}
                                value={line.text || ""}
                                onChange={(e) =>
                                  updateContentBlockLine(
                                    index,
                                    lineIndex,
                                    { text: e.target.value },
                                    contentEditorLang
                                  )
                                }
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="h-14 w-20 rounded-lg border border-dashed border-slate-200 bg-white overflow-hidden flexCenter">
                                  {line.video ? (
                                    <video
                                      src={line.video}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                      preload="metadata"
                                      onLoadedMetadata={(e) => { e.target.currentTime = 0.1; }}
                                    />
                                  ) : line.image ? (
                                    <img
                                      src={line.image}
                                      alt={`Line ${lineIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <MdOutlineCloudUpload
                                      size={16}
                                      className="text-slate-400"
                                    />
                                  )}
                                </div>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    openContentBlockLineImageUpload(
                                      index,
                                      lineIndex,
                                      contentEditorLang
                                    )
                                  }
                                  loading={
                                    lineImageUploadingKey ===
                                    getLineUploadKey(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  {line.image ? "Change Line Image" : "Upload Line Image"}
                                </Button>
                                {line.image ? (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() =>
                                      removeContentBlockLineImage(
                                        index,
                                        lineIndex,
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    Delete Line Image
                                  </Button>
                                ) : null}
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    openContentBlockLineVideoUpload(
                                      index,
                                      lineIndex,
                                      contentEditorLang
                                    )
                                  }
                                  loading={
                                    lineVideoUploadingKey ===
                                    getLineUploadKey(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  {line.video ? "Change Line Video" : "Upload Line Video"}
                                </Button>
                                {line.video ? (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() =>
                                      removeContentBlockLineVideo(
                                        index,
                                        lineIndex,
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    Delete Line Video
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<MdAdd size={14} />}
                            onClick={() => addContentBlockLine(index, contentEditorLang)}
                          >
                            Add Line
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="h-16 w-20 rounded-lg border border-dashed border-slate-200 bg-white overflow-hidden flexCenter">
                            {block.video ? (
                              <video
                                src={block.video}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(e) => { e.target.currentTime = 0.1; }}
                              />
                            ) : block.image ? (
                              <img
                                src={block.image}
                                alt={`Block ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <MdOutlineCloudUpload
                                size={18}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => openContentBlockImageUpload(index, contentEditorLang)}
                            loading={blockImageUploadingIndex === index}
                          >
                            {block.image ? "Change Image" : "Upload Image"}
                          </Button>
                          {block.image ? (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeContentBlockImage(index, contentEditorLang)
                              }
                            >
                              Delete Image
                            </Button>
                          ) : null}
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => openContentBlockVideoUpload(index, contentEditorLang)}
                            loading={blockVideoUploadingIndex === index}
                          >
                            {block.video ? "Change Video" : "Upload Video"}
                          </Button>
                          {block.video ? (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeContentBlockVideo(index, contentEditorLang)
                              }
                            >
                              Delete Video
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Add blocks to mix text and media in the article body.
                    </div>
                )}
              </div>
            </div>

            {/* Blog Image Upload */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Featured Image
              </Text>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative">
                  {blogForm.image ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img
                        src={blogForm.image}
                        alt="Blog"
                        className="w-full h-44 sm:h-56 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                          Featured Image
                        </p>
                        <h4 className="text-base font-semibold leading-snug">
                          {blogForm.title_en || blogForm.title_tr || blogForm.title_ru || "Blog cover preview"}
                        </h4>
                      </div>
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size="sm"
                        radius="xl"
                        className="absolute top-3 right-3"
                        onClick={removeBlogImage}
                      >
                        <MdClose size={14} />
                      </ActionIcon>
                    </div>
                  ) : (
                    <div
                      onClick={openBlogImageUpload}
                      className="w-full h-44 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition-colors"
                    >
                      <MdOutlineCloudUpload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-400 mt-2">
                        Click to upload cover image
                      </span>
                    </div>
                  )}
                  {blogForm.image && (
                    <Button
                      variant="light"
                      size="xs"
                      mt="xs"
                      onClick={openBlogImageUpload}
                      loading={blogImageUploading}
                    >
                      Change Image
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Preview Notes
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {getSummaryBullets(blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary).length > 0 ? (
                      getSummaryBullets(blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary).map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))
                    ) : (
                      <>
                        <li>• Add summary lines to preview the layout.</li>
                        <li>• Each line becomes a bullet point.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              </div>

              {/* Blog Video */}
              <div>
                <Text size="sm" fw={500} mb={4}>
                  Blog Video (Optional)
                </Text>
                <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="relative">
                    {blogForm.video ? (
                      <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5">
                        <video
                          src={blogForm.video}
                          className="w-full h-44 sm:h-56 object-cover"
                          controls
                          playsInline
                          preload="metadata"
                          poster={blogForm.image || blogForm.images?.[0] || undefined}
                        />
                        <ActionIcon
                          variant="filled"
                          color="red"
                          size="sm"
                          radius="xl"
                          className="absolute top-3 right-3"
                          onClick={removeBlogVideo}
                        >
                          <MdClose size={14} />
                        </ActionIcon>
                      </div>
                    ) : (
                      <div
                        onClick={openBlogVideoUpload}
                        className="w-full h-44 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition-colors"
                      >
                        <MdOutlineCloudUpload size={32} className="text-gray-400" />
                        <span className="text-sm text-gray-400 mt-2">
                          Click to upload video
                        </span>
                      </div>
                    )}
                    {blogForm.video && (
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        onClick={openBlogVideoUpload}
                        loading={blogVideoUploading}
                      >
                        Change Video
                      </Button>
                    )}
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                      Video Tips
                    </p>
                    <Text size="xs" c="dimmed" className="mt-2">
                      Recommended formats: MP4 or WebM. Shorter clips load faster.
                    </Text>
                  </div>
                </div>
              </div>

              {/* Blog Gallery Images */}
              <div>
                <Text size="sm" fw={500} mb={4}>
                  Gallery Images (Optional)
                </Text>
              <div className="flex flex-wrap gap-2 mb-2">
                {blogForm.images && blogForm.images.map((img, index) => (
                  <div key={index} className="relative">
                    <button
                      type="button"
                      className="block"
                      onClick={() => setCoverFromGallery(index)}
                      aria-label="Set cover image"
                    >
                      <img
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        className={`w-20 h-20 rounded-lg object-cover border ${
                          blogForm.image === img ? "border-secondary ring-2 ring-secondary/40" : "border-gray-200"
                        }`}
                      />
                    </button>
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size="xs"
                      radius="xl"
                      className="absolute -top-1 -right-1"
                      onClick={() => removeBlogGalleryImage(index)}
                    >
                      <MdClose size={10} />
                    </ActionIcon>
                    {blogForm.image !== img && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-[9px] text-gray-600 shadow-sm">
                        Click to set cover
                      </span>
                    )}
                  </div>
                ))}
                <div
                  onClick={openBlogGalleryUpload}
                  className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition-colors ${blogGalleryUploading ? 'opacity-50' : ''}`}
                >
                  {blogGalleryUploading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-teal-500 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <MdOutlineCloudUpload size={20} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400">Add</span>
                    </>
                  )}
                </div>
              </div>
              <Text size="xs" c="dimmed">
                Add multiple images for the blog gallery (max 10)
              </Text>
            </div>

            <Switch
              label="Publish immediately"
              checked={blogForm.published}
              onChange={(e) =>
                setBlogForm({
                  ...blogForm,
                  published: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setBlogModalOpened(false);
                  resetBlogForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="teal"
                onClick={handleCreateBlog}
                loading={blogLoading}
              >
                Create Blog
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Edit Blog Modal */}
        <Modal
          opened={editBlogModalOpened}
          onClose={() => {
            setEditBlogModalOpened(false);
            setSelectedBlog(null);
            resetBlogForm();
          }}
          title={
            <Text fw={600} color="blue">
              <div className="flex items-center gap-2">
                <MdEdit />
                Edit Blog
              </div>
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <div className="grid gap-3 md:grid-cols-3">
              <TextInput
                label="Title (English)"
                placeholder="Blog title in English"
                required
                value={blogForm.title_en}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_en: e.target.value })
                }
              />
              <TextInput
                label="Title (Turkish)"
                placeholder="Blog title in Turkish"
                required
                value={blogForm.title_tr}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_tr: e.target.value })
                }
              />
              <TextInput
                label="Title (Russian)"
                placeholder="Blog title in Russian"
                value={blogForm.title_ru}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, title_ru: e.target.value })
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Category"
                placeholder="e.g., Real Estate, Investment, Tips"
                required
                value={blogForm.category}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, category: e.target.value })
                }
              />
              <Select
                label="Country"
                placeholder="e.g., Greece"
                searchable
                clearable
                data={countryOptions}
                value={blogForm.country || null}
                onChange={(value) =>
                  setBlogForm({ ...blogForm, country: value || "" })
                }
              />
            </div>

            <Select
              label="About Turkey menu (optional)"
              placeholder="Link this post to a navbar title"
              searchable
              clearable
              data={aboutTurkeyMenuOptions}
              value={
                aboutTurkeyMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Buyer Guide menu (optional)"
              placeholder="Link this post to a buyer guide item"
              searchable
              clearable
              data={buyerGuideMenuOptions}
              value={
                buyerGuideMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Turkish Citizenship (optional)"
              placeholder="Link this post to Turkish Citizenship"
              searchable
              clearable
              data={citizenshipMenuOptions}
              value={
                citizenshipMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Investment Opportunities (optional)"
              placeholder="Link this post to Investment Opportunities"
              searchable
              clearable
              data={investmentOpportunitiesMenuOptions}
              value={
                investmentOpportunitiesMenuOptions.some(
                  (option) => option.value === blogForm.menuKey
                )
                  ? blogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setBlogForm({ ...blogForm, menuKey: value || "" })
              }
            />

            <div className="grid gap-3 md:grid-cols-3">
              <Textarea
                label="Summary (English)"
                placeholder="Brief summary in English"
                rows={3}
                value={blogForm.summary_en}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_en: e.target.value })
                }
              />
              <Textarea
                label="Summary (Turkish)"
                placeholder="Brief summary in Turkish"
                rows={3}
                value={blogForm.summary_tr}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_tr: e.target.value })
                }
              />
              <Textarea
                label="Summary (Russian)"
                placeholder="Brief summary in Russian"
                rows={3}
                value={blogForm.summary_ru}
                onChange={(e) =>
                  setBlogForm({ ...blogForm, summary_ru: e.target.value })
                }
              />
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <Textarea
                  label="Content (English)"
                  placeholder="Full blog content in English..."
                  rows={10}
                  value={blogForm.content_en}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_en: e.target.value })
                  }
                />
                <Textarea
                  label="Content (Turkish)"
                  placeholder="Full blog content in Turkish..."
                  rows={10}
                  value={blogForm.content_tr}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_tr: e.target.value })
                  }
                />
                <Textarea
                  label="Content (Russian)"
                  placeholder="Full blog content in Russian..."
                  rows={10}
                  value={blogForm.content_ru}
                  onChange={(e) =>
                    setBlogForm({ ...blogForm, content_ru: e.target.value })
                  }
                />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Text size="sm" fw={600}>
                      Content Blocks (Text + Media)
                    </Text>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Blocks language:</span>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "en" ? "bg-indigo-600 text-white border-indigo-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("en")}
                      >
                        English
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "tr" ? "bg-red-600 text-white border-red-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("tr")}
                      >
                        Turkish
                      </button>
                      <button
                        type="button"
                        className={`px-2 py-1 rounded-full border ${contentEditorLang === "ru" ? "bg-sky-600 text-white border-sky-600" : "border-slate-200 text-slate-600"}`}
                        onClick={() => setContentEditorLang("ru")}
                      >
                        Russian
                      </button>
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="light"
                    leftSection={<MdAdd size={14} />}
                    onClick={() => addContentBlock(contentEditorLang)}
                  >
                    Add Block
                  </Button>
                </div>
                {(blogForm[getBlocksField(contentEditorLang)] || []).length ? (
                  <div className="space-y-4">
                    {(blogForm[getBlocksField(contentEditorLang)] || []).map((block, index) => (
                      <div
                        key={index}
                        className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <Text size="xs" fw={600}>
                            Block {index + 1}
                          </Text>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            size="sm"
                            onClick={() => removeContentBlock(index, contentEditorLang)}
                          >
                            <MdClose size={14} />
                          </ActionIcon>
                        </div>
                        <div className="space-y-3">
                          {ensureBlockLines(block).lines.map((line, lineIndex) => (
                            <div
                              key={lineIndex}
                              className="rounded-lg border border-slate-200 bg-white p-2 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <Text size="xs" fw={600}>
                                  Line {lineIndex + 1}
                                </Text>
                                <ActionIcon
                                  variant="subtle"
                                  color="red"
                                  size="xs"
                                  onClick={() =>
                                    removeContentBlockLine(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  <MdClose size={12} />
                                </ActionIcon>
                              </div>
                              <div className="flex items-center gap-3">
                                <label className="text-xs text-slate-500">
                                  Icon
                                  <select
                                    className="ml-2 h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                                    value={line.icon ?? "•"}
                                    onChange={(e) =>
                                      updateContentBlockLine(
                                        index,
                                        lineIndex,
                                        { icon: e.target.value },
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    {blockIconOptions.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <Switch
                                  size="sm"
                                  label="Bold"
                                  checked={!!line.bold}
                                  onChange={(e) =>
                                    updateContentBlockLine(
                                      index,
                                      lineIndex,
                                      { bold: e.currentTarget.checked },
                                      contentEditorLang
                                    )
                                  }
                                />
                              </div>
                              <Textarea
                                placeholder="Write line text..."
                                minRows={2}
                                value={line.text || ""}
                                onChange={(e) =>
                                  updateContentBlockLine(
                                    index,
                                    lineIndex,
                                    { text: e.target.value },
                                    contentEditorLang
                                  )
                                }
                              />
                              <div className="flex flex-wrap items-center gap-2">
                                <div className="h-14 w-20 rounded-lg border border-dashed border-slate-200 bg-white overflow-hidden flexCenter">
                                  {line.video ? (
                                    <video
                                      src={line.video}
                                      className="w-full h-full object-cover"
                                      muted
                                      playsInline
                                      preload="metadata"
                                      onLoadedMetadata={(e) => { e.target.currentTime = 0.1; }}
                                    />
                                  ) : line.image ? (
                                    <img
                                      src={line.image}
                                      alt={`Line ${lineIndex + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <MdOutlineCloudUpload
                                      size={16}
                                      className="text-slate-400"
                                    />
                                  )}
                                </div>
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    openContentBlockLineImageUpload(
                                      index,
                                      lineIndex,
                                      contentEditorLang
                                    )
                                  }
                                  loading={
                                    lineImageUploadingKey ===
                                    getLineUploadKey(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  {line.image ? "Change Line Image" : "Upload Line Image"}
                                </Button>
                                {line.image ? (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() =>
                                      removeContentBlockLineImage(
                                        index,
                                        lineIndex,
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    Delete Line Image
                                  </Button>
                                ) : null}
                                <Button
                                  size="xs"
                                  variant="light"
                                  onClick={() =>
                                    openContentBlockLineVideoUpload(
                                      index,
                                      lineIndex,
                                      contentEditorLang
                                    )
                                  }
                                  loading={
                                    lineVideoUploadingKey ===
                                    getLineUploadKey(index, lineIndex, contentEditorLang)
                                  }
                                >
                                  {line.video ? "Change Line Video" : "Upload Line Video"}
                                </Button>
                                {line.video ? (
                                  <Button
                                    size="xs"
                                    color="red"
                                    variant="light"
                                    onClick={() =>
                                      removeContentBlockLineVideo(
                                        index,
                                        lineIndex,
                                        contentEditorLang
                                      )
                                    }
                                  >
                                    Delete Line Video
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          ))}
                          <Button
                            size="xs"
                            variant="light"
                            leftSection={<MdAdd size={14} />}
                            onClick={() => addContentBlockLine(index, contentEditorLang)}
                          >
                            Add Line
                          </Button>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="h-16 w-20 rounded-lg border border-dashed border-slate-200 bg-white overflow-hidden flexCenter">
                            {block.video ? (
                              <video
                                src={block.video}
                                className="w-full h-full object-cover"
                                muted
                                playsInline
                                preload="metadata"
                                onLoadedMetadata={(e) => { e.target.currentTime = 0.1; }}
                              />
                            ) : block.image ? (
                              <img
                                src={block.image}
                                alt={`Block ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <MdOutlineCloudUpload
                                size={18}
                                className="text-slate-400"
                              />
                            )}
                          </div>
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => openContentBlockImageUpload(index, contentEditorLang)}
                            loading={blockImageUploadingIndex === index}
                          >
                            {block.image ? "Change Image" : "Upload Image"}
                          </Button>
                          {block.image ? (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeContentBlockImage(index, contentEditorLang)
                              }
                            >
                              Delete Image
                            </Button>
                          ) : null}
                          <Button
                            size="xs"
                            variant="light"
                            onClick={() => openContentBlockVideoUpload(index, contentEditorLang)}
                            loading={blockVideoUploadingIndex === index}
                          >
                            {block.video ? "Change Video" : "Upload Video"}
                          </Button>
                          {block.video ? (
                            <Button
                              size="xs"
                              color="red"
                              variant="light"
                              onClick={() =>
                                removeContentBlockVideo(index, contentEditorLang)
                              }
                            >
                              Delete Video
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                    <div className="text-xs text-slate-500 leading-relaxed">
                      Add blocks to mix text and media in the article body.
                    </div>
                )}
              </div>
            </div>

            {/* Blog Image Upload */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Featured Image
              </Text>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative">
                  {blogForm.image ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img
                        src={blogForm.image}
                        alt="Blog"
                        className="w-full h-44 sm:h-56 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                          Featured Image
                        </p>
                        <h4 className="text-base font-semibold leading-snug">
                          {blogForm.title_en || blogForm.title_tr || blogForm.title_ru || "Blog cover preview"}
                        </h4>
                      </div>
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size="sm"
                        radius="xl"
                        className="absolute top-3 right-3"
                        onClick={removeBlogImage}
                      >
                        <MdClose size={14} />
                      </ActionIcon>
                    </div>
                  ) : (
                    <div
                      onClick={openBlogImageUpload}
                      className="w-full h-44 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors"
                    >
                      <MdOutlineCloudUpload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-400 mt-2">
                        Click to upload cover image
                      </span>
                    </div>
                  )}
                  {blogForm.image && (
                    <Button
                      variant="light"
                      size="xs"
                      mt="xs"
                      onClick={openBlogImageUpload}
                      loading={blogImageUploading}
                    >
                      Change Image
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Preview Notes
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {getSummaryBullets(blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary).length > 0 ? (
                      getSummaryBullets(blogForm.summary_en || blogForm.summary_tr || blogForm.summary_ru || blogForm.summary).map((item, idx) => (
                        <li key={idx}>• {item}</li>
                      ))
                    ) : (
                      <>
                        <li>• Add summary lines to preview the layout.</li>
                        <li>• Each line becomes a bullet point.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Blog Video */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Blog Video (Optional)
              </Text>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative">
                  {blogForm.video ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900/5">
                      <video
                        src={blogForm.video}
                        className="w-full h-44 sm:h-56 object-cover"
                        controls
                        playsInline
                        preload="metadata"
                        poster={blogForm.image || blogForm.images?.[0] || undefined}
                      />
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size="sm"
                        radius="xl"
                        className="absolute top-3 right-3"
                        onClick={removeBlogVideo}
                      >
                        <MdClose size={14} />
                      </ActionIcon>
                    </div>
                  ) : (
                    <div
                      onClick={openBlogVideoUpload}
                      className="w-full h-44 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors"
                    >
                      <MdOutlineCloudUpload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-400 mt-2">
                        Click to upload video
                      </span>
                    </div>
                  )}
                  {blogForm.video && (
                    <Button
                      variant="light"
                      size="xs"
                      mt="xs"
                      onClick={openBlogVideoUpload}
                      loading={blogVideoUploading}
                    >
                      Change Video
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Video Tips
                  </p>
                  <Text size="xs" c="dimmed" className="mt-2">
                    Recommended formats: MP4 or WebM. Shorter clips load faster.
                  </Text>
                </div>
              </div>
            </div>

            {/* Blog Gallery Images */}
            <div>
              <Text size="sm" fw={500} mb={4}>
                Gallery Images (Optional)
              </Text>
              <div className="flex flex-wrap gap-2 mb-2">
                {blogForm.images && blogForm.images.map((img, index) => (
                  <div key={index} className="relative">
                    <button
                      type="button"
                      className="block"
                      onClick={() => setCoverFromGallery(index)}
                      aria-label="Set cover image"
                    >
                      <img
                        src={img}
                        alt={`Gallery ${index + 1}`}
                        className={`w-20 h-20 rounded-lg object-cover border ${
                          blogForm.image === img ? "border-secondary ring-2 ring-secondary/40" : "border-gray-200"
                        }`}
                      />
                    </button>
                    <ActionIcon
                      variant="filled"
                      color="red"
                      size="xs"
                      radius="xl"
                      className="absolute -top-1 -right-1"
                      onClick={() => removeBlogGalleryImage(index)}
                    >
                      <MdClose size={10} />
                    </ActionIcon>
                    {blogForm.image !== img && (
                      <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white border border-gray-200 rounded-full px-2 py-0.5 text-[9px] text-gray-600 shadow-sm">
                        Click to set cover
                      </span>
                    )}
                  </div>
                ))}
                <div
                  onClick={openBlogGalleryUpload}
                  className={`w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-blue-500 hover:bg-gray-50 transition-colors ${blogGalleryUploading ? 'opacity-50' : ''}`}
                >
                  {blogGalleryUploading ? (
                    <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <MdOutlineCloudUpload size={20} className="text-gray-400" />
                      <span className="text-[10px] text-gray-400">Add</span>
                    </>
                  )}
                </div>
              </div>
              <Text size="xs" c="dimmed">
                Add multiple images for the blog gallery (max 10)
              </Text>
            </div>

            <Switch
              label="Published"
              checked={blogForm.published}
              onChange={(e) =>
                setBlogForm({
                  ...blogForm,
                  published: e.currentTarget.checked,
                })
              }
            />

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setEditBlogModalOpened(false);
                  setSelectedBlog(null);
                  resetBlogForm();
                }}
              >
                Cancel
              </Button>
              <Button
                color="blue"
                onClick={handleUpdateBlog}
                loading={blogLoading}
              >
                Update Blog
              </Button>
            </Group>
          </div>
        </Modal>

        {/* Delete Blog Confirmation Modal */}
        <Modal
          opened={deleteBlogModalOpened}
          onClose={() => {
            setDeleteBlogModalOpened(false);
            setBlogToDelete(null);
          }}
          title={
            <Text fw={600} color="red">
              Delete Blog
            </Text>
          }
          centered
        >
          <div className="py-4">
            <Text size="sm" color="dimmed" mb="md">
              Are you sure you want to delete this blog? This action cannot be
              undone.
            </Text>
            {blogToDelete && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
                {blogToDelete.image && (
                  <img
                    src={blogToDelete.image}
                    alt={blogToDelete.title}
                    className="w-20 h-14 rounded-lg object-cover"
                  />
                )}
                <div>
                  <Text size="sm" fw={500}>
                    {blogToDelete.title}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {blogToDelete.category}
                  </Text>
                </div>
              </div>
            )}
            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setDeleteBlogModalOpened(false);
                  setBlogToDelete(null);
                }}
              >
                Cancel
              </Button>
              <Button
                color="red"
                onClick={confirmDeleteBlog}
                loading={blogLoading}
              >
                Delete
              </Button>
            </Group>
          </div>
        </Modal>

        {/* AI Blog Generation Modal */}
        <Modal
          opened={aiGenerateModalOpened}
          onClose={() => {
            setAiGenerateModalOpened(false);
            resetAiMarketData();
            resetAiBlogForm();
          }}
          title={
            <Text fw={600} className="flex items-center gap-2">
              <span className="text-2xl">🤖</span> AI Blog Generator
            </Text>
          }
          size="xl"
          centered
        >
          <div className="space-y-4 py-2">
            <Text size="sm" color="dimmed" mb="md">
              Set optional blog details and generate SEO-optimized articles in both English and Turkish.
            </Text>

            <Divider label="Blog Details (Optional)" />

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Title (English)"
                placeholder="Leave blank to auto-generate"
                value={aiBlogForm.title_en}
                onChange={(e) =>
                  setAiBlogForm({ ...aiBlogForm, title_en: e.target.value })
                }
              />
              <TextInput
                label="Title (Turkish)"
                placeholder="Leave blank to auto-generate"
                value={aiBlogForm.title_tr}
                onChange={(e) =>
                  setAiBlogForm({ ...aiBlogForm, title_tr: e.target.value })
                }
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <TextInput
                label="Category"
                placeholder="e.g., Real Estate, Investment, Tips"
                value={aiBlogForm.category}
                onChange={(e) =>
                  setAiBlogForm({ ...aiBlogForm, category: e.target.value })
                }
              />
              <Select
                label="Country"
                placeholder="e.g., Greece"
                searchable
                clearable
                data={countryOptions}
                value={aiBlogForm.country || null}
                onChange={(value) =>
                  setAiBlogForm({ ...aiBlogForm, country: value || "" })
                }
              />
            </div>

            <Select
              label="About Turkey menu (optional)"
              placeholder="Link this post to a navbar title"
              searchable
              clearable
              data={aboutTurkeyMenuOptions}
              value={
                aboutTurkeyMenuOptions.some(
                  (option) => option.value === aiBlogForm.menuKey
                )
                  ? aiBlogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setAiBlogForm({ ...aiBlogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Buyer Guide menu (optional)"
              placeholder="Link this post to a buyer guide item"
              searchable
              clearable
              data={buyerGuideMenuOptions}
              value={
                buyerGuideMenuOptions.some(
                  (option) => option.value === aiBlogForm.menuKey
                )
                  ? aiBlogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setAiBlogForm({ ...aiBlogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Turkish Citizenship (optional)"
              placeholder="Link this post to Turkish Citizenship"
              searchable
              clearable
              data={citizenshipMenuOptions}
              value={
                citizenshipMenuOptions.some(
                  (option) => option.value === aiBlogForm.menuKey
                )
                  ? aiBlogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setAiBlogForm({ ...aiBlogForm, menuKey: value || "" })
              }
            />
            <Select
              label="Investment Opportunities (optional)"
              placeholder="Link this post to Investment Opportunities"
              searchable
              clearable
              data={investmentOpportunitiesMenuOptions}
              value={
                investmentOpportunitiesMenuOptions.some(
                  (option) => option.value === aiBlogForm.menuKey
                )
                  ? aiBlogForm.menuKey
                  : null
              }
              onChange={(value) =>
                setAiBlogForm({ ...aiBlogForm, menuKey: value || "" })
              }
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Textarea
                label="Summary (English) - Optional"
                placeholder="Leave blank to auto-generate"
                rows={3}
                value={aiBlogForm.summary_en}
                onChange={(e) =>
                  setAiBlogForm({ ...aiBlogForm, summary_en: e.target.value })
                }
              />
              <Textarea
                label="Summary (Turkish) - Optional"
                placeholder="Leave blank to auto-generate"
                rows={3}
                value={aiBlogForm.summary_tr}
                onChange={(e) =>
                  setAiBlogForm({ ...aiBlogForm, summary_tr: e.target.value })
                }
              />
            </div>

            <Text size="xs" color="dimmed">
              Leave fields blank to let AI generate titles, categories, and summaries.
            </Text>

            <div>
              <Text size="sm" fw={500} mb={4}>
                Featured Image (Optional)
              </Text>
              <div className="grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="relative">
                  {aiBlogForm.image ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200">
                      <img
                        src={aiBlogForm.image}
                        alt="Blog"
                        className="w-full h-44 sm:h-56 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                      <div className="absolute bottom-3 left-4 right-4 text-white">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                          Featured Image
                        </p>
                        <h4 className="text-base font-semibold leading-snug">
                          {aiBlogForm.title_en ||
                            aiBlogForm.title_tr ||
                            "Blog cover preview"}
                        </h4>
                      </div>
                      <ActionIcon
                        variant="filled"
                        color="red"
                        size="sm"
                        radius="xl"
                        className="absolute top-3 right-3"
                        onClick={removeAiBlogImage}
                      >
                        <MdClose size={14} />
                      </ActionIcon>
                    </div>
                  ) : (
                    <div
                      onClick={openAiBlogImageUpload}
                      className="w-full h-44 sm:h-56 rounded-2xl border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-teal-500 hover:bg-gray-50 transition-colors"
                    >
                      <MdOutlineCloudUpload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-400 mt-2">
                        Click to upload cover image
                      </span>
                    </div>
                  )}
                  {aiBlogForm.image && (
                    <Button
                      variant="light"
                      size="xs"
                      mt="xs"
                      onClick={openAiBlogImageUpload}
                      loading={aiBlogImageUploading}
                    >
                      Change Image
                    </Button>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Preview Notes
                  </p>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600">
                    {getSummaryBullets(
                      aiBlogForm.summary_en || aiBlogForm.summary_tr
                    ).length > 0 ? (
                      getSummaryBullets(
                        aiBlogForm.summary_en || aiBlogForm.summary_tr
                      ).map((item, idx) => <li key={idx}>- {item}</li>)
                    ) : (
                      <>
                        <li>- Add summary lines to preview the layout.</li>
                        <li>- Each line becomes a bullet point.</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <Switch
              label="Publish immediately after generation"
              checked={aiMarketData.autoPublish}
              onChange={(e) =>
                setAiMarketData({
                  ...aiMarketData,
                  autoPublish: e.currentTarget.checked,
                })
              }
            />

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 mt-4 border border-blue-100">
              <Text size="xs" color="dimmed">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">🌐</span>
                  <strong className="text-gray-700">Bilingual Content Generation</strong>
                </div>
                AI will generate 1200-1800 word SEO-optimized articles in <strong>English</strong> and <strong>Turkish</strong>:
                <ul className="mt-2 ml-4 space-y-1">
                  <li>• 🇬🇧 Full English article with SEO optimization</li>
                  <li>• 🇹🇷 Full Turkish article with SEO optimization</li>
                  <li>• SEO-friendly titles and meta descriptions</li>
                  <li>• Market trend analysis & investment insights</li>
                  <li>• FAQ section (5 questions per language)</li>
                  <li>• Internal linking suggestions</li>
                </ul>
                <p className="mt-3 text-amber-600 font-medium">Generation may take 60-90 seconds due to bilingual content.</p>
              </Text>
            </div>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="default"
                onClick={() => {
                  setAiGenerateModalOpened(false);
                  resetAiMarketData();
                  resetAiBlogForm();
                }}
                disabled={aiGenerating}
              >
                Cancel
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "indigo", to: "cyan" }}
                onClick={handleGenerateAIBlog}
                loading={aiGenerating}
                leftSection={!aiGenerating && <span>🤖</span>}
              >
                {aiGenerating ? "Generating..." : "Generate Blog"}
              </Button>
            </Group>
          </div>
        </Modal>
      </Container>
    </div>
  );
};

export default AdminPanel;

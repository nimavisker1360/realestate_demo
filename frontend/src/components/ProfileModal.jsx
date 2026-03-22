import { useState, useContext, useEffect } from "react";
import {
  Modal,
  TextInput,
  Button,
  Avatar,
  Text,
  Group,
  ActionIcon,
  Divider,
} from "@mantine/core";
import { useAuth0 } from "@auth0/auth0-react";
import PropTypes from "prop-types";
import UserDetailContext from "../context/UserDetailContext";
import { getUserProfile, updateUserProfile } from "../utils/api";
import { toast } from "react-toastify";
import { bilingualKey } from "../utils/bilingualToast";
import { useTranslation } from "react-i18next";
import {
  MdPerson,
  MdEmail,
  MdOutlineCloudUpload,
  MdClose,
  MdCheck,
  MdWarning,
  MdLocationOn,
} from "react-icons/md";
import { FaWhatsapp } from "react-icons/fa6";
import { pickAndUploadImages } from "../utils/blobUpload";
import UploadProgressBar from "./UploadProgressBar";

const ProfileModal = ({ opened, setOpened }) => {
  const { t } = useTranslation();
  const { user } = useAuth0();
  const {
    userDetails: { token },
    setUserDetails,
  } = useContext(UserDetailContext);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    image: "",
    phone: "",
    address: "",
  });
  const [profileComplete, setProfileComplete] = useState(false);

  // Fetch user profile when modal opens
  useEffect(() => {
    const fetchProfile = async () => {
      if (opened && user?.email && token) {
        setLoading(true);
        try {
          const profile = await getUserProfile(user.email, token);
          if (profile) {
            setFormData({
              name: profile.name || user.name || "",
              email: profile.email || user.email || "",
              image: profile.image || user.picture || "",
              phone: profile.phone || "",
              address: profile.address || "",
            });
            setProfileComplete(profile.profileComplete || false);
          } else {
            // Use Auth0 user data as fallback
            setFormData({
              name: user.name || "",
              email: user.email || "",
              image: user.picture || "",
              phone: "",
              address: "",
            });
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
          // Use Auth0 user data as fallback
          setFormData({
            name: user.name || "",
            email: user.email || "",
            image: user.picture || "",
            phone: "",
            address: "",
          });
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProfile();
  }, [opened, user, token]);

  const openImageUpload = async () => {
    try {
      setImageUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: false,
        onProgress: setUploadProgress,
      });
      if (urls.length) setFormData((prev) => ({ ...prev, image: urls[0] }));
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setImageUploading(false);
      setUploadProgress(null);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image: "" }));
  };

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.image ||
      !formData.phone ||
      !formData.address
    ) {
      toast.error(bilingualKey("profile.fillAllFields"), {
        position: "bottom-right",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await updateUserProfile(
        {
          email: formData.email,
          name: formData.name,
          image: formData.image,
          phone: formData.phone,
          address: formData.address,
        },
        token
      );

      if (result.user) {
        setProfileComplete(result.user.profileComplete);
        setUserDetails((prev) => ({
          ...prev,
          profile: result.user,
        }));
        toast.success(bilingualKey("profile.profileUpdated"), {
          position: "bottom-right",
        });
        setOpened(false);
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const isFormComplete =
    formData.name && formData.image && formData.phone && formData.address;

  return (
    <Modal
      opened={opened}
      onClose={() => setOpened(false)}
      title={
        <div className="flex items-center gap-2">
          <MdPerson className="text-secondary" size={24} />
          <Text fw={600} size="lg">
            {t("profile.myProfile")}
          </Text>
        </div>
      }
      size="md"
      centered
    >
      {loading ? (
        <div className="flexCenter py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
        </div>
      ) : (
        <div className="space-y-5 py-2">
          {/* Profile Status */}
          <div
            className={`p-3 rounded-lg flex items-center gap-3 ${
              profileComplete
                ? "bg-green-50 border border-green-200"
                : "bg-amber-50 border border-amber-200"
            }`}
          >
            {profileComplete ? (
              <>
                <div className="w-8 h-8 rounded-full bg-green-500 flexCenter">
                  <MdCheck className="text-white" size={18} />
                </div>
                <div>
                  <Text size="sm" fw={600} color="green">
                    {t("profile.profileCompleted")}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {t("profile.accessAllFeatures")}
                  </Text>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-amber-500 flexCenter">
                  <MdWarning className="text-white" size={18} />
                </div>
                <div>
                  <Text size="sm" fw={600} color="orange">
                    {t("profile.profileIncomplete")}
                  </Text>
                  <Text size="xs" color="dimmed">
                    {t("profile.completeProfileToBook")}
                  </Text>
                </div>
              </>
            )}
          </div>

          <Divider />

          {/* Profile Image */}
          <div className="flexCenter flex-col gap-3">
            <Text size="sm" fw={500}>
              {t("profile.profilePhoto")} <span className="text-red-500">*</span>
            </Text>
            {formData.image ? (
              <div className="relative">
                <Avatar src={formData.image} size={120} radius={120} />
                <ActionIcon
                  variant="filled"
                  color="red"
                  size="sm"
                  radius="xl"
                  className="absolute top-0 right-0"
                  onClick={removeImage}
                >
                  <MdClose size={14} />
                </ActionIcon>
              </div>
            ) : (
              <div
                onClick={openImageUpload}
                className="w-28 h-28 rounded-full border-2 border-dashed border-gray-300 flexCenter flex-col cursor-pointer hover:border-secondary hover:bg-gray-50 transition-colors"
              >
                <MdOutlineCloudUpload size={28} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">{t("profile.upload")}</span>
              </div>
            )}
            {formData.image && (
              <Button
                variant="subtle"
                size="xs"
                onClick={openImageUpload}
                loading={imageUploading}
              >
                {t("profile.change")}
              </Button>
            )}
            {imageUploading && <UploadProgressBar progress={uploadProgress} />}
          </div>

          {/* Form Fields */}
          <TextInput
            label={
              <span>
                {t("profile.fullName")} <span className="text-red-500">*</span>
              </span>
            }
            placeholder={t("profile.fullNamePlaceholder")}
            leftSection={<MdPerson size={18} />}
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <TextInput
            label={t("profile.email")}
            placeholder={t("profile.emailPlaceholder")}
            leftSection={<MdEmail size={18} />}
            value={formData.email}
            disabled
            description={t("profile.emailCannotBeChanged")}
          />

          <TextInput
            label={
              <span>
                {t("profile.whatsapp")} <span className="text-red-500">*</span>
              </span>
            }
            placeholder={t("profile.whatsappPlaceholder")}
            leftSection={<FaWhatsapp size={18} className="text-green-500" />}
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />

          <TextInput
            label={
              <span>
                {t("profile.address")} <span className="text-red-500">*</span>
              </span>
            }
            placeholder={t("profile.addressPlaceholder")}
            leftSection={<MdLocationOn size={18} />}
            value={formData.address}
            onChange={(e) =>
              setFormData({ ...formData, address: e.target.value })
            }
          />

          <Divider />

          {/* Action Buttons */}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setOpened(false)}>
              {t("profile.cancel")}
            </Button>
            <Button
              color="green"
              onClick={handleSave}
              loading={saving}
              disabled={!isFormComplete}
              leftSection={<MdCheck size={18} />}
            >
              {t("profile.save")}
            </Button>
          </Group>
        </div>
      )}
    </Modal>
  );
};

ProfileModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  setOpened: PropTypes.func.isRequired,
};

export default ProfileModal;

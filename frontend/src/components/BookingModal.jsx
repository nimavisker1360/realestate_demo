import { useContext, useState, useEffect } from "react";
import { Modal, Button, Text, Divider, Alert } from "@mantine/core";
import { DatePicker } from "@mantine/dates";
import { useMutation } from "react-query";
import PropTypes from "prop-types";
import { useTranslation } from "react-i18next";
import UserDetailContext from "../context/UserDetailContext";
import { bookVisit, getUserProfile } from "../utils/api";
import { toast } from "react-toastify";
import { bilingualFromMessage, bilingualKey } from "../utils/bilingualToast";
import dayjs from "dayjs";
import { MdWarning, MdPerson } from "react-icons/md";
import ProfileModal from "./ProfileModal";

const BookingModal = ({ opened, setOpened, email, propertyId }) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(null);
  const [profileComplete, setProfileComplete] = useState(null);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [profileModalOpened, setProfileModalOpened] = useState(false);

  const {
    userDetails: { token },
    setUserDetails,
  } = useContext(UserDetailContext);

  // Check if profile is complete when modal opens
  useEffect(() => {
    const checkProfile = async () => {
      if (opened && email && token) {
        setCheckingProfile(true);
        try {
          const profile = await getUserProfile(email, token);
          setProfileComplete(profile?.profileComplete || false);
        } catch (error) {
          console.error("Error checking profile:", error);
          setProfileComplete(false);
        } finally {
          setCheckingProfile(false);
        }
      }
    };
    checkProfile();
  }, [opened, email, token]);

  const handleBookingSuccess = () => {
    toast.success(bilingualKey("booking.bookingConfirmed"), {
      position: "bottom-right",
    });
    setUserDetails((prev) => ({
      ...prev,
      bookings: [
        ...prev.bookings,
        {
          id: propertyId,
          date: dayjs(value).format("DD/MM/YYYY"),
        },
      ],
    }));
  };

  const { mutate, isLoading } = useMutation({
    mutationFn: () => bookVisit(value, propertyId, email, token),
    onSuccess: () => handleBookingSuccess(),
    onError: ({ response }) =>
      toast.error(
        bilingualFromMessage(response?.data?.message, "toast.genericError")
      ),
    onSettled: () => setOpened(false),
  });

  const handleProfileComplete = () => {
    setProfileModalOpened(false);
    // Re-check profile after modal closes
    const recheckProfile = async () => {
      const profile = await getUserProfile(email, token);
      setProfileComplete(profile?.profileComplete || false);
    };
    recheckProfile();
  };

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        title={t("booking.selectDate")}
        centered
      >
        {checkingProfile ? (
          <div className="flexCenter py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary"></div>
          </div>
        ) : !profileComplete ? (
          // Profile not complete - show warning
          <div className="py-4">
            <Alert
              icon={<MdWarning size={24} />}
              title={t("booking.profileIncompleteTitle")}
              color="orange"
              variant="light"
              className="mb-4"
            >
              <Text size="sm">
                {t("booking.profileIncompleteMessage")}
              </Text>
              <ul className="list-disc list-inside mt-2 text-sm">
                <li>{t("booking.profilePhoto")}</li>
                <li>{t("booking.fullName")}</li>
                <li>{t("booking.whatsappNumber")}</li>
                <li>{t("booking.address")}</li>
              </ul>
            </Alert>

            <Divider my="md" />

            <div className="flex flex-col gap-3">
              <Button
                color="orange"
                leftSection={<MdPerson size={18} />}
                onClick={() => {
                  setOpened(false);
                  setProfileModalOpened(true);
                }}
                fullWidth
              >
                {t("booking.completeProfile")}
              </Button>
              <Button
                variant="subtle"
                color="gray"
                onClick={() => setOpened(false)}
                fullWidth
              >
                {t("booking.later")}
              </Button>
            </div>
          </div>
        ) : (
          // Profile complete - show date picker
          <div className="flexCenter flex-col gap-4">
            <DatePicker value={value} onChange={setValue} minDate={new Date()} />
            <Button
              disabled={!value || isLoading}
              onClick={() => mutate()}
              loading={isLoading}
              fullWidth
            >
              {t("booking.bookVisit")}
            </Button>
          </div>
        )}
      </Modal>

      {/* Profile Modal for completing profile */}
      <ProfileModal opened={profileModalOpened} setOpened={handleProfileComplete} />
    </>
  );
};

BookingModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  setOpened: PropTypes.func.isRequired,
  email: PropTypes.string.isRequired,
  propertyId: PropTypes.string.isRequired,
};

export default BookingModal;

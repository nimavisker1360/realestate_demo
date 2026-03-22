import { useState, useContext, useEffect } from "react";
import { Avatar, Menu, Divider, Badge } from "@mantine/core";
import { useNavigate } from "react-router-dom";
import PropTypes from "prop-types";
import useAdmin from "../hooks/useAdmin";
import UserDetailContext from "../context/UserDetailContext";
import { getUserProfile } from "../utils/api";
import { MdDashboard, MdPerson } from "react-icons/md";
import ProfileModal from "./ProfileModal";
import { useAuth0 } from "@auth0/auth0-react";
import { useTranslation } from "react-i18next";

const ProfileMenu = ({ user, logout }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdmin();
  const [profileModalOpened, setProfileModalOpened] = useState(false);
  const [profileComplete, setProfileComplete] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const { user: auth0User } = useAuth0();
  const {
    userDetails: { token, profile },
  } = useContext(UserDetailContext);

  // Check if profile is complete and get profile image
  useEffect(() => {
    const checkProfile = async () => {
      if (auth0User?.email && token) {
        const profileData = await getUserProfile(auth0User.email, token);
        if (profileData) {
          setProfileComplete(profileData.profileComplete || false);
          setProfileImage(profileData.image || null);
        }
      }
    };
    checkProfile();
  }, [auth0User, token]);

  // Update profile image when profile in context changes
  useEffect(() => {
    if (profile?.image) {
      setProfileImage(profile.image);
      setProfileComplete(profile.profileComplete || false);
    }
  }, [profile]);

  return (
    <>
      <Menu>
        <Menu.Target>
          <Avatar
            src={profileImage || user?.picture}
            alt={user?.name ? `${user.name} profile photo` : "User profile photo"}
            radius={"xl"}
            className="cursor-pointer"
          />
        </Menu.Target>
        <Menu.Dropdown>
          {/* Profile Section */}
          <Menu.Item
            leftSection={<MdPerson size={16} />}
            onClick={() => setProfileModalOpened(true)}
            rightSection={
              !profileComplete && (
                <Badge size="xs" color="orange" variant="light">
                  {t("profile.incomplete")}
                </Badge>
              )
            }
          >
            {t("profile.myProfile")}
          </Menu.Item>
          <Divider my="xs" />

          {/* Admin Section - Only visible for admins */}
          {!loading && isAdmin && (
            <>
              <Menu.Label>Admin</Menu.Label>
              <Menu.Item
                leftSection={<MdDashboard size={16} />}
                onClick={() => navigate("/admin", { replace: true })}
                color="green"
              >
                {t("profile.adminPanel")}
              </Menu.Item>
              <Divider my="xs" />
            </>
          )}

          <Menu.Item
            onClick={() => navigate("./favourites", { replace: true })}
          >
            {t("profile.favourites")}
          </Menu.Item>
          <Menu.Item onClick={() => navigate("./bookings", { replace: true })}>
            {t("profile.bookings")}
          </Menu.Item>
          <Menu.Item
            onClick={() => {
              localStorage.clear();
              logout();
            }}
            color="red"
          >
            {t("profile.logout")}
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>

      {/* Profile Modal */}
      <ProfileModal
        opened={profileModalOpened}
        setOpened={setProfileModalOpened}
      />
    </>
  );
};

ProfileMenu.propTypes = {
  user: PropTypes.shape({
    picture: PropTypes.string,
    name: PropTypes.string,
  }),
  logout: PropTypes.func.isRequired,
};

export default ProfileMenu;

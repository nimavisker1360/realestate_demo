import { useState } from "react";
import { useTranslation } from "react-i18next";
import { MdLocationOn, MdPhone, MdEmail } from "react-icons/md";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";
import { buildEmailHref } from "../utils/common";
import PhoneLink from "../components/PhoneLink";
import { PRIMARY_CONTACT_PHONE } from "../constant/data";

// Fix leaflet default icon
let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
});
L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map fly to location
const FlyToLocation = ({ position }) => {
  const map = useMap();
  if (position) {
    map.flyTo(position, 15, { duration: 1.5 });
  }
  return null;
};

const Addresses = () => {
  const { t } = useTranslation();
  const [selectedBranch, setSelectedBranch] = useState(null);

  const branches = [
    {
      id: 1,
      nameKey: "mainBranch",
      address: "Koza Mah. 1638 Sk., Açelya G2 Blokları, No.37F İç Kapı No.73, Esenyurt/İstanbul",
      position: [41.0255, 28.6733], // Esenyurt coordinates
    },
    {
      id: 2,
      nameKey: "secondBranch",
      address: "Koza Mh. 1638 SK. Aşelya 5F Dükkan No:32, Esenyurt, İstanbul",
      position: [41.0261, 28.6741], // Esenyurt coordinates
    },
    {
      id: 3,
      nameKey: "cyprusBranch",
      address: "Ecevit Sok. Karalım Sitesi No:10/1, Göneyli, Lefkoşa",
      position: [35.1856, 33.3823], // Lefkoşa coordinates
    },
  ];

  const contactInfo = {
    phone: PRIMARY_CONTACT_PHONE,
    email: "demo.realestate@gmail.com",
  };

  const handleBranchClick = (branch) => {
    setSelectedBranch(branch);
  };

  return (
    <div className="min-h-screen bg-[#1e2a38] pt-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-[#1e2a38] to-[#2d3e50] py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4">
              {t("addresses.title")}
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              {t("addresses.subtitle")}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Address List */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xl font-bold text-white mb-6">
              {t("addresses.ourBranches")}
            </h2>
            
            {branches.map((branch) => (
              <div
                key={branch.id}
                onClick={() => handleBranchClick(branch)}
                className={`p-5 rounded-xl cursor-pointer transition-all duration-300 ${
                  selectedBranch?.id === branch.id
                    ? "bg-[#06a84e] text-white shadow-lg"
                    : "bg-white/10 hover:bg-white/20 text-white shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <MdLocationOn
                    className={`text-2xl flex-shrink-0 mt-0.5 ${
                      selectedBranch?.id === branch.id ? "text-white" : "text-[#06a84e]"
                    }`}
                  />
                  <div>
                    <h3 className="font-semibold mb-1">
                      {t(`addresses.${branch.nameKey}`)}
                    </h3>
                    <p
                      className={`text-sm leading-relaxed ${
                        selectedBranch?.id === branch.id ? "text-white/90" : "text-white/70"
                      }`}
                    >
                      {branch.address}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {/* Contact Info */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <h3 className="font-semibold text-white mb-4">{t("addresses.contactTitle")}</h3>
              
              <PhoneLink
                phone={contactInfo.phone}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                <MdPhone className="text-[#06a84e] text-xl" />
                <div>
                  <p className="text-xs text-white/50">{t("contact.contactNumber")}</p>
                  <p className="text-sm font-medium text-white">{contactInfo.phone}</p>
                </div>
              </PhoneLink>

              <a
                href={buildEmailHref(contactInfo.email)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
              >
                <MdEmail className="text-[#06a84e] text-xl" />
                <div>
                  <p className="text-xs text-white/50">{t("contact.emailAddress")}</p>
                  <p className="text-sm font-medium text-white">{contactInfo.email}</p>
                </div>
              </a>
            </div>
          </div>

          {/* Map */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden h-[500px] lg:h-[600px]">
              <MapContainer
                center={[39.0, 32.0]} // Center of Turkey
                zoom={6}
                scrollWheelZoom={true}
                className="h-full w-full z-0"
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                
                {/* Markers for all branches */}
                {branches.map((branch) => (
                  <Marker
                    key={branch.id}
                    position={branch.position}
                    icon={DefaultIcon}
                    eventHandlers={{
                      click: () => handleBranchClick(branch),
                    }}
                  >
                    <Popup>
                      <div className="p-2">
                        <h4 className="font-semibold text-gray-800 mb-1">
                          {t(`addresses.${branch.nameKey}`)}
                        </h4>
                        <p className="text-sm text-gray-600">{branch.address}</p>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Fly to selected location */}
                {selectedBranch && <FlyToLocation position={selectedBranch.position} />}
              </MapContainer>
            </div>
            
            <p className="text-center text-white/50 text-sm mt-4">
              {t("addresses.clickToView")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Addresses;

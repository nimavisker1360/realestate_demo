import { useState, useEffect } from "react";
import { Container, Modal, Stepper } from "@mantine/core";
import AddLocation from "./AddLocation";
import { useAuth0 } from "@auth0/auth0-react";
import UploadImage from "./UploadImage";
import BasicDetails from "./BasicDetails";
import Facilities from "./Facilities";
import ProjectDetails from "./ProjectDetails";
import PropTypes from "prop-types";

const getDefaultFiatCurrency = () => {
  const currency = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || "USD"
  ).toUpperCase();
  return ["USD", "EUR", "GBP", "TRY"].includes(currency) ? currency : "USD";
};

const AddPropertyModal = ({ opened, setOpened }) => {
  const [active, setActive] = useState(0);
  const { user } = useAuth0();
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
    videos: [],
    facilities: {
      bedrooms: 0,
      parkings: 0,
      bathrooms: 0,
    },
    propertyType: "sale",
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
    // Project-specific fields
    projectName: "",
    deliveryDate: "",
    projectStatus: "devam-ediyor",
    listingStatus: "",
    projeHakkinda: null,
    dairePlanlari: [],
    vaziyetPlani: "",
    iletisim: null,
    ozellikler: null,
  });

  // Check if current property type is local-project
  const isLocalProject = propertyDetails.propertyType === "local-project";

  // Dynamic step count based on property type
  const maxSteps = propertyDetails.propertyType === "international-project" ? 5 : 4;

  // Reset modal when it opens
  useEffect(() => {
    if (opened) {
      setActive(0);
    }
  }, [opened]);

  const nextStep = () => {
    setActive((current) => (current < maxSteps ? current + 1 : current));
  };
  const prevStep = () => {
    setActive((current) => (current > 0 ? current - 1 : current));
  };

  return (
    <Modal
      opened={opened}
      onClose={() => {
        setOpened(false);
        setActive(0);
      }}
      closeOnClickOutside
      size={"90rem"}
    >
      <Container h={"40rem"} w={"100%"}>
        <Stepper
          key={`stepper-${propertyDetails.propertyType}`}
          active={active}
          onStepClick={setActive}
          breakpoint="sm"
          allowNextStepsSelect={false}
        >
          <Stepper.Step label="Konum" description="Adres ve şehir">
            <AddLocation
              nextStep={nextStep}
              propertyDetails={propertyDetails}
              setPropertyDetails={setPropertyDetails}
            />
          </Stepper.Step>
          <Stepper.Step label="Görseller" description="Fotoğraf yükle">
            <UploadImage
              prevStep={prevStep}
              nextStep={nextStep}
              propertyDetails={propertyDetails}
              setPropertyDetails={setPropertyDetails}
            />
          </Stepper.Step>
          {propertyDetails.propertyType !== "local-project" && (
            <Stepper.Step label="Detaylar" description="Ana özellikler">
              <BasicDetails
                prevStep={prevStep}
                nextStep={nextStep}
                propertyDetails={propertyDetails}
                setPropertyDetails={setPropertyDetails}
              />
            </Stepper.Step>
          )}
          {propertyDetails.propertyType === "local-project" && (
            <Stepper.Step label="Proje Detayları" description="Proje bilgileri">
              <ProjectDetails
                prevStep={prevStep}
                nextStep={nextStep}
                propertyDetails={propertyDetails}
                setPropertyDetails={setPropertyDetails}
              />
            </Stepper.Step>
          )}
          {propertyDetails.propertyType === "international-project" && (
            <Stepper.Step label="Proje Detayları" description="Proje bilgileri">
              <ProjectDetails
                prevStep={prevStep}
                nextStep={nextStep}
                propertyDetails={propertyDetails}
                setPropertyDetails={setPropertyDetails}
              />
            </Stepper.Step>
          )}
          <Stepper.Step label="Olanaklar" description="Oda sayısı">
            <Facilities
              prevStep={prevStep}
              propertyDetails={propertyDetails}
              setPropertyDetails={setPropertyDetails}
              setOpened={setOpened}
              setActiveStep={setActive}
            />
          </Stepper.Step>
          <Stepper.Completed>
            Tamamlandı, önceki adıma dönmek için geri butonuna tıklayın
          </Stepper.Completed>
        </Stepper>
      </Container>
    </Modal>
  );
};

AddPropertyModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  setOpened: PropTypes.func.isRequired,
};

export default AddPropertyModal;

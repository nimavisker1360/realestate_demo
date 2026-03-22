import { useAuth0 } from "@auth0/auth0-react";
import { Box, Button, Group, NumberInput } from "@mantine/core";
import { useForm } from "@mantine/form";
import { useContext } from "react";
import UserDetailContext from "../context/UserDetailContext";
import useProperties from "../hooks/useProperties";
import { useMutation } from "react-query";
import { toast } from "react-toastify";
import { bilingualFromMessage, bilingualKey } from "../utils/bilingualToast";
import { createResidency } from "../utils/api";
import PropTypes from "prop-types";
import { useNavigate } from "react-router-dom";

const getDefaultFiatCurrency = () => {
  const currency = String(
    import.meta.env.VITE_DEFAULT_FIAT_CURRENCY || "USD"
  ).toUpperCase();
  return ["USD", "EUR", "GBP", "TRY"].includes(currency) ? currency : "USD";
};

const Facilities = ({
  prevStep,
  propertyDetails,
  setPropertyDetails,
  setOpened,
  setActiveStep,
  onSuccess,
  isPageMode = false,
}) => {
  const form = useForm({
    initialValues: {
      bedrooms: propertyDetails.facilities.bedrooms,
      parkings: propertyDetails.facilities.parkings,
      bathrooms: propertyDetails.facilities.bathrooms,
    },
    // All fields are optional - no validation required
  });
  const { bedrooms, parkings, bathrooms } = form.values;

  const handleSubmit = () => {
    // All fields are optional, submit directly
    setPropertyDetails((prev) => ({
      ...prev,
      facilities: { bedrooms, parkings, bathrooms },
    }));
    mutate();
  };

  //   Upload
  const { user } = useAuth0();
  const navigate = useNavigate();
  const {
    userDetails: { token },
  } = useContext(UserDetailContext);
  const { refetch: refetchProperties } = useProperties();

  const { mutate, isLoading } = useMutation({
    mutationFn: () =>
      createResidency(
        {
          ...propertyDetails,
          facilities: { bedrooms, parkings, bathrooms },
        },
        token,
        user?.email // Pass userEmail obtained from Auth0
      ),
    onError: (error) => {
      const message = error?.response?.data?.message || "Error adding property";
      toast.error(bilingualFromMessage(message, "toast.propertyAddError"), {
        position: "bottom-right",
      });
    },
    onSuccess: () => {
      toast.success(bilingualKey("toast.propertyAddedSuccess"), {
        position: "bottom-right",
      });
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
        // Reset Turkish real estate fields
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
        deliveryDate: "",
        projectStatus: "devam-ediyor",
        listingStatus: "",
        projeHakkinda: null,
        dairePlanlari: [],
        vaziyetPlani: "",
        iletisim: null,
        ozellikler: null,
        gyo: false,
      });

      if (isPageMode) {
        // For page mode (admin panel)
        setActiveStep(4); // Go to completed step
        if (onSuccess) onSuccess();
      } else {
        // For modal mode
        setOpened(false);
        setActiveStep(0);
      }
      refetchProperties();
    },
  });

  return (
    <Box maw={"50%"} mx="auto" my={"sm"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <NumberInput
          label="Yatak Odası Sayısı"
          min={0}
          {...form.getInputProps("bedrooms")}
        />
        <NumberInput
          label="Banyo Sayısı"
          min={0}
          {...form.getInputProps("bathrooms")}
        />
        <NumberInput
          label="Otopark Sayısı"
          min={0}
          {...form.getInputProps("parkings")}
        />

        <Group position="center" mt="xl">
          <Button variant="default" onClick={prevStep}>
            Geri
          </Button>
          <Button type="submit" color="green" disabled={isLoading}>
            {isLoading ? "Ekleniyor..." : "Mülk Ekle"}
          </Button>
        </Group>
      </form>
    </Box>
  );
};

Facilities.propTypes = {
  prevStep: PropTypes.func.isRequired,
  propertyDetails: PropTypes.object.isRequired,
  setPropertyDetails: PropTypes.func.isRequired,
  setOpened: PropTypes.func.isRequired,
  setActiveStep: PropTypes.func.isRequired,
  onSuccess: PropTypes.func,
  isPageMode: PropTypes.bool,
};

export default Facilities;

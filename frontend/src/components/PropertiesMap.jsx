import { useEffect, useState, useMemo, useContext } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import * as ELG from "esri-leaflet-geocoder";
import PropTypes from "prop-types";
import CurrencyContext from "../context/CurrencyContext";

// Custom green marker icon
const createCustomIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: #16a34a;
      width: 28px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    ">
      <svg style="transform: rotate(45deg); width: 14px; height: 14px; fill: white;" viewBox="0 0 24 24">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
      </svg>
    </div>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  });
};

// Component to fit map bounds to all markers
const FitBounds = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [positions, map]);

  return null;
};

FitBounds.propTypes = {
  positions: PropTypes.array.isRequired,
};

// Keep Leaflet sized correctly when container visibility or size changes
const MapAutoResize = ({ watch }) => {
  const map = useMap();

  useEffect(() => {
    let frameId;
    const handleResize = () => {
      if (frameId) cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(() => {
        map.invalidateSize();
      });
    };

    handleResize();

    const container = map.getContainer();
    let observer;
    if (container && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(container);
    } else {
      const timerId = setTimeout(handleResize, 200);
      return () => clearTimeout(timerId);
    }

    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("orientationchange", handleResize);
      if (observer) observer.disconnect();
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [map]);

  useEffect(() => {
    if (watch !== undefined) {
      map.invalidateSize();
    }
  }, [map, watch]);

  return null;
};

MapAutoResize.propTypes = {
  watch: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
};

// Single property marker with geocoding
const PropertyMarker = ({ property, onPropertyClick }) => {
  const [position, setPosition] = useState(null);
  const customIcon = useMemo(() => createCustomIcon(), []);
  const { selectedCurrency, baseCurrency, rates, convertAmount, formatMoney } =
    useContext(CurrencyContext);
  const displayCurrency =
    selectedCurrency && (selectedCurrency === baseCurrency || rates?.[selectedCurrency])
      ? selectedCurrency
      : baseCurrency;
  const convertedPrice = convertAmount(
    property.price,
    property.currency || baseCurrency,
    displayCurrency
  );
  const formattedPrice = formatMoney(convertedPrice, displayCurrency, "tr-TR");

  useEffect(() => {
    const address = `${property.address} ${property.city} ${property.country}`;
    ELG.geocode()
      .text(address)
      .run((err, results) => {
        if (results?.results?.length > 0) {
          const { lat, lng } = results.results[0].latlng;
          setPosition([lat, lng]);
        }
      });
  }, [property]);

  if (!position) return null;

  return (
    <Marker
      position={position}
      icon={customIcon}
      eventHandlers={{
        click: () => onPropertyClick(property.id),
      }}
    >
      <Popup>
        <div className="w-48">
          <img
            src={property.image}
            alt={property.title}
            loading="lazy"
            decoding="async"
            className="w-full h-24 object-cover rounded mb-2"
          />
          <h4 className="font-semibold text-sm truncate">{property.title}</h4>
          <p className="text-xs text-gray-500">
            {property.city}, {property.country}
          </p>
          <p className="text-sm font-bold text-green-600 mt-1">
            {formattedPrice}
          </p>
        </div>
      </Popup>
    </Marker>
  );
};

PropertyMarker.propTypes = {
  property: PropTypes.object.isRequired,
  onPropertyClick: PropTypes.func.isRequired,
};

const PropertiesMap = ({ properties, onPropertyClick, resizeKey }) => {
  const [positions, setPositions] = useState([]);

  // Geocode all properties to get their positions for bounds
  useEffect(() => {
    const geocodePromises = properties.map((property) => {
      return new Promise((resolve) => {
        const address = `${property.address} ${property.city} ${property.country}`;
        ELG.geocode()
          .text(address)
          .run((err, results) => {
            if (results?.results?.length > 0) {
              const { lat, lng } = results.results[0].latlng;
              resolve([lat, lng]);
            } else {
              resolve(null);
            }
          });
      });
    });

    Promise.all(geocodePromises).then((results) => {
      const validPositions = results.filter((pos) => pos !== null);
      setPositions(validPositions);
    });
  }, [properties]);

  return (
    <MapContainer
      center={[39.9334, 32.8597]} // Default to Turkey
      zoom={6}
      scrollWheelZoom={true}
      className="h-full w-full z-0"
    >
      <MapAutoResize watch={resizeKey} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {positions.length > 0 && <FitBounds positions={positions} />}
      {properties.map((property) => (
        <PropertyMarker
          key={property.id}
          property={property}
          onPropertyClick={onPropertyClick}
        />
      ))}
    </MapContainer>
  );
};

PropertiesMap.propTypes = {
  properties: PropTypes.array.isRequired,
  onPropertyClick: PropTypes.func.isRequired,
  resizeKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.bool]),
};

export default PropertiesMap;

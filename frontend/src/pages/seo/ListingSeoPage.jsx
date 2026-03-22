import { useSearchParams } from "react-router-dom";
import Listing from "../Listing";
import SEO from "../../components/SEO";

const ListingSeoPage = () => {
  const [searchParams] = useSearchParams();
  const searchTerm = String(searchParams.get("search") || "").trim();
  const city = String(searchParams.get("city") || "").trim();

  const locationHint = searchTerm || city;
  const title = locationHint
    ? `${locationHint} Property Listings | demo`
    : "Turkey Property Listings | demo";

  const description = locationHint
    ? `Browse verified apartments, villas, and investment opportunities in ${locationHint}. Compare prices, features, and locations with demo.`
    : "Browse verified apartments, villas, and investment opportunities across Turkey. Compare prices, features, and locations with demo.";

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical="https://www.hbrealstate.com/listing"
      />
      <Listing />
    </>
  );
};

export default ListingSeoPage;

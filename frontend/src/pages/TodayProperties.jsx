import useProperties from "../hooks/useProperties";
import { PuffLoader } from "react-spinners";
import Item from "../components/Item";
import { FaCalendarDay, FaListCheck } from "react-icons/fa6";
import { Link } from "react-router-dom";

// Helper to check if date is today
const isToday = (dateString) => {
  if (!dateString) return false;
  const date = new Date(dateString);
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

// Format today's date
const formatTodayDate = () => {
  const today = new Date();
  return today.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const TodayProperties = () => {
  const { data, isError, isLoading } = useProperties();

  if (isError) {
    return (
      <div className="max-padd-container my-[99px]">
        <div className="bg-red-50 text-red-500 p-8 rounded-2xl text-center">
          <span>Error while fetching data</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-64 flexCenter">
        <PuffLoader
          height="80"
          width="80"
          radius={1}
          color="#555"
          aria-label="puff-loading"
        />
      </div>
    );
  }

  // Filter properties listed today
  const todayProperties = data?.filter((property) => isToday(property.createdAt)) || [];

  return (
    <main className="max-padd-container my-[99px] overflow-x-hidden">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="medium-18">Fresh Listings</span>
        <h1 className="h2">Today's Price List</h1>
        <div className="flex items-center justify-center gap-2 text-gray-30">
          <FaCalendarDay className="text-secondary" />
          <span>{formatTodayDate()}</span>
        </div>
      </div>

      {/* Content */}
      <div className="bg-primary rounded-3xl p-6 sm:p-10 lg:p-14">
        {todayProperties.length > 0 ? (
          <>
            {/* Count Badge */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-full">
                <FaListCheck />
                <span className="font-semibold">{todayProperties.length} New Properties Today</span>
              </div>
            </div>

            {/* Properties Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {todayProperties.map((property, i) => (
                <Item key={i} property={property} />
              ))}
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-secondary/10 rounded-full flexCenter mx-auto mb-6">
              <FaCalendarDay className="text-secondary text-4xl" />
            </div>
            <h3 className="bold-24 text-tertiary mb-3">No New Properties Today</h3>
            <p className="text-gray-30 max-w-md mx-auto mb-8">
              There are no properties listed today yet. Check back later or browse all available properties.
            </p>
            <Link
              to="/listing"
              className="btn-secondary rounded-xl inline-flex items-center gap-2"
            >
              View All Properties
            </Link>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-10 bg-tertiary rounded-3xl p-8 sm:p-12">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="bold-24 text-white mb-2">Looking for More Options?</h3>
            <p className="text-white/60">
              Browse our complete collection of properties with updated prices.
            </p>
          </div>
          <Link
            to="/listing"
            className="btn-secondary !bg-secondary !ring-secondary whitespace-nowrap"
          >
            View All Properties
          </Link>
        </div>
      </div>
    </main>
  );
};

export default TodayProperties;

import { Button, Group } from "@mantine/core";
import { useState } from "react";
import { MdOutlineCloudUpload, MdPlayCircleOutline, MdVideocam } from "react-icons/md";
import { AiOutlineClose } from "react-icons/ai";
import PropTypes from "prop-types";
import { toast } from "react-toastify";
import { pickAndUploadImages, pickAndUploadVideos } from "../utils/blobUpload";
import UploadProgressBar from "./UploadProgressBar";

const UploadImage = ({
  prevStep,
  nextStep,
  propertyDetails,
  setPropertyDetails,
}) => {
  const [imageURLs, setImageURLs] = useState(
    propertyDetails.images ||
      (propertyDetails.image ? [propertyDetails.image] : [])
  );
  const [videoURLs, setVideoURLs] = useState(propertyDetails.videos || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);

  const handleNext = () => {
    setPropertyDetails((prev) => ({
      ...prev,
      images: imageURLs,
      image: imageURLs[0] || "",
      videos: videoURLs,
    }));
    nextStep();
  };

  const removeImage = (indexToRemove) => {
    setImageURLs((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const removeVideo = (indexToRemove) => {
    setVideoURLs((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleImageUpload = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadImages({
        multiple: true,
        onProgress: setUploadProgress,
      });
      if (urls.length) setImageURLs((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error("Image upload error:", err);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleVideoUpload = async () => {
    try {
      setUploading(true);
      setUploadProgress(0);
      const urls = await pickAndUploadVideos({
        multiple: true,
        onProgress: setUploadProgress,
      });
      if (urls.length) {
        setVideoURLs((prev) => [...prev, ...urls]);
      }
    } catch (err) {
      console.error("Video upload error:", err);
      toast.error("Video yüklenirken hata oluştu / خطا در آپلود ویدیو", {
        position: "bottom-right",
      });
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="mt-8 flex-col flexCenter">
      {/* Combined Gallery Section - Images & Videos */}
      <div className="w-3/4 mb-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <MdOutlineCloudUpload size={24} />
          تصاویر و ویدیوها / Görseller ve Videolar
          {(imageURLs.length > 0 || videoURLs.length > 0) && (
            <span className="text-sm font-normal text-gray-500">
              ({imageURLs.length} resim{videoURLs.length > 0 ? `, ${videoURLs.length} video` : ''})
            </span>
          )}
        </h3>
        
        {imageURLs.length === 0 && videoURLs.length === 0 ? (
          <div className="flex gap-4">
            <div
              onClick={handleImageUpload}
              className="flex-1 flexCenter flex-col h-[180px] border-dashed border-2 cursor-pointer rounded-xl hover:bg-gray-50 transition-colors"
            >
              <MdOutlineCloudUpload size={44} color="grey" />
              <span className="text-gray-600 mt-2">Upload Images (max 30)</span>
              <span className="text-gray-400 text-sm">آپلود تصاویر</span>
            </div>
            <div
              onClick={handleVideoUpload}
              className="flex-1 flexCenter flex-col h-[180px] border-dashed border-2 border-purple-300 cursor-pointer rounded-xl hover:bg-purple-50 transition-colors"
            >
              <MdVideocam size={44} color="#9333ea" />
              <span className="text-purple-600 mt-2">Upload Videos (max 10)</span>
              <span className="text-purple-400 text-sm">آپلود ویدیو</span>
            </div>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
            }}
          >
            {/* Videos First */}
            {videoURLs.map((url, index) => (
              <div
                key={`video-${index}`}
                className="relative rounded-xl overflow-hidden group bg-gradient-to-br from-purple-900 to-gray-900"
                style={{ height: 150, minWidth: 150 }}
              >
                <video
                  src={`${url}#t=0.1`}
                  className="absolute inset-0 w-full h-full object-cover"
                  muted
                  preload="auto"
                  playsInline
                  onLoadedData={(e) => {
                    e.target.style.opacity = "1";
                  }}
                  onMouseEnter={(e) => { try { e.target.play(); } catch {} }}
                  onMouseLeave={(e) => { try { e.target.pause(); e.target.currentTime = 0.1; } catch {} }}
                  style={{ opacity: 0, transition: "opacity 0.3s" }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <MdPlayCircleOutline size={44} color="white" className="opacity-90 drop-shadow-lg" />
                  <span className="text-white text-xs mt-1 opacity-80">Video {index + 1}</span>
                </div>
                <button
                  onClick={() => removeVideo(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  style={{ lineHeight: 0 }}
                >
                  <AiOutlineClose size={16} />
                </button>
                <span className="absolute bottom-2 left-2 bg-purple-600 text-white text-xs px-2 py-1 rounded">
                  Video {index + 1}
                </span>
              </div>
            ))}
            
            {/* Images */}
            {imageURLs.map((url, index) => (
              <div
                key={`image-${index}`}
                className="relative h-[150px] rounded-xl overflow-hidden group"
              >
                <img
                  src={url}
                  alt={`property-${index + 1}`}
                  className="h-full w-full object-cover"
                />
                <button
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ lineHeight: 0 }}
                >
                  <AiOutlineClose size={16} />
                </button>
                {index === 0 && videoURLs.length === 0 && (
                  <span className="absolute bottom-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Ana
                  </span>
                )}
              </div>
            ))}
            
            {/* Add Image Button */}
            <div
              onClick={handleImageUpload}
              className="flexCenter flex-col h-[150px] border-dashed border-2 rounded-xl cursor-pointer hover:bg-gray-50"
            >
              <MdOutlineCloudUpload size={32} color="grey" />
              <span className="text-sm text-gray-500">Resim Ekle</span>
            </div>
            
            {/* Add Video Button */}
            <div
              onClick={handleVideoUpload}
              className="flexCenter flex-col h-[150px] border-dashed border-2 border-purple-300 rounded-xl cursor-pointer hover:bg-purple-50"
            >
              <MdVideocam size={32} color="#9333ea" />
              <span className="text-sm text-purple-500">Video Ekle</span>
            </div>
          </div>
        )}

        {uploading && <UploadProgressBar progress={uploadProgress} />}
      </div>

      <Group justify="center" mt="xl">
        <Button variant="default" onClick={prevStep}>
          Back
        </Button>
        <Button
          onClick={handleNext}
          disabled={imageURLs.length === 0 && videoURLs.length === 0}
        >
          Next
        </Button>
      </Group>
    </div>
  );
};

UploadImage.propTypes = {
  prevStep: PropTypes.func.isRequired,
  nextStep: PropTypes.func.isRequired,
  propertyDetails: PropTypes.shape({
    images: PropTypes.arrayOf(PropTypes.string),
    image: PropTypes.string,
    videos: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  setPropertyDetails: PropTypes.func.isRequired,
};

export default UploadImage;

import { useState, useEffect, useRef } from "react";
import { fetchYouTubeVideos } from "./api/YouTubeApi";
import {
  FiPlay,
  FiPause,
  FiX,
  FiHeart,
  FiClock,
  FiList,
  FiVolume2,
  FiVolumeX,
  FiMaximize,
  FiShare2,
  FiDownload,
  FiBookmark,
} from "react-icons/fi";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  date: string;
  qualities?: string[];
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode | null;
}

const getLocalStorage = (
  key: string,
  defaultValue: string[] = []
): string[] => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return defaultValue;
  }
};

const App = () => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideo, setCurrentVideo] = useState<Video | null>(null);
  const [searchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(() =>
    getLocalStorage("favorites")
  );
  const [history, setHistory] = useState<string[]>(() =>
    getLocalStorage("history")
  );
  const [playlist, setPlaylist] = useState<string[]>(() =>
    getLocalStorage("playlist")
  );
  const [watchLater, setWatchLater] = useState<string[]>(() =>
    getLocalStorage("watchLater")
  );
  const [activeTab, setActiveTab] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [isFullscreen, setIsFullscreen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLIFrameElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Load video data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchYouTubeVideos();
        if (data?.videos && Array.isArray(data.videos)) {
          const validatedVideos = data.videos.map((video: any) => ({
            id: video.id || "",
            title: video.title || "",
            description: video.description || "",
            thumbnail: video.thumbnail || "",
            duration: video.duration || "",
            views: (video.viewCount || "") as string,
            date: video.publishedAt || "",
            qualities: video.qualities || ["360p", "480p", "720p", "1080p"],
          }));
          setVideos(validatedVideos);
        }
      } catch (error) {
        console.error("Failed to load videos:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Save data to localStorage
  useEffect(() => {
    const saveData = () => {
      try {
        localStorage.setItem("favorites", JSON.stringify(favorites));
        localStorage.setItem("history", JSON.stringify(history));
        localStorage.setItem("playlist", JSON.stringify(playlist));
        localStorage.setItem("watchLater", JSON.stringify(watchLater));
        localStorage.setItem("activeTab", activeTab);
      } catch (error) {
        console.error("Error saving to localStorage:", error);
      }
    };

    const timer = setTimeout(saveData, 300);
    return () => clearTimeout(timer);
  }, [favorites, history, playlist, watchLater, activeTab]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setCurrentVideo(null);
        setIsFullscreen(false);
      }
      if (e.ctrlKey && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (currentVideo) {
        switch (e.key) {
          case " ":
            e.preventDefault();
            setIsPlaying((prev) => !prev);
            break;
          case "ArrowRight":
            seekVideo(5);
            break;
          case "ArrowLeft":
            seekVideo(-5);
            break;
          case "ArrowUp":
            adjustVolume(10);
            break;
          case "ArrowDown":
            adjustVolume(-10);
            break;
          case "m":
            setIsMuted((prev) => !prev);
            break;
          case "f":
            toggleFullscreen();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentVideo]);

  // Fullscreen change handler
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const filteredVideos = videos.filter((video: Video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase());

    switch (activeTab) {
      case "favorites":
        return matchesSearch && favorites.includes(video.id);
      case "history":
        return matchesSearch && history.includes(video.id);
      case "playlist":
        return matchesSearch && playlist.includes(video.id);
      case "watchLater":
        return matchesSearch && watchLater.includes(video.id);
      default:
        return matchesSearch;
    }
  });

  const playVideo = (video: Video) => {
    setCurrentVideo(video);
    setIsPlaying(true);
    if (!history.includes(video.id)) {
      setHistory((prev) => [...prev, video.id]);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleFavorite = (videoId: string) => {
    setFavorites((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const togglePlaylist = (videoId: string) => {
    setPlaylist((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const toggleWatchLater = (videoId: string) => {
    setWatchLater((prev) =>
      prev.includes(videoId)
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  };

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear all your data?")) {
      setFavorites([]);
      setHistory([]);
      setPlaylist([]);
      setWatchLater([]);
      setActiveTab("all");
    }
  };

  const handleVideoEnd = () => {
    if (!currentVideo) return;

    const currentIndex = playlist.findIndex((id) => id === currentVideo.id);
    const nextIndex = currentIndex + 1;

    if (nextIndex < playlist.length) {
      const nextVideoId = playlist[nextIndex];
      const nextVideo = videos.find((video) => video.id === nextVideoId);
      if (nextVideo) {
        playVideo(nextVideo);
      } else {
        setCurrentVideo(null);
      }
    } else {
      setCurrentVideo(null);
    }
  };

  const seekVideo = (seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(currentTime + seconds, duration));
    setCurrentTime(newTime);

    // This would normally be done through the YouTube Player API
    console.log(`Seeking to ${newTime} seconds`);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const newTime = percent * duration;
    seekVideo(newTime - currentTime);
  };

  const adjustVolume = (change: number) => {
    const newVolume = Math.max(0, Math.min(volume + change, 100));
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleFullscreen = () => {
    if (!modalRef.current) return;

    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const shareVideo = () => {
    if (!currentVideo) return;

    const shareData = {
      title: currentVideo.title,
      text: `Check out this video: ${currentVideo.title}`,
      url: `https://youtube.com/watch?v=${currentVideo.id}`,
    };

    if (navigator.share) {
      navigator.share(shareData).catch((err) => {
        console.error("Error sharing:", err);
      });
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard
        .writeText(shareData.url)
        .then(() => {
          alert("Link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Could not copy text: ", err);
        });
    }
  };

  const downloadVideo = (quality: string) => {
    if (!currentVideo) return;
    alert(
      `Preparing download of ${currentVideo.title} in ${quality} quality...`
    );
    // In a real app, this would trigger the download process
  };

  const tabs: Tab[] = [
    { id: "all", label: "All Videos", icon: null },
    { id: "favorites", label: "Favorites", icon: <FiHeart /> },
    { id: "history", label: "History", icon: <FiClock /> },
    { id: "playlist", label: "Playlist", icon: <FiList /> },
    { id: "watchLater", label: "Watch Later", icon: <FiBookmark /> },
  ];

  return (
    <div className="p-5 mx-auto min-h-screen bg-gray-100 max-w-7xl">
      {/* Header */}
      <header className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-gray-800">AwashTube</h1>
        <div className="relative flex-1 min-w-[250px] max-w-[500px]">
          <input
            ref={searchRef}
            type="text"
            placeholder="Search videos..."
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-full focus:outline-none focus:border-blue-500 focus:ring focus:ring-blue-200 transition"
          />
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex items-center gap-2 px-4 py-2 rounded-full border transition duration-200 ${
              activeTab === tab.id
                ? "bg-blue-500 text-white border-blue-500"
                : "bg-white border-gray-300 hover:bg-gray-100"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        {(favorites.length > 0 ||
          history.length > 0 ||
          playlist.length > 0 ||
          watchLater.length > 0) && (
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 border border-red-300 text-red-600 hover:bg-red-200 transition duration-200"
            onClick={clearAllData}
            title="Clear all data"
          >
            <FiX /> Clear Data
          </button>
        )}
      </nav>

      {/* Stats Bar */}
      {(favorites.length > 0 ||
        history.length > 0 ||
        playlist.length > 0 ||
        watchLater.length > 0) && (
        <div className="flex gap-6 mb-4 p-4 bg-white rounded-md text-gray-500 text-sm">
          {favorites.length > 0 && <span>Favorites: {favorites.length}</span>}
          {history.length > 0 && <span>History: {history.length}</span>}
          {playlist.length > 0 && <span>Playlist: {playlist.length}</span>}
          {watchLater.length > 0 && (
            <span>Watch Later: {watchLater.length}</span>
          )}
        </div>
      )}

      {/* Video Grid */}
      <main className="mt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filteredVideos.map((video) => (
            <div
              key={video.id}
              className="bg-white rounded-lg shadow hover:shadow-lg transition duration-200 cursor-pointer flex flex-col"
              onClick={() => playVideo(video)}
            >
              <img
                src={video.thumbnail}
                alt={video.title}
                className="rounded-t-lg w-full h-48 object-cover"
              />
              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-lg mb-2">{video.title}</h3>
                <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                  {video.description}
                </p>
                <div className="flex justify-between text-xs text-gray-500 mt-auto">
                  <span>{video.duration}</span>
                  <span>{video.views} views</span>
                  <span>{video.date}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredVideos.length === 0 && !loading && (
          <div className="text-center text-gray-500 mt-8">No videos found.</div>
        )}
        {loading && (
          <div className="text-center text-gray-500 mt-8">
            Loading videos...
          </div>
        )}
      </main>

      {/* Enhanced Video Player Modal */}
      {currentVideo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
          ref={modalRef}
        >
          <div
            className={`w-full ${
              isFullscreen ? "h-full" : "max-w-4xl"
            } bg-transparent relative`}
          >
            <button
              className="absolute top-4 right-4 text-white text-2xl z-50"
              onClick={() => {
                setCurrentVideo(null);
                if (isFullscreen) document.exitFullscreen();
              }}
            >
              <FiX />
            </button>

            {/* Video player with controls */}
            <div className="relative pt-[56.25%] bg-black">
              <iframe
                ref={videoRef}
                src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&modestbranding=1&rel=0`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentVideo.title}
                className="absolute top-0 left-0 w-full h-full"
                onEnded={handleVideoEnd}
              ></iframe>

              {/* Custom controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                {/* Progress bar */}
                <div
                  className="h-1 bg-gray-600 w-full mb-2 cursor-pointer"
                  ref={progressRef}
                  onClick={handleProgressClick}
                >
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  ></div>
                </div>

                {/* Control buttons */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <FiPause size={20} /> : <FiPlay size={20} />}
                    </button>

                    {/* Volume control */}
                    <div className="flex items-center gap-2">
                      <button onClick={() => setIsMuted(!isMuted)}>
                        {isMuted ? (
                          <FiVolumeX size={20} />
                        ) : (
                          <FiVolume2 size={20} />
                        )}
                      </button>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={isMuted ? 0 : volume}
                        onChange={(e) => {
                          const newVolume = parseInt(e.target.value);
                          setVolume(newVolume);
                          setIsMuted(newVolume === 0);
                        }}
                        className="w-20"
                      />
                    </div>

                    {/* Time display */}
                    <span className="text-sm">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Playback speed */}
                    <select
                      value={playbackRate}
                      onChange={(e) =>
                        setPlaybackRate(parseFloat(e.target.value))
                      }
                      className="bg-black bg-opacity-50 text-white border-none rounded text-sm"
                    >
                      {[0.5, 0.75, 1, 1.25, 1.5, 2].map((speed) => (
                        <option key={speed} value={speed}>
                          {speed}x
                        </option>
                      ))}
                    </select>

                    {/* Quality selector */}
                    {currentVideo.qualities && (
                      <select
                        value={selectedQuality}
                        onChange={(e) => setSelectedQuality(e.target.value)}
                        className="bg-black bg-opacity-50 text-white border-none rounded text-sm"
                      >
                        <option value="auto">Auto</option>
                        {currentVideo.qualities.map((quality) => (
                          <option key={quality} value={quality}>
                            {quality}
                          </option>
                        ))}
                      </select>
                    )}

                    <button onClick={toggleFullscreen}>
                      <FiMaximize size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Video details and actions */}
            <div className="bg-gray-800 text-white p-6 rounded-b-lg">
              <h2 className="text-xl mb-4">{currentVideo.title}</h2>

              {/* Action buttons */}
              <div className="flex gap-4 mb-4 flex-wrap">
                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded transition duration-200 ${
                    favorites.includes(currentVideo.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                  onClick={() => toggleFavorite(currentVideo.id)}
                >
                  <FiHeart />
                  {favorites.includes(currentVideo.id)
                    ? "Favorited"
                    : "Favorite"}
                </button>

                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded transition duration-200 ${
                    playlist.includes(currentVideo.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                  onClick={() => togglePlaylist(currentVideo.id)}
                >
                  <FiList />
                  {playlist.includes(currentVideo.id)
                    ? "In Playlist"
                    : "Add to Playlist"}
                </button>

                <button
                  className={`flex items-center gap-2 px-4 py-2 rounded transition duration-200 ${
                    watchLater.includes(currentVideo.id)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-700 text-white hover:bg-gray-600"
                  }`}
                  onClick={() => toggleWatchLater(currentVideo.id)}
                >
                  <FiBookmark />
                  {watchLater.includes(currentVideo.id)
                    ? "Saved to Watch Later"
                    : "Watch Later"}
                </button>

                <button
                  className="flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition duration-200"
                  onClick={shareVideo}
                >
                  <FiShare2 />
                  Share
                </button>

                {/* Download dropdown */}
                <div className="relative group">
                  <button className="flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition duration-200">
                    <FiDownload />
                    Download
                  </button>
                  <div className="absolute right-0 mt-1 w-40 bg-gray-800 rounded shadow-lg hidden group-hover:block z-10">
                    {currentVideo.qualities?.map((quality) => (
                      <button
                        key={quality}
                        className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-700"
                        onClick={() => downloadVideo(quality)}
                      >
                        Download {quality}
                      </button>
                    ))}
                  </div>
                </div>

                {playlist.includes(currentVideo.id) && (
                  <button
                    className="flex items-center gap-2 px-4 py-2 rounded bg-gray-700 text-white hover:bg-gray-600 transition duration-200"
                    onClick={handleVideoEnd}
                  >
                    <FiPlay /> Play Next
                  </button>
                )}
              </div>

              <p className="text-sm">{currentVideo.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to format time (seconds to MM:SS)
const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

export default App;

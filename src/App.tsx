import { useState, useEffect, useRef } from 'react';
import { fetchYouTubeVideos } from './api/YouTubeApi';
import {
  FiPlay, FiX, FiSearch, FiHeart, FiClock, FiList, FiPlus
} from 'react-icons/fi';

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  views: string;
  date: string;
}

interface Tab {
  id: string;
  label: string;
  icon: React.ReactNode | null;
}

const getLocalStorage = (key: string, defaultValue: string[] = []): string[] => {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>(() => getLocalStorage('favorites'));
  const [history, setHistory] = useState<string[]>(() => getLocalStorage('history'));
  const [playlist, setPlaylist] = useState<string[]>(() => getLocalStorage('playlist'));
  const [activeTab, setActiveTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const data = await fetchYouTubeVideos();
        if (data?.videos && Array.isArray(data.videos)) {
          const validatedVideos = data.videos.map(video => ({
            id: video.id || '',
            title: video.title || '',
            description: video.description || '',
            thumbnail: video.thumbnail || '',
            duration: video.duration || '',
            views: video.views || '',
            date: video.date || ''
          }));
          setVideos(validatedVideos);
        }
      } catch (error) {
        console.error('Failed to load videos:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const saveData = () => {
      try {
        localStorage.setItem('favorites', JSON.stringify(favorites));
        localStorage.setItem('history', JSON.stringify(history));
        localStorage.setItem('playlist', JSON.stringify(playlist));
        localStorage.setItem('activeTab', activeTab);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
      }
    };

    const timer = setTimeout(saveData, 300);
    return () => clearTimeout(timer);
  }, [favorites, history, playlist, activeTab]);

  const filteredVideos = videos.filter((video: Video) => {
    const matchesSearch = video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase());

    switch (activeTab) {
      case 'favorites':
        return matchesSearch && favorites.includes(video.id);
      case 'history':
        return matchesSearch && history.includes(video.id);
      case 'playlist':
        return matchesSearch && playlist.includes(video.id);
      default:
        return matchesSearch;
    }
  });

  const playVideo = (video: Video) => {
    setCurrentVideo(video);
    if (!history.includes(video.id)) {
      setHistory(prev => [...prev, video.id]);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleFavorite = (videoId: string) => {
    setFavorites(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const togglePlaylist = (videoId: string) => {
    setPlaylist(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all your data?')) {
      setFavorites([]);
      setHistory([]);
      setPlaylist([]);
      setActiveTab('all');
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCurrentVideo(null);
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const tabs: Tab[] = [
    { id: 'all', label: 'All Videos', icon: null },
    { id: 'favorites', label: 'Favorites', icon: <FiHeart /> },
    { id: 'history', label: 'History', icon: <FiClock /> },
    { id: 'playlist', label: 'Playlist', icon: <FiList /> }
  ];

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <h1>AwashTube</h1>
          <span className="beta-badge">BETA</span>
        </div>

        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <FiX />
            </button>
          )}
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
        <button
          className="tab danger"
          onClick={clearAllData}
          title="Clear all data"
        >
          <FiX /> Clear Data
        </button>
      </nav>

      <div className="stats-bar">
        <span>Favorites: {favorites.length}</span>
        <span>History: {history.length}</span>
        <span>Playlist: {playlist.length}</span>
      </div>

      <main className="content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading videos...</p>
          </div>
        ) : filteredVideos.length === 0 ? (
          <div className="empty-state">
            <p>No videos found {searchQuery && `for "${searchQuery}"`}</p>
          </div>
        ) : (
          <div className="video-grid">
            {filteredVideos.map(video => (
              <div
                key={video.id}
                className="video-card"
                onClick={() => playVideo(video)}
              >
                <div className="thumbnail-container">
                  <img src={video.thumbnail} alt={video.title} className="thumbnail" />
                  <div className="duration-badge">{video.duration}</div>
                  <div className="hover-overlay">
                    <FiPlay className="play-icon" />
                  </div>
                </div>
                <div className="video-info">
                  <h3 className="video-title">{video.title}</h3>
                  <p className="video-description">
                    {video.description.substring(0, 80)}...
                  </p>
                  <div className="video-meta">
                    <span>{video.views} views</span>
                    <span>{video.date}</span>
                  </div>
                </div>
                <div className="video-actions">
                  <button
                    className={`action-btn ${favorites.includes(video.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(video.id);
                    }}
                    title={favorites.includes(video.id) ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <FiHeart />
                  </button>
                  <button
                    className={`action-btn ${playlist.includes(video.id) ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePlaylist(video.id);
                    }}
                    title={playlist.includes(video.id) ? 'Remove from playlist' : 'Add to playlist'}
                  >
                    <FiPlus />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {currentVideo && (
        <div className="video-modal">
          <div className="modal-content">
            <button className="close-modal" onClick={() => setCurrentVideo(null)}>
              <FiX />
            </button>
            <div className="player-container">
              <iframe
                src={`https://www.youtube.com/embed/${currentVideo.id}?autoplay=1&modestbranding=1&rel=0`}
                width="100%"
                height="100%"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={currentVideo.title}
              ></iframe>
            </div>
            <div className="video-details">
              <h2>{currentVideo.title}</h2>
              <div className="detail-actions">
                <button
                  className={`detail-btn ${favorites.includes(currentVideo.id) ? 'active' : ''}`}
                  onClick={() => toggleFavorite(currentVideo.id)}
                >
                  <FiHeart />
                  {favorites.includes(currentVideo.id) ? 'Favorited' : 'Favorite'}
                </button>
                <button
                  className={`detail-btn ${playlist.includes(currentVideo.id) ? 'active' : ''}`}
                  onClick={() => togglePlaylist(currentVideo.id)}
                >
                  <FiList />
                  {playlist.includes(currentVideo.id) ? 'In Playlist' : 'Add to Playlist'}
                </button>
                {playlist.includes(currentVideo.id) && (
                  <button
                    className="detail-btn"
                    onClick={() => {
                      const nextIndex = playlist.findIndex(id => id === currentVideo.id) + 1;
                      if (nextIndex < playlist.length) {
                        const nextVideo = videos.find(v => v.id === playlist[nextIndex]);
                        if (nextVideo) setCurrentVideo(nextVideo);
                      }
                    }}
                  >
                    <FiPlay /> Play Next
                  </button>
                )}
              </div>
              <p className="video-description">{currentVideo.description}</p>
            </div>
          </div>
        </div>
      )}

      <style global jsx>{`
        :root {
          --primary: #4285f4;
          --danger: #ff4444;
          --dark: #222;
          --light: #f8f9fa;
          --gray: #6c757d;
          --border: #dee2e6;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          background-color: #f5f5f5;
        }
        .app-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        .app-header {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          gap: 1rem;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .brand h1 {
          font-size: 1.8rem;
          font-weight: 700;
          color: var(--dark);
        }
        .beta-badge {
          background: var(--primary);
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 1rem;
          font-size: 0.7rem;
          font-weight: bold;
        }
        .search-bar {
          position: relative;
          flex: 1;
          min-width: 250px;
          max-width: 500px;
        }
        .search-bar input {
          width: 100%;
          padding: 0.7rem 1rem 0.7rem 2.5rem;
          border: 1px solid var(--border);
          border-radius: 2rem;
          font-size: 1rem;
          transition: all 0.3s;
        }
        .search-bar input:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.2);
        }
        .search-icon {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          color: var(--gray);
        }
        .clear-search {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: var(--gray);
          cursor: pointer;
          padding: 0.2rem;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1rem;
          overflow-x: auto;
          padding-bottom: 0.5rem;
        }
        .tab {
          padding: 0.7rem 1.2rem;
          background: white;
          border: 1px solid var(--border);
          border-radius: 2rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.9rem;
          white-space: nowrap;
          transition: all 0.2s;
        }
        .tab:hover {
          background: #f0f0f0;
        }
        .tab.active {
          background: var(--primary);
          color: white;
          border-color: var(--primary);
        }
        .tab.danger {
          background: #fff0f0;
          border-color: #ffcccc;
          color: var(--danger);
        }
        .tab.danger:hover {
          background: #ffe0e0;
        }
        .stats-bar {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 1rem;
          padding: 0.5rem 1rem;
          background: white;
          border-radius: 0.5rem;
          font-size: 0.85rem;
          color: var(--gray);
        }
        .content {
          margin-top: 1rem;
        }
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }
        .spinner {
          width: 3rem;
          height: 3rem;
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: var(--primary);
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        .empty-state {
          text-align: center;
          padding: 3rem;
          color: var(--gray);
        }
        .video-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
        }
        .video-card {
          background: white;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s, box-shadow 0.2s;
          position: relative;
          cursor: pointer;
        }
        .video-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
        }
        .thumbnail-container {
          position: relative;
          padding-top: 56.25%;
          overflow: hidden;
        }
        .thumbnail {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .duration-badge {
          position: absolute;
          bottom: 0.5rem;
          right: 0.5rem;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 0.2rem 0.5rem;
          border-radius: 0.25rem;
          font-size: 0.8rem;
        }
        .hover-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s;
        }
        .video-card:hover .hover-overlay {
          opacity: 1;
        }
        .play-icon {
          color: white;
          font-size: 2rem;
          background: rgba(0, 0, 0, 0.7);
          border-radius: 50%;
          padding: 1rem;
        }
        .video-info {
          padding: 1rem;
        }
        .video-title {
          font-size: 1rem;
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .video-description {
          font-size: 0.85rem;
          color: var(--gray);
          margin-bottom: 0.5rem;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .video-meta {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: var(--gray);
        }
        .video-actions {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          display: flex;
          gap: 0.5rem;
        }
        .action-btn {
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.5);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .action-btn:hover {
          transform: scale(1.1);
        }
        .action-btn.active {
          background: var(--primary);
        }
        .video-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }
        .modal-content {
          width: 100%;
          max-width: 1100px;
          background: transparent;
          position: relative;
        }
        .close-modal {
          position: absolute;
          top: -2.5rem;
          right: 0;
          background: none;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
          padding: 0.5rem;
        }
        .player-container {
          position: relative;
          padding-top: 56.25%;
          background: #000;
        }
        iframe {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          border: none;
        }
        .video-details {
          background: var(--dark);
          color: white;
          padding: 1.5rem;
          border-radius: 0 0 0.5rem 0.5rem;
          margin-top: 0.5rem;
        }
        .video-details h2 {
          margin-bottom: 1rem;
        }
        .detail-actions {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
          flex-wrap: wrap;
        }
        .detail-btn {
          padding: 0.5rem 1rem;
          border-radius: 0.25rem;
          background: #444;
          color: white;
          border: none;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .detail-btn:hover {
          background: #555;
        }
        .detail-btn.active {
          background: var(--primary);
        }
        @media (max-width: 768px) {
          .app-header {
            flex-direction: column;
            align-items: stretch;
          }
          .search-bar {
            max-width: 100%;
          }
          .video-grid {
            grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          }
        }
      `}</style>
    </div>
  );
};

export default App;

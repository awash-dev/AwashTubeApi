// src/api/youtube.ts
const API_KEY = "AIzaSyB9L5WajZ15jmXNUlrv2EfWQ9pU_amIDm4";
const CHANNEL_ID = "UCGSroElDPOtCb8Wwhkae7qw";
const BASE_URL = "https://www.googleapis.com/youtube/v3";

interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  publishedAt: string;
  channelTitle: string;
  duration: string;
  viewCount: string;
  likeCount: string;
}

interface ApiResponse {
  videos: Video[];
  nextPageToken?: string;
  prevPageToken?: string;
  totalResults?: number;
}

const cache = new Map<string, { timestamp: number; data: ApiResponse }>();
const CACHE_DURATION = 1000 * 60 * 5; // 5 minutes

export const fetchYouTubeVideos = async (
  maxResults: number = 10,
  pageToken: string = ""
): Promise<ApiResponse> => {
  const cacheKey = `${CHANNEL_ID}-${maxResults}-${pageToken}`;
  
  // Return cached data if available
  if (cache.has(cacheKey)) {
    const cached = cache.get(cacheKey)!;
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
  }

  try {
    // First fetch the video IDs from the channel
    const searchUrl = `${BASE_URL}/search?key=${API_KEY}&channelId=${CHANNEL_ID}&part=snippet,id&order=date&maxResults=${maxResults}&pageToken=${pageToken}`;
    const searchRes = await fetch(searchUrl);
    
    if (!searchRes.ok) {
      throw new Error(`YouTube API error: ${searchRes.status}`);
    }

    const searchData = await searchRes.json();

    // Extract video IDs
    const videoIds = searchData.items
      .filter((item: any) => item.id.kind === "youtube#video")
      .map((item: any) => item.id.videoId)
      .join(",");

    if (!videoIds) {
      return { videos: [] };
    }

    // Then fetch video details
    const videosUrl = `${BASE_URL}/videos?key=${API_KEY}&id=${videoIds}&part=snippet,contentDetails,statistics`;
    const videosRes = await fetch(videosUrl);
    
    if (!videosRes.ok) {
      throw new Error(`YouTube API error: ${videosRes.status}`);
    }

    const videosData = await videosRes.json();

    // Format the response
    const videos: Video[] = videosData.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default.url,
      publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
      channelTitle: item.snippet.channelTitle,
      duration: formatDuration(item.contentDetails.duration),
      viewCount: formatNumber(item.statistics.viewCount),
      likeCount: formatNumber(item.statistics.likeCount)
    }));

    const response: ApiResponse = {
      videos,
      nextPageToken: searchData.nextPageToken,
      prevPageToken: searchData.prevPageToken,
      totalResults: searchData.pageInfo?.totalResults
    };

    // Cache the response
    cache.set(cacheKey, { timestamp: Date.now(), data: response });

    return response;
  } catch (error) {
    console.error("Failed to fetch YouTube videos:", error);
    throw error;
  }
};

// Helper function to format ISO 8601 duration
const formatDuration = (duration: string): string => {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
  if (!match) return "0:00";

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours > 0 
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    : `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// Helper to format large numbers
const formatNumber = (num: string): string => {
  return parseInt(num).toLocaleString();
};

// Fetch single video details
export const fetchVideoDetails = async (videoId: string): Promise<Video> => {
  try {
    const url = `${BASE_URL}/videos?key=${API_KEY}&id=${videoId}&part=snippet,contentDetails,statistics`;
    const res = await fetch(url);
    
    if (!res.ok) {
      throw new Error(`YouTube API error: ${res.status}`);
    }

    const data = await res.json();
    const item = data.items[0];

    return {
      id: item.id,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.maxres?.url || item.snippet.thumbnails.high?.url,
      publishedAt: new Date(item.snippet.publishedAt).toLocaleDateString(),
      channelTitle: item.snippet.channelTitle,
      duration: formatDuration(item.contentDetails.duration),
      viewCount: formatNumber(item.statistics.viewCount),
      likeCount: formatNumber(item.statistics.likeCount)
    };
  } catch (error) {
    console.error("Failed to fetch video details:", error);
    throw error;
  }
};
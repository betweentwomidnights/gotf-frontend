// utils/urlChecker.js

/**
 * Check if the given URL is a YouTube video URL and not part of a playlist.
 * @param {string} url The URL to check.
 * @returns {boolean} True if the URL is an individual YouTube video, false otherwise.
 */
export const isSupportedURL = (url) => {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    const videoID = urlObj.searchParams.get('v');
    const isPlaylist = urlObj.searchParams.has('list');

    // Check if it's a YouTube URL, has a video ID, and is not part of a playlist
    return hostname.includes('youtube.com') && videoID && !isPlaylist;
  } catch (e) {
    // If URL parsing fails, return false
    return false;
  }
};

export default isSupportedURL;
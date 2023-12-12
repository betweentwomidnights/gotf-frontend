// utils/urlChecker.js

/**
 * Check if the given URL is a YouTube or SoundCloud URL.
 * @param {string} url The URL to check.
 * @returns {boolean} True if the URL is supported, false otherwise.
 */
export const isSupportedURL = (url) => {
  const youtubeVideoRegex = /youtube\.com\/watch\?v=[\w-]+/;
  const soundcloudTrackRegex = /soundcloud\.com\/[\w-]+\/[\w-]+/; // Adjust if there's a more specific pattern

  return youtubeVideoRegex.test(url) || soundcloudTrackRegex.test(url);
};
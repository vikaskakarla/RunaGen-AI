import fetch from 'node-fetch';
import usetube from 'usetube';

export class YouTubeService {
  constructor() {
    // Always operate in non-API mode per user request
    this.apiKey = null;
    this.baseUrl = 'https://www.googleapis.com/youtube/v3';
  }

  // Extract YouTube videoId from a URL or return null
  extractVideoId(url) {
    try {
      if (!url || typeof url !== 'string') return null;
      const match = url.match(/[?&]v=([a-zA-Z0-9_-]{6,})/) || url.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  // Verify a YouTube URL via oEmbed; returns normalized URL if valid else null
  async verifyYouTubeUrl(url) {
    try {
      const videoId = this.extractVideoId(url);
      if (!videoId) return null;
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const res = await fetch(oembedUrl);
      if (res && res.ok) {
        return `https://www.youtube.com/watch?v=${videoId}`;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Ensure a working YouTube URL for a given query and optional candidate
  async ensureWorkingYouTubeUrl(query, candidateUrl) {
    // 1) If candidate is valid, return normalized
    const verified = await this.verifyYouTubeUrl(candidateUrl);
    if (verified) return verified;

    // 2) Try search with details
    try {
      const results = await this.searchVideosWithDetails(query, 1);
      if (results && results.length > 0) {
        const valid = await this.verifyYouTubeUrl(results[0].url);
        if (valid) return valid;
      }
    } catch { }

    // 3) No more mock fallbacks per strict mode

    return candidateUrl || null;
  }

  // Alternative search using usetube library (no API key required)
  async searchVideosAlternative(query, maxResults = 5) {
    try {
      console.log(`YouTubeService: Searching for "${query}" using usetube library`);
      const results = await usetube.searchVideo(query, maxResults);

      // Check if results exist and have videos property
      if (!results || typeof results !== 'object') {
        console.log('YouTubeService: Invalid results from usetube');
        return [];
      }

      // usetube returns { videos: [], didyoumean: "" }
      const videos = results.videos || [];

      if (!videos || videos.length === 0) {
        console.log('YouTubeService: No results from usetube');
        return [];
      }

      return videos.map(video => ({
        videoId: video.id,
        title: video.title,
        description: video.description || `Learn ${query} with this comprehensive tutorial`,
        thumbnail: video.thumbnail || `https://img.youtube.com/vi/${video.id}/mqdefault.jpg`,
        channelTitle: video.channelTitle || 'Educational Channel',
        publishedAt: video.publishedAt || new Date().toISOString(),
        url: `https://www.youtube.com/watch?v=${video.id}`,
        duration: video.duration || 'Unknown',
        viewCount: video.viewCount || 0,
        likeCount: video.likeCount || 0
      }));
    } catch (error) {
      console.error('YouTubeService: usetube search error:', error);
      return [];
    }
  }

  // Web scraping method using YouTube search page
  async searchVideosWebScraping(query, maxResults = 5) {
    try {
      console.log(`YouTubeService: Seeking links for "${query}"...`);

      // Use a more reliable way to get search results or just return a direct search URL
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

      // Instead of failing with a proxy, we'll return a special "Search Results" entry
      // This is more reliable than scraping which gets blocked easily
      return [{
        videoId: 'search',
        title: `${query} (Search Results)`,
        description: `View search results for ${query} directly on YouTube`,
        thumbnail: 'https://www.youtube.com/img/desktop/yt_1200.png',
        channelTitle: 'YouTube Search',
        publishedAt: new Date().toISOString(),
        url: searchUrl,
        duration: 'Multiple',
        viewCount: 'Various',
        likeCount: 0
      }];
    } catch (error) {
      // Shhh... don't wake the user with scraping errors
      return [];
    }
  }

  // Parse YouTube search page HTML to extract video information
  parseYouTubeSearchHTML(html, query, maxResults) {
    try {
      const videos = [];

      // Look for video data in script tags (YouTube embeds video data in JSON-LD)
      const scriptRegex = /<script[^>]*>[\s\S]*?var ytInitialData = ([\s\S]*?);[\s\S]*?<\/script>/;
      const match = html.match(scriptRegex);

      if (match) {
        try {
          const data = JSON.parse(match[1]);
          const contents = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

          for (const item of contents) {
            if (videos.length >= maxResults) break;

            const videoRenderer = item?.videoRenderer;
            if (videoRenderer) {
              const videoId = videoRenderer.videoId;
              const title = videoRenderer.title?.runs?.[0]?.text || 'Untitled';
              const channelTitle = videoRenderer.ownerText?.runs?.[0]?.text || 'Unknown Channel';
              const thumbnail = videoRenderer.thumbnail?.thumbnails?.[0]?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
              const viewCount = videoRenderer.viewCountText?.simpleText || '0 views';
              const publishedAt = videoRenderer.publishedTimeText?.simpleText || 'Unknown';

              videos.push({
                videoId: videoId,
                title: title,
                description: `Learn ${query} with this tutorial`,
                thumbnail: thumbnail,
                channelTitle: channelTitle,
                publishedAt: publishedAt,
                url: `https://www.youtube.com/watch?v=${videoId}`,
                duration: 'Unknown',
                viewCount: viewCount,
                likeCount: 0
              });
            }
          }
        } catch (parseError) {
          console.log('YouTubeService: Could not parse YouTube data, returning empty results');
        }
      }

      return videos;
    } catch (error) {
      console.error('YouTubeService: HTML parsing error:', error);
      return [];
    }
  }

  // Get video details using oEmbed (no API key required)
  async getVideoDetailsOEmbed(videoId) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);

      if (!response.ok) {
        throw new Error(`oEmbed request failed: ${response.status}`);
      }

      const data = await response.json();
      return {
        videoId: videoId,
        title: data.title,
        thumbnail: data.thumbnail_url,
        authorName: data.author_name,
        authorUrl: data.author_url,
        url: `https://www.youtube.com/watch?v=${videoId}`
      };
    } catch (error) {
      console.error('YouTubeService: oEmbed error:', error);
      return null;
    }
  }

  // Search for videos using YouTube RSS feeds (no API key required)
  async searchVideosRSS(query, maxResults = 5) {
    try {
      // Popular educational channels for different topics
      const channels = {
        'python': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'javascript': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'react': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'web development': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'programming': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'machine learning': 'UCbfYPyITQ-7l4upoX8nvctg', // Two Minute Papers
        'data science': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'java': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'css': 'UC8butISFwT-Wl7EV0hUK0BQ', // freeCodeCamp
        'html': 'UC8butISFwT-Wl7EV0hUK0BQ' // freeCodeCamp
      };

      // Find matching channel based on query
      const queryLower = query.toLowerCase();
      let channelId = channels['programming']; // default

      for (const [keyword, id] of Object.entries(channels)) {
        if (queryLower.includes(keyword)) {
          channelId = id;
          break;
        }
      }

      const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
      const response = await fetch(rssUrl);

      if (!response.ok) {
        throw new Error(`RSS request failed: ${response.status}`);
      }

      const xmlText = await response.text();
      const videos = this.parseRSSFeed(xmlText, query, maxResults);

      return videos;
    } catch (error) {
      console.error('YouTubeService: RSS search error:', error);
      return [];
    }
  }

  // Parse RSS feed XML to extract video information
  parseRSSFeed(xmlText, query, maxResults) {
    try {
      const videoRegex = /<entry>[\s\S]*?<yt:videoId>(.*?)<\/yt:videoId>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<published>(.*?)<\/published>[\s\S]*?<media:group>[\s\S]*?<media:description>(.*?)<\/media:description>[\s\S]*?<media:thumbnail url="(.*?)"[\s\S]*?<\/entry>/g;

      const videos = [];
      let match;
      let count = 0;

      while ((match = videoRegex.exec(xmlText)) !== null && count < maxResults) {
        const [, videoId, title, publishedAt, description, thumbnail] = match;

        // Filter videos that match the query
        if (title.toLowerCase().includes(query.toLowerCase()) ||
          description.toLowerCase().includes(query.toLowerCase())) {
          videos.push({
            videoId: videoId,
            title: title,
            description: description || `Learn ${query} with this tutorial`,
            thumbnail: thumbnail,
            channelTitle: 'Educational Channel',
            publishedAt: publishedAt,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            duration: 'Unknown',
            viewCount: 0,
            likeCount: 0
          });
          count++;
        }
      }

      return videos;
    } catch (error) {
      console.error('YouTubeService: Search failed:', error);
      return [];
    }
  }

  // Search for YouTube videos based on query
  async searchVideos(query, maxResults = 5) {
    // Force non-API path or if API key is missing
    if (!this.apiKey) {
      // Try alternative methods in order of preference
      try {
        // First try usetube library
        const usetubeResults = await this.searchVideosAlternative(query, maxResults);
        if (usetubeResults && usetubeResults.length > 0) {
          return usetubeResults;
        }
      } catch (error) {
        // Silent fail
      }

      try {
        // Try web scraping method (now simplified to return a search link)
        const webScrapingResults = await this.searchVideosWebScraping(query, maxResults);
        if (webScrapingResults && webScrapingResults.length > 0) {
          return webScrapingResults;
        }
      } catch (error) {
        // Silent fail
      }

      // Final fallback: just return a single item with a search link
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      return [{
        videoId: 'search',
        title: `${query} on YouTube`,
        description: `Find tutorials for ${query} on YouTube`,
        thumbnail: 'https://www.youtube.com/img/desktop/yt_1200.png',
        channelTitle: 'YouTube',
        publishedAt: new Date().toISOString(),
        url: searchUrl,
        duration: 'Multiple',
        viewCount: 'Various',
        likeCount: 0
      }];
    }

    // Official API searching would go here if apiKey was present
    return [];
  }

  // Get video details including duration
  async getVideoDetails(videoIds) {
    if (!this.apiKey || !videoIds.length) {
      return [];
    }

    try {
      const detailsUrl = `${this.baseUrl}/videos`;
      const params = new URLSearchParams({
        part: 'contentDetails,snippet,statistics',
        id: videoIds.join(','),
        key: this.apiKey
      });

      const response = await fetch(`${detailsUrl}?${params}`);

      if (!response.ok) {
        console.warn(`YouTube API details not ok (${response.status}). Skipping details enrichment.`);
        return [];
      }

      const data = await response.json();

      return data.items.map(item => ({
        videoId: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
        duration: this.parseDuration(item.contentDetails.duration),
        viewCount: parseInt(item.statistics.viewCount) || 0,
        likeCount: parseInt(item.statistics.likeCount) || 0,
        url: `https://www.youtube.com/watch?v=${item.id}`
      }));
    } catch (error) {
      console.error('YouTube API details error:', error);
      return [];
    }
  }

  // Parse YouTube duration format (PT4M13S) to readable format
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Enhanced search with video details
  async searchVideosWithDetails(query, maxResults = 3) {
    try {
      // First search for videos
      const searchResults = await this.searchVideos(query, maxResults);

      if (!searchResults.length) {
        return [];
      }

      // If using alternative methods (no API key), return results as-is
      if (!this.apiKey) {
        console.log(`YouTubeService: Returning ${searchResults.length} videos from alternative methods`);
        return searchResults;
      }

      // Get detailed information for each video (only when using official API)
      const videoIds = searchResults.map(video => video.videoId);
      const detailedResults = await this.getVideoDetails(videoIds);

      // Merge search results with detailed information
      const merged = searchResults.map(searchResult => {
        const details = detailedResults.find(detail => detail.videoId === searchResult.videoId);
        return {
          ...searchResult,
          ...details,
          url: searchResult.url // Keep the URL from search results
        };
      });
      // If details couldn't be fetched, return searchResults
      return merged.length ? merged : searchResults;
    } catch (error) {
      console.error('YouTubeService: API search error:', error);
      // On error, try alternatives before returning empty
      try {
        const alt = await this.searchVideosAlternative(query, maxResults);
        if (alt && alt.length) return alt;
      } catch { }
      try {
        const web = await this.searchVideosWebScraping(query, maxResults);
        if (web && web.length) return web;
      } catch { }
      return [];
    }
  }

  // Generate YouTube links for roadmap videos
  async generateRoadmapVideoLinks(roadmapData) {
    try {
      console.log('YouTubeService: Starting roadmap video link generation');
      const enhancedRoadmap = { ...roadmapData };

      // Process each stage
      const stages = ['stage_1_critical_gaps', 'stage_2_important_gaps', 'stage_3_nice_to_have'];

      for (const stage of stages) {
        console.log(`YouTubeService: Processing stage ${stage}`);
        if (enhancedRoadmap.roadmap && enhancedRoadmap.roadmap[stage]) {
          console.log(`YouTubeService: Found ${enhancedRoadmap.roadmap[stage].length} skills in ${stage}`);
          for (const skillGap of enhancedRoadmap.roadmap[stage]) {
            if (skillGap.youtube_videos) {
              console.log(`YouTubeService: Processing ${skillGap.youtube_videos.length} videos for skill ${skillGap.skill}`);
              for (const video of skillGap.youtube_videos) {
                if (video.search_query) {
                  console.log(`YouTubeService: Searching for video with query: ${video.search_query}`);
                  try {
                    const searchResults = await this.searchVideosWithDetails(video.search_query, 1);
                    console.log(`YouTubeService: Found ${searchResults.length} results for query: ${video.search_query}`);
                    if (searchResults.length > 0) {
                      const bestMatch = searchResults[0];
                      // Ensure URL actually works; fallback to alternatives if needed
                      const ensuredUrl = await this.ensureWorkingYouTubeUrl(video.search_query, bestMatch.url);
                      video.url = ensuredUrl || bestMatch.url;
                      video.videoId = this.extractVideoId(video.url) || bestMatch.videoId;
                      video.thumbnail = bestMatch.thumbnail;
                      video.duration = bestMatch.duration;
                      video.viewCount = bestMatch.viewCount;
                      video.channelTitle = bestMatch.channelTitle;
                      video.publishedAt = bestMatch.publishedAt;
                      console.log(`YouTubeService: Enhanced video with URL: ${video.url}`);
                    }
                  } catch (error) {
                    console.error(`YouTubeService: Error fetching video for query "${video.search_query}":`, error);
                    // Keep the search_query as fallback
                  }
                }
              }
            }
          }
        }
      }

      console.log('YouTubeService: Roadmap video link generation completed');
      return enhancedRoadmap;
    } catch (error) {
      console.error('YouTubeService: Error generating roadmap video links:', error);
      return roadmapData; // Return original data if enhancement fails
    }
  }
}

export default YouTubeService;


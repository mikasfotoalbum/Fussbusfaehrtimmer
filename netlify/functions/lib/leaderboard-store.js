const { getStore } = require("@netlify/blobs");

// Zero-config Netlify Blobs (automatic siteID/token injection) doesn't
// work in every deploy environment. Fall back to explicit credentials
// (NETLIFY_SITE_ID + NETLIFY_API_TOKEN) when they're set.
function leaderboardStore() {
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_API_TOKEN;
  if (siteID && token) {
    return getStore({ name: "leaderboard", siteID, token });
  }
  return getStore("leaderboard");
}

module.exports = { leaderboardStore };

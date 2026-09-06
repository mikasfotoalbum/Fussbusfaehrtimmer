// Redirects the browser to Strava's OAuth authorize page.
// Requires STRAVA_CLIENT_ID to be set as a Netlify environment variable.
exports.handler = async (event) => {
  const clientId = process.env.STRAVA_CLIENT_ID;
  if (!clientId) {
    return {
      statusCode: 500,
      body: "STRAVA_CLIENT_ID ist nicht gesetzt. Bitte in den Netlify-Umgebungsvariablen hinterlegen.",
    };
  }

  const siteUrl = process.env.URL || `https://${event.headers.host}`;
  const redirectUri = `${siteUrl}/api/strava/callback`;

  const authorizeUrl = new URL("https://www.strava.com/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", clientId);
  authorizeUrl.searchParams.set("redirect_uri", redirectUri);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("approval_prompt", "auto");
  authorizeUrl.searchParams.set("scope", "read,activity:read");

  return {
    statusCode: 302,
    headers: { Location: authorizeUrl.toString() },
  };
};

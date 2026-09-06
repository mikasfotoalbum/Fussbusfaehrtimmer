const { leaderboardStore } = require("./lib/leaderboard-store");

// Sums the distance (in meters) of on-foot activities on the
// athlete's Strava account since the challenge start date that are
// tagged for the challenge (tag appears in the activity title or
// description) — so only intentionally-logged challenge walks count,
// not every stroll the athlete happens to record. Accepts Walk/Hike as
// well as Run/TrailRun, since Strava's auto-detected activity type for
// a walk is not always "Walk".
const CHALLENGE_TAG = (process.env.CHALLENGE_TAG || "#fussbuscas").toLowerCase();
const COUNTED_TYPES = new Set(["Walk", "Hike", "Run", "TrailRun"]);

async function sumWalkingMeters(accessToken) {
  const afterDate = process.env.CHALLENGE_START_DATE || "2026-01-01";
  const after = Math.floor(new Date(`${afterDate}T00:00:00Z`).getTime() / 1000);
  const perPage = 100;
  let page = 1;
  let total = 0;

  while (page <= 10) {
    const res = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}&page=${page}&after=${after}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) break;
    const activities = await res.json();
    if (!Array.isArray(activities) || activities.length === 0) break;
    for (const a of activities) {
      if (!COUNTED_TYPES.has(a.type)) continue;
      if (isTagged(a)) {
        total += a.distance || 0;
        continue;
      }
      // The list endpoint only returns the title, not the
      // description — fetch the full activity to check both.
      const detail = await fetchActivityDetail(a.id, accessToken);
      if (detail && isTagged(detail)) total += a.distance || 0;
    }
    if (activities.length < perPage) break;
    page++;
  }
  return total;
}

function isTagged(activity) {
  const haystack = `${activity.name || ""} ${activity.description || ""}`.toLowerCase();
  return haystack.includes(CHALLENGE_TAG);
}

async function fetchActivityDetail(activityId, accessToken) {
  const res = await fetch(`https://www.strava.com/api/v3/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return res.json();
}

exports.handler = async (event) => {
  const params = event.queryStringParameters || {};
  const siteUrl = process.env.URL || `https://${event.headers.host}`;

  if (params.error) {
    return { statusCode: 302, headers: { Location: `${siteUrl}/leaderboard.html?strava=denied` } };
  }
  if (!params.code) {
    return { statusCode: 400, body: "Missing code" };
  }

  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      statusCode: 500,
      body: "STRAVA_CLIENT_ID / STRAVA_CLIENT_SECRET sind nicht gesetzt.",
    };
  }

  const tokenRes = await fetch("https://www.strava.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code: params.code,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return { statusCode: 302, headers: { Location: `${siteUrl}/leaderboard.html?strava=error` } };
  }

  const tokenData = await tokenRes.json();
  const { access_token, athlete } = tokenData;
  if (!access_token || !athlete) {
    return { statusCode: 302, headers: { Location: `${siteUrl}/leaderboard.html?strava=error` } };
  }

  const totalMeters = await sumWalkingMeters(access_token);

  const store = leaderboardStore();
  const entry = {
    athleteId: athlete.id,
    name: `${athlete.firstname || ""} ${athlete.lastname || ""}`.trim() || "Unbekannt",
    avatar: athlete.profile_medium || null,
    km: Math.round((totalMeters / 1000) * 10) / 10,
    lastSynced: new Date().toISOString(),
  };
  await store.setJSON(String(athlete.id), entry);

  return { statusCode: 302, headers: { Location: `${siteUrl}/leaderboard.html?strava=connected` } };
};

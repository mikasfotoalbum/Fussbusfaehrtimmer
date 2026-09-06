const { leaderboardStore } = require("./lib/leaderboard-store");

exports.handler = async () => {
  const store = leaderboardStore();
  const { blobs } = await store.list();

  const entries = [];
  for (const b of blobs) {
    const data = await store.get(b.key, { type: "json" });
    if (data) {
      entries.push({
        name: data.name,
        avatar: data.avatar,
        km: data.km,
        lastSynced: data.lastSynced,
      });
    }
  }
  entries.sort((a, b) => b.km - a.km);

  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    body: JSON.stringify({ entries }),
  };
};

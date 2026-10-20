// Server-side Firebase proxy & executor
// Client browser NEVER receives Firebase database URLs
// All requests to Firebase RTDB are handled server-side here in Vercel

function getDatabaseUrls() {
  const raw = process.env.FIREBASE_URLS;
  if (!raw) return [];
  try {
    return typeof raw === 'string' && raw.trim().startsWith('[')
      ? JSON.parse(raw)
      : raw.split(',').map(s => s.trim()).filter(Boolean);
  } catch (e) {
    return [raw];
  }
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');

  try {
    const urls = getDatabaseUrls();
    const action = req.query.action || (req.body && req.body.action);

    // Action 1: Return list of anonymous database IDs (e.g. db_0, db_1, ...)
    // ZERO raw Firebase URLs are returned!
    if (action === 'get_dbs' || (!action && req.method === 'GET' && !req.query.dbIndex)) {
      const dbList = urls.map((_, idx) => ({
        id: `db_${idx}`,
        name: `Database #${idx + 1}`
      }));
      return res.status(200).json({ count: urls.length, databases: dbList });
    }

    // Action 2: Proxy Firebase REST operations server-side
    // Client only passes dbIndex, path, queryParams, method, body
    const dbIndex = parseInt(req.query.dbIndex ?? (req.body && req.body.dbIndex) ?? 0, 10);
    const targetUrl = urls[dbIndex];
    if (!targetUrl) {
      return res.status(404).json({ error: 'Database index not found' });
    }

    const path = req.query.path || (req.body && req.body.path) || 'clients';
    const authKey = req.query.key || (req.body && req.body.key) || '@TOXIC_ADMINN';
    const method = req.method;

    let targetEndpoint = `${targetUrl.replace(/\/$/, '')}/${path}.json?auth=${encodeURIComponent(authKey)}`;

    // Forward additional query parameters (like orderBy, limitToLast)
    for (const [k, v] of Object.entries(req.query)) {
      if (!['action', 'dbIndex', 'path', 'key'].includes(k)) {
        targetEndpoint += `&${encodeURIComponent(k)}=${encodeURIComponent(v)}`;
      }
    }

    const fetchOptions = {
      method: method === 'GET' ? 'GET' : method,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    if (method !== 'GET' && method !== 'HEAD' && req.body) {
      fetchOptions.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body.data || req.body);
    }

    const fbRes = await fetch(targetEndpoint, fetchOptions);
    const data = await fbRes.json().catch(() => null);

    return res.status(fbRes.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: 'Server proxy error: ' + err.message });
  }
}

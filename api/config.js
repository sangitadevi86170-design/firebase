// Secure config endpoint that returns ZERO database URLs to browser
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  try {
    const raw = process.env.FIREBASE_URLS;
    let count = 0;
    if (raw) {
      try {
        const parsed = typeof raw === 'string' && raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',');
        count = Array.isArray(parsed) ? parsed.length : 1;
      } catch (e) {
        count = 1;
      }
    }
    // Return count and status only, NEVER return raw URLs!
    return res.status(200).json({ status: 'ok', count: count });
  } catch (err) {
    return res.status(500).json({ status: 'error' });
  }
}

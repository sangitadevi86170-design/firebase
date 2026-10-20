export default function handler(req, res) {
  // Return firebase urls from environment variable
  try {
    const raw = process.env.FIREBASE_URLS;
    let urls = [];
    if (raw) {
      try {
        urls = typeof raw === 'string' && raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',').map(s => s.trim()).filter(Boolean);
      } catch (e) {
        urls = [raw];
      }
    }
    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.status(200).json({ urls });
  } catch (err) {
    return res.status(500).json({ urls: [], error: 'Failed to read config' });
  }
}

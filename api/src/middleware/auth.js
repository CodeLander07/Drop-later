export function authMiddleware(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return res.status(500).json({ error: 'Server misconfigured' });
  if (!token || token !== expected) return res.status(401).json({ error: 'Unauthorized' });
  next();
}



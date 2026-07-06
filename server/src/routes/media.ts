import { type Request, type Response, Router } from 'express';
import { enabledProviders, findProvider } from '../media';
import { requireAuth } from '../middleware';

export const mediaRouter = Router();

// Only authenticated creators may search media (each call hits a rate-limited
// external API on our key).
mediaRouter.use(requireAuth);

// Which providers are configured, grouped by tab — the client uses this to
// decide which tabs/pills to show.
mediaRouter.get('/providers', (_req: Request, res: Response) => {
  const providers = enabledProviders().map((p) => ({
    id: p.id,
    label: p.label,
    tab: p.tab,
    kind: p.kind,
  }));
  res.json({ providers });
});

// GET /api/media/search?provider=openverse&q=mars&page=<cursor>
mediaRouter.get('/search', async (req: Request, res: Response) => {
  const providerId = String(req.query.provider ?? '');
  const query = String(req.query.q ?? '').trim();
  const cursor = req.query.page ? String(req.query.page) : undefined;

  const provider = findProvider(providerId);
  if (!provider) {
    res.status(400).json({ error: 'Unknown or unavailable provider' });
    return;
  }
  // An empty query is allowed — providers return a trending/popular feed.

  try {
    const result = await provider.search(query, cursor);
    res.json(result);
  } catch (err) {
    console.error(`media search failed (${providerId}):`, err);
    res.status(502).json({ error: 'Media provider request failed' });
  }
});

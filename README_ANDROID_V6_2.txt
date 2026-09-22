IRON Android V6.2 – Route Fix + Hamburger Navigation

Critical fix:
V3.1 advertised /api/images/list and /api/images/get in /api/status but the actual
router did not register them. V3.2 registers those handlers.

Android:
- Global hamburger menu on every HTML screen.
- Old bottom navigation removed.
- Direct commands to open shopping/plans/photos never call a Function route.
- News falls back to /api/news if /api/news/important is unavailable.
- Image list falls back to /api/images/status for compatibility.
- Raw 404 is replaced by a clear "deploy V3.2" cloud-version message.
- Diagnostics page includes route checks.

Deploy Function V3.2 before building/installing V6.2.

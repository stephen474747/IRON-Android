IRON Android V6.2.1

Recipe save reliability fix:
- Research request sends save=true to Function V3.2.2.
- Function saves plan + shopping lists server-side.
- Android only refreshes plans.html / einkaufsliste.html after success.
- POST requests have a 90 second timeout with clear timeout/network errors instead of raw "Failed to fetch".

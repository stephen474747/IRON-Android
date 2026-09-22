IRON Android V6.1 – Recipe Research + Dedicated Photo Library

RECIPES / PLAN + SHOPPING
- Requests for recipes/food + plan/week/shopping trigger /api/research-plan.
- Function must perform web search for real recipe ideas.
- For every recipe it returns every ingredient separately with amount,
  portions, paraphrased numbered preparation steps and source URL.
- App saves one plan row (typ=plan) to plans.html.
- App saves one separate shopping row per recipe (typ=einkauf) to einkaufsliste.html.

PHOTOS
- New standalone photos.html. Cloud photos no longer need the HUD.
- /api/images/list returns ALL iron_images rows using pagination.
- /api/images/get returns preview/full image through the server.
- Grid shows all Appwrite photos.
- Open photo => zoom, rotate, brightness/contrast, IRON Vision description,
  name/description editing and saving an edited copy.
- Voice "IRON, zeig mir Bild/Foto/Logo X" opens photos.html and the best matching Appwrite image.

Important IDs:
database=iron
table=iron_images
bucket=iron-images

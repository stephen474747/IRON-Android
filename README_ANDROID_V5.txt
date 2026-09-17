IRON Android V5 – Memory Client

Basis: funktionierende Android V4.

Geändert:
- /api/chat sendet source=android in der nativen App.
- /api/chat sendet conversation_id=mobile-main.
- Browser sendet source=web und conversation_id=web-main.
- Dadurch kann IRON Unified Cloud v2.3.1 die Android-Identität (Sir), Chat-Historie und Langzeitgedächtnis korrekt zuordnen.
- Einkaufsliste, News, Wetter, Aktien, Kontakte, Telefon, TTS und bestehende HUD-Funktionen wurden nicht umgebaut.

Build:
1. ZIP in dein GitHub Android-Projekt übernehmen/hochladen.
2. GitHub Actions Workflow build-apk.yml starten.
3. APK aus den Artifacts installieren.

Test:
- "IRON, merk dir, dass meine Lieblingsfarbe Blau ist."
- App neu starten.
- "IRON, was ist meine Lieblingsfarbe?"

Hinweis: Die Bilderbibliothek ist noch nicht in V5 eingebaut; dafür müssen iron_images und der Storage-Bucket iron-images vorhanden sein.

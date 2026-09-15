IRON Web v19.3

NEU
- Bilder direkt im HUD anzeigen, Vollbild per Klick.
- Live News im HUD (über Appwrite Function).
- Live/letzte verfügbare Aktienkurse im HUD (AAPL, MSFT, NVDA, TSLA).
- Einkaufslisten verstehen Gerichte/Rezepte. Beispiel:
  "Iron, erstelle mir eine Einkaufsliste mit allem was ich für Waffeln brauche."
- Offline-Fallback enthält Waffel-Zutaten.
- Gmail-Schaltfläche ist vorbereitet, aber Gmail bleibt absichtlich NICHT verbunden,
  bis Google OAuth eingerichtet wurde.

WICHTIG
- Kein "Vollzugriff auf alles" und keine Passwörter/API-Keys im Web-Code.
- Gmail braucht Google OAuth (Client-ID, Client-Secret, Redirect URL).
- PC-Funktionen bleiben über den PC Agent getrennt und kontrollierbar.

DEPLOY
1. Appwrite Function tar.gz als neues Deployment hochladen.
   Entrypoint: index.js
   Execute access: Any
   ANTHROPIC_API_KEY als Secret behalten.
2. Web-ZIP auf GitHub hochladen/ersetzen.
3. Browser hart neu laden (Strg+F5).

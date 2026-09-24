IRON FULL WEB v19.8 FIXED

WICHTIG:
Diese Dateien gehören zusammen. Nicht mit älteren v19.7-Dateien mischen.

GitHub:
1. Alle Dateien aus diesem ZIP in dein GitHub-Pages-Repository hochladen/ersetzen.
2. Besonders:
   - app.js
   - iron-appwrite.js
   - index.html
   - hud.html
   - plans.html
   - einkaufsliste.html
   - task.html
   - diagnostics.html
   - style.css

3. Danach GitHub Pages neu öffnen.
4. STRG + F5 drücken.
5. F12 -> Console öffnen.

In der Console MUSS stehen:
[IRON] APP.JS v19.8 geladen

Wenn weiterhin app.js?v=197 angezeigt wird, lädt GitHub/Browser noch eine alte Datei.

Behobener Fehler:
ReferenceError: formatDate is not defined

Einkaufsliste:
- Appwrite Rows werden gelesen.
- typ=einkauf wird angezeigt.
- alte Rows mit EINKAUF // werden ebenfalls angezeigt.

Appwrite plans Spalten:
name      Varchar/Text
inhalt    Text
erstellt  Datetime
typ       Varchar(20), optional

Permissions:
CREATE
READ
UPDATE
DELETE

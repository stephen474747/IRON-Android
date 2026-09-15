IRON ANDROID V1
================

Ziel:
- bestehendes IRON v20 als echte Android-App
- Vollbild-HUD
- Bilder im HUD aus Galerie/Kamera-Auswahl
- native Sprachaufnahme
- native TTS-Ausgabe mit bevorzugt deutscher, männlich klingender Stimme
- Task-Erinnerungen als Android-Benachrichtigungen
- Telefon-Wählfeld und direkter Telefonanruf aus der geöffneten App
- APK-Build über GitHub Actions, kein Android Studio nötig

WICHTIG ZUR TELEFONFUNKTION
---------------------------
Android schränkt automatische Starts aus dem Hintergrund ein.
V1 kann:
- App offen -> direkter Anruf nach CALL_PHONE-Berechtigung
- Wählfeld öffnen -> funktioniert normal

Für "IRON PC sagt anrufen, Handy liegt im Hintergrund":
- nächste Stufe: Firebase/Push + Appwrite phonecommands
- Hintergrund -> sofortige IRON-Benachrichtigung mit Anruf-Aktion
- echte vollautomatische Hintergrundanrufe sind je nach Android-Version/Hersteller eingeschränkt.

GITHUB BUILD
------------
1. Inhalt dieses ZIP in ein neues GitHub Repository hochladen.
2. GitHub -> Actions -> "Build IRON Android APK".
3. "Run workflow" drücken.
4. Nach erfolgreichem Build -> Artifact "IRON-Android-Debug-APK".
5. APK herunterladen und auf Android installieren.

ERSTER START
------------
- Mikrofon erlauben
- Benachrichtigungen erlauben
- Beim ersten direkten Anruf Telefon-Berechtigung erlauben.
- Danach den Anruf-Button erneut drücken.

NÄCHSTE STUFE
-------------
Für PC -> Handy Befehle:
Appwrite Tabelle "phonecommands":
command     Varchar/Text required
status      Varchar(20) required
created_at  Datetime required
target      Varchar(50) optional
result      Text optional

Beispiel:
command = CALL:+352...
status = pending

Für zuverlässige Hintergrundzustellung wird Push/FCM ergänzt.

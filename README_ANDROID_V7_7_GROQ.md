# IRON Android 7.7 — Webdesign und Groq

Vollständiger Android-Quellcode zum Ersetzen im bestehenden Android-GitHub-Repository.
Die ZIP ist Quellcode, keine fertige APK. Der vorhandene GitHub-Actions-Workflow baut die Debug-APK.

1. ZIP entpacken und Dateien einschließlich .github im bestehenden Android-Repository ersetzen/ergänzen.
2. GitHub → Actions → Build IRON Android APK starten (oder main-Änderungen pushen).
3. Nach erfolgreichem Build das Artifact IRON-Android-Debug-APK herunterladen/entpacken und app-debug.apk installieren.
4. Falls Android beim Aktualisieren eine inkompatible Signatur meldet, nicht einfach deinstallieren: Das kann Appdaten/Berechtigungen löschen. Zuerst vorhandenen Signierschlüssel bzw. bisherigen Buildweg prüfen. Debug-Signaturen können bei getrennten CI-Builds variieren.

Groq setzt die bestehende IRON Cloud 3.10.0 voraus. Dort GROQ_API_KEY und GROQ_MODEL=openai/gpt-oss-120b setzen. Kein Groq-Schlüssel in App oder Repository. Der Chat verwendet dieselbe Cloud-URL und behält Androids bisherige conversation_id=main für Kontinuität.

Neues Design für Home, HUD, Tasks, Pläne, Einkauf, Fotos, Diagnose und neue Ideen-Seite wie auf der Webseite. Vorhandene News-Welt, Kalender und Bilder-Seiten bleiben erreichbar; ihre Android-spezifischen Bedienelemente bleiben erhalten. Alle Seiten im Hamburger-Menü. Auf Android weiterhin native Sprachausgabe; kein Ersatz durch den Web-Sprachschalter.

Groq-Chat: begrenzte Wartezeit, verständliche Fehler und Prüfung leerer Antworten. Diagnoseseite zeigt tatsächliches Modell und Cloud-Version. News-Zusammenfassungen benötigen Cloud 3.10.0. Bildanalyse/allgemeine Webrecherche haben die in der Cloud-Anleitung genannten Einschränkungen.

SMS wurde nicht umgebaut: native SMS-Plugins, Hintergrunddienst, Receiver, mobile.js und app.js identisch zur vorherigen 7.6-Version. Bestehende Cloud-/SMS-Einstellungen behalten.

Prüfung: JavaScript-Syntax, lokale Seitenlinks und unveränderte SMS-relevante Dateien. Keine APK-Kompilierung oder Prüfung auf echtem Android-Gerät in dieser Umgebung.

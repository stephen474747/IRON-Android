IRON Android V6.3 // Interaktive Welt

Neuer Menüeintrag WELT / NEWS und eigener Bildschirm www/world.html.
Auf HOME und HUD kann die Welt auch direkt geöffnet werden. Ein gesprochener
Landesbefehl öffnet auf HOME die Weltseite; auf der Weltseite übernimmt
der native Sprachknopf die Auswahl. Ziehen dreht, Gesten zoomen.

Die Welt zeichnet höchstens 30 FPS, nutzt 70 % Renderauflösung, die
50m-Ländergrenzen und keine Satellitentextur. Ohne Landwahl gehen keine
Nachrichtenanfragen ab. Nach Auswahl fordert die App ausschließlich die
geprüften Meldungen aus CLOUD/index.js V3.3.0 an. Wenn der alte Cloud-Endpunkt
noch läuft, erscheinen bewusst keine als geprüft bezeichneten Meldungen.

Cloud-Update: die bestehende IRON Unified Appwrite Function mit dem Inhalt
des CLOUD-Ordners aktualisieren, Entrypoint index.js, vorhandene Environment-
Variablen und Datenbankeinstellungen beibehalten. Erst danach die Android-
App per bestehendem GitHub-Actions-Workflow oder BUILD_ANDROID_APK.bat
neu bauen. Das Projekt enthält Quellcode und Workflow, keine fertige APK.

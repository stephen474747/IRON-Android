IRON Android V6.5 — aufgeräumte Oberfläche und Nachrichtenwelt

Bildschirme: HOME, HUD, WELT / NEWS, FOTOS, PLÄNE, EINKAUF, TASKS,
DIAGNOSE. Das Hamburger-Menü zeigt alle acht Ziele gleichzeitig als
2 x 4 Raster; im Querformat 4 x 2. Es braucht kein Scrollen im Menü.

Das Design der acht Seiten verwendet kompakte Überschriften, ruhige
Hintergründe, gleichmäßige Abstände und größere Touch-Flächen. HOME
enthält die direkte Welt-Verknüpfung; die Ansicht WELT / NEWS zeigt den
3D-Globus. "Was gibt es Neues?" öffnet ihn aus HOME oder HUD;
"Nachrichten aus Luxemburg" öffnet direkt das betreffende Land.
Die Ländersteuerung und die Nachrichtenliste sind für Smartphone-
Bildschirme kompakter angeordnet. Die Nachrichten werden nur für
gewählte Länder geladen und können dort zusammengefasst werden.

Die Diagnose-Seite hatte zwei gleich benannte Testknöpfe. Sie wurde
bereinigt; jeder Knopf hat jetzt eine eigene Funktion und eindeutige ID.

WICHTIG: Dieses ZIP enthält das Android-Projekt, keinen bereits
kompilierten APK-Build. Baue die Debug-APK unter Windows mit
BUILD_ANDROID_APK.bat (Node.js, JDK 21 und Android SDK nötig) oder
verwende .github/workflows/build-apk.yml auf GitHub. Das Ergebnis ist
android/app/build/outputs/apk/debug/app-debug.apk. Die 3D-Welt setzt
weiterhin die zuvor eingerichtete IRON Cloud-Funktion V3.4.0 voraus.

Prüfung: JavaScript-Syntax aller acht Seiten, Link-Ziele, eindeutige
HTML-IDs und Menüeinträge wurden geprüft. Ein Android-Gerätebuild
und eine visuelle Prüfung auf einem echten Gerät waren hier nicht möglich.

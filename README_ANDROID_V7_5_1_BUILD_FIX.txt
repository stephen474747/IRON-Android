IRON Android V7.5.1 — BUILD FIX

Behoben:
- MainActivity.onResume() war als protected deklariert.
- Capacitor BridgeActivity verwendet hier eine public-Methode.
- Java erlaubt beim Überschreiben keine schwächere Sichtbarkeit.
- onResume() ist jetzt public.

APK:
1. Dieses Projekt ins GitHub-Repo übernehmen.
2. Commit/Push.
3. GitHub Actions erneut starten.

Die SMS-, Dual-SIM- und Foreground-Service-Funktionen aus V7.5 bleiben erhalten.

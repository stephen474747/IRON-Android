IRON Android V7.4 — DUAL-SIM SMS RELAY

NEU
===
- SMS senden direkt über Android.
- Dual-SIM Auswahl: SIM 1 oder SIM 2.
- IRON PC V22.0 kann SMS-Aufträge über Appwrite an die Android-App schicken.
- Android registriert das eigene Appwrite-Benutzerkonto automatisch beim PC-Agenten.
- SMS-Aufträge werden vor dem Senden "geclaimed", damit sie nicht doppelt versendet werden.

BERECHTIGUNGEN
==============
Android fragt nach:
- SEND_SMS
- READ_PHONE_STATE

Die Berechtigung muss erteilt werden, damit IRON die SIM auswählen und SMS senden kann.

SPRACHE AUF ANDROID
===================
"IRON, benutze SIM 2 für SMS"

"IRON, sende eine SMS an +352621123456 mit dem Text Ich bin gleich da"

Danach:
"Ja"

PC -> ANDROID
=============
1. Android V7.4 öffnen und mit deinem normalen IRON/Appwrite-Konto anmelden.
2. App ca. 10 Sekunden offen lassen.
3. Der PC-Agent speichert danach die Android-Benutzer-ID lokal in iron_sms_relay.json.
4. Am PC:
   "IRON, sende eine SMS an +352... mit dem Text ..."
5. IRON fragt zur Sicherheit vor dem Versand noch einmal.
6. Nach "Ja" legt der PC den SMS-Job in Appwrite.
7. Android holt den Job ab und sendet ihn über die gewählte SIM.

WICHTIGE EINSCHRÄNKUNG
======================
In V7.4 arbeitet der PC->Android SMS-Relay zuverlässig, solange die IRON Android-App
läuft/geöffnet ist. Android kann WebView-Timer im tiefen Hintergrund pausieren.
Ein dauerhaftes Android-Foreground-Service-Relay wäre ein späterer Ausbau.

Normale SMS-Kosten deines Mobilfunktarifs können gelten.

APK
===
Wie bisher über .github/workflows/build-apk.yml bauen.
scripts/patch_android.py kopiert das aktualisierte native Plugin und ergänzt
die SMS-/Telefon-Berechtigungen.

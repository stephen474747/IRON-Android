# IRON SMS-Steuerung

Vorbelegt: deine eigene/erlaubte Absendernummer +352691211592; Relay-Handy +352621484034.
Kein tatsächliches Deployment oder SMS-Test durchgeführt. Android-Quellcode, keine fertig gebaute APK.

1. PC schließen und vollständige PC-ZIP direkt in D:\iron-assistant entpacken, Programmdateien ersetzen. Vorhandene Konfigurationen behalten.
2. CMD: cd /d D:\iron-assistant
   python CONFIGURE_IRON_SMS_REMOTE.py
   PIN 2223 ist vorbelegt. Das Einrichtungsskript speichert die PC-Konfiguration ohne PIN-Abfrage.
   Script speichert deine eigene Nummer als Morgen-SMS-Empfänger und Relay-Nummer als Absenderangabe. Es aktiviert keine bislang deaktivierten Morgen-SMS-Schalter.
3. Angezeigte IRON_REMOTE_SENDER und IRON_REMOTE_PIN_HASH in der bestehenden Appwrite Function als Variablen eintragen. Falls diese Variablen fehlen, verwendet dieses Paket bereits die Absendernummer und den Hash für 2223. Bestehende Variablen haben Vorrang und müssen ggf. aktualisiert werden. Bestehende Groq-/SMS-/Appwrite-Variablen behalten. Cloud 3.11 tar.gz deployen, index.js, Node22, npm install. Gleiche Domain.
4. Android-ZIP im bestehenden Android-Repository übernehmen, GitHub Actions APK bauen und installieren. Signatur muss zur vorhandenen Installation passen, nicht unbedacht deinstallieren. Hintergrunddienst einmal erneut aktivieren und zusätzliche SMS-Empfangsberechtigung erlauben.
5. IRON am PC starten. NUR EINE PC-Instanz mit diesem Relay verwenden.
6. Von +352691211592 an +352621484034 senden:
   IRON 2223 zeige Tasks
   IRON 2223 öffne Pläne
   IRON 2223 öffne HUD
   IRON 2223 öffne die Welt-News
   Die PIN ist bereits 2223.

Nur diese festen Ansichtsbefehle werden ausgeführt. Keine Terminalbefehle, kein Mail-/SMS-Senden durch die Fernsteuerung, keine allgemeinen KI-Aktionen. Normale SMS werden nicht weitergeleitet. Falscher Absender/PIN wird verworfen. Keine automatische Antwort-SMS in dieser Version.

Android-SMS-Empfang prüft Absender, Cloud prüft zusätzlich PIN-Hash und Geräteanmeldung. PIN geht für die Prüfung per HTTPS an die Cloud; dort wird nur der reine Befehl gespeichert. Der Android-Gerätespeicher enthält ausstehende SMS vorübergehend (maximal 10 Minuten). PC fragt alle 15 Sekunden ab. Ein gesperrter PC wird nicht entsperrt; die Ansicht erscheint in der laufenden Sitzung. Telefon/PC müssen eingeschaltet sein, Dienst/IRON laufen, Internet und Mobilfunk vorhanden. Force-stop verhindert Hintergrundempfang/-verarbeitung.

Verlorene Antworten werden am Telefon zeitlich begrenzt erneut versucht. IDs verhindern Wiederholung bereits eingelieferter SMS. PC merkt verarbeitete IDs vor Ausführung. Bei Absturz direkt nach Übernahme kann ein Befehl verloren gehen; er wird nicht absichtlich mehrfach ausgeführt. SMS-Absendernummer allein ist keine sichere Authentifizierung; PIN nicht weitergeben. Handyverlust: PIN-Hash in Appwrite ändern und Gerätetoken/Relaysecret erneuern.

Prüfung: Node/Python-Syntax, Manifest-Patch in temporärer Teststruktur und feste Befehlsliste geprüft. Kein Android-Compile, echter Mobilfunk-/Cloud-/PC-Integrationstest. Bestehender Ausgangs-SMS-Dienst behält seine bisherigen Funktionen.

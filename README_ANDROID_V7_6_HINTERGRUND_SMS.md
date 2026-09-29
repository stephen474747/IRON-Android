# IRON Android V7.6 – SMS-Hintergrunddienst

Die APK enthält einen nativen Android-Foreground-Service (`remoteMessaging`). Nach dem ersten Appwrite-Login erhält das Gerät von IRON Cloud V3.9 einen eigenen signierten Gerätetoken und startet den Dienst. In der Android-Statusleiste bleibt die Benachrichtigung **„IRON SMS ist aktiv“** sichtbar. Der Dienst prüft neue Aufträge etwa alle 15 Sekunden, auch bei ausgeschaltetem Display und geschlossenem App-Fenster. Nach normalem Geräte-Neustart versucht er automatisch wieder zu starten.

## Installation

1. Zuerst Cloud V3.9 deployen und `GET /api/status` auf Version `3.9.0` prüfen.
2. Dieses Quellpaket über `.github/workflows/build-apk.yml` als Debug-APK bauen (Workflow führt `npm run build:mobile`, `npx cap add android`, `npx cap sync android`, `python3 scripts/patch_android.py` und Gradle aus). Alternativ dieselben Schritte lokal ausführen. Die fertige APK aus dem Actions-Artefakt installieren.
3. App öffnen, im bisherigen IRON/Appwrite-Konto anmelden, `SEND_SMS`, `READ_PHONE_STATE` und Benachrichtigungen erlauben. Im SMS-Feld bei Bedarf **HINTERGRUND AKTIVIEREN** drücken. „HINTERGRUND AKTIV“ und die permanente Android-Benachrichtigung prüfen.
4. Test-SMS an deine eigene Nummer über PC-IRON erstellen und bestätigen; dann Display sperren und einen zweiten Test machen. Normale Mobilfunk-SMS-Kosten können entstehen. Die App nicht in Android-Einstellungen **zwangsweise stoppen**. Bei aggressiven Hersteller-Energiesparregeln IRON von der Akkuoptimierung ausnehmen.

Die APK speichert keinen Appwrite-Server-Key und keinen Cloud-Relay-Mastertoken. Ein Logout in IRON stoppt den Dienst und löscht das Gerätetoken auf dem Telefon. Zur Erneuerung des auf 180 Tage begrenzten Tokens App vor Ablauf öffnen. Ohne Internet kann der Dienst keine Aufträge abrufen. Ohne Mobilfunkempfang kann er keine SMS verschicken. Ein komplett ausgeschaltetes Telefon kann das ebenfalls nicht.

Der Cloudstatus `done` bzw. `sms_sent` bedeutet, dass Android die SMS an das Mobilfunknetz übergeben hat. Eine Zustellbestätigung vom Empfänger wird nicht erfasst.

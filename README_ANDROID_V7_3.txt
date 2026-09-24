IRON Android V7.3 — SHARED IRON CLOUD

Verbindung
==========
Die Android-App und der PC verwenden jetzt denselben IRON-Cloud-Konversationskanal:

conversation_id = "main"

PC:
source = "pc"

Android:
source = "android"

Damit kann die Appwrite Function beide Geräte als denselben persönlichen IRON-Kontext behandeln,
während weiterhin erkennbar bleibt, von welchem Gerät eine Nachricht kam.

Unverändert:
- Appwrite Project: 6a9ff5910019d4b95d45
- Function Domain: https://starter-function-4j4o.fra.appwrite.run
- Tasks / Pläne / Bilder bleiben Appwrite-basiert.
- Der PC-Agent synchronisiert PC-Tasks/Pläne/Heartbeat in dieselbe Appwrite-Umgebung.

APK bauen
=========
Dieses ZIP ist das Android-Projekt. Die vorhandene GitHub-Actions-Workflow-Datei
.github/workflows/build-apk.yml kann daraus wieder die APK bauen.

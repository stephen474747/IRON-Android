IRON Android V5.4

1. Sprachbefehle für Bilder suchen ausschließlich über Appwrite /api/images/search.
   Die alte lokale Sprachsuche nach Bildern ist deaktiviert.
   Kamera/Galerie bleiben als normale Funktionen erhalten.

2. Kombinierte Plan+Einkauf-Aufträge speichern den Hauptplan und jede einzelne
   Einkaufsliste über die vorhandenen Appwrite-Funktionen und laden die Cloud-Listen neu.

3. TTS bereinigt Text vor dem Vorlesen:
   Emojis, Kommas, Doppelpunkte, Semikolons, Markdown-/Listenzeichen und URLs
   werden nicht wörtlich vorgelesen. Der eigentliche Inhalt bleibt erhalten.

Voraussetzung Bilder: Appwrite Function v2.5 Images deployed.

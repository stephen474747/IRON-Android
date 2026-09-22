IRON Android V7.2

Calendar:
- calendar.html is explicit in menu and HOME shortcuts.
- Voice/text command can create appointments through /api/calendar/parse.
- IRON schedules a day-of notification at 08:00:
  "Sir, vergessen Sie Ihren Termin nicht. Heute um HH:MM: <Titel>."
- If the appointment is created on the same day after 08:00, IRON schedules a near-immediate day reminder.
- Normal pre-event reminder remains; important appointments get extra reminders.

Simple images:
- bilder.html = simple Appwrite gallery.
- bild-viewer.html = view-only screen with Zoom In, Zoom Out, Fit, Back.
- photos.html/photo-viewer.html remain available for analysis/editing.

Requires a new APK build because native Android notification behavior was changed.
No new Appwrite Function is needed if /api/calendar/parse and image routes already work.

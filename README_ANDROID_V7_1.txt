IRON Android V7.1 — Photos + Tasks + Calendar + Notifications

New screens:
- photos.html: Appwrite photo library.
- photo-viewer.html: dedicated photo analysis/editing screen.
- task.html: Jarvis-style task screen plus quick task/reminder form.
- calendar.html: real Android calendar screen with month view, agenda and event creation.

Notifications:
- High-importance IRON Android notification channel.
- Normal calendar event: reminder at chosen time before event.
- Important event: IRON schedules multiple reminders (60 min, selected reminder, 5 min where possible).
- Important task form schedules an IRON task notification.
- Tapping an IRON notification opens the app and IRON can speak the notification text.

Voice:
- Commands such as "IRON, mach morgen um 15 Uhr einen wichtigen Termin Zahnarzt"
  use /api/calendar/parse, create the Android calendar event and schedule IRON reminders.

No new Appwrite Function is required if the currently deployed function already has POST /api/calendar/parse.
A new APK build IS required because the native Android calendar plugin was extended.

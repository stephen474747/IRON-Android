package com.iron.assistant;

import android.Manifest;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.content.pm.PackageManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.time.OffsetDateTime;
import java.time.ZoneId;

@CapacitorPlugin(
    name = "IronCalendar",
    permissions = {
        @Permission(alias = "calendar", strings = {
            Manifest.permission.READ_CALENDAR,
            Manifest.permission.WRITE_CALENDAR
        })
    }
)
public class IronCalendarPlugin extends Plugin {

    @PluginMethod
    public void createEvent(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED
            || ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("calendar", call, "calendarPermissionCallback");
            return;
        }
        insertEvent(call);
    }

    @PermissionCallback
    private void calendarPermissionCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
            && ContextCompat.checkSelfPermission(getContext(), Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            insertEvent(call);
        } else {
            call.reject("Kalender-Berechtigung wurde nicht erteilt.");
        }
    }

    private long parseIsoMillis(String value) throws Exception {
        return OffsetDateTime.parse(value).toInstant().toEpochMilli();
    }

    private Long findWritableCalendar() {
        Cursor c = null;
        try {
            String[] projection = new String[]{CalendarContract.Calendars._ID, CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL};
            c = getContext().getContentResolver().query(
                CalendarContract.Calendars.CONTENT_URI,
                projection,
                CalendarContract.Calendars.VISIBLE + "=1 AND " +
                    CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL + ">=?",
                new String[]{String.valueOf(CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR)},
                CalendarContract.Calendars._ID + " ASC"
            );
            if (c != null && c.moveToFirst()) return c.getLong(0);
        } finally {
            if (c != null) c.close();
        }
        return null;
    }

    private void insertEvent(PluginCall call) {
        try {
            Long calendarId = findWritableCalendar();
            if (calendarId == null) {
                call.reject("Kein beschreibbarer Kalender auf dem Gerät gefunden.");
                return;
            }

            String title = call.getString("title", "Termin");
            String start = call.getString("start", "");
            String end = call.getString("end", "");
            String timezone = call.getString("timezone", ZoneId.systemDefault().getId());
            if (start.isEmpty() || end.isEmpty()) {
                call.reject("Start- oder Endzeit fehlt.");
                return;
            }

            ContentValues values = new ContentValues();
            values.put(CalendarContract.Events.CALENDAR_ID, calendarId);
            values.put(CalendarContract.Events.TITLE, title);
            values.put(CalendarContract.Events.DESCRIPTION, call.getString("description", ""));
            values.put(CalendarContract.Events.EVENT_LOCATION, call.getString("location", ""));
            values.put(CalendarContract.Events.DTSTART, parseIsoMillis(start));
            values.put(CalendarContract.Events.DTEND, parseIsoMillis(end));
            values.put(CalendarContract.Events.EVENT_TIMEZONE, timezone);

            Uri eventUri = getContext().getContentResolver().insert(CalendarContract.Events.CONTENT_URI, values);
            if (eventUri == null) {
                call.reject("Termin konnte nicht gespeichert werden.");
                return;
            }

            long eventId = Long.parseLong(eventUri.getLastPathSegment());
            int reminder = call.getInt("reminderMinutes", 15);
            if (reminder >= 0) {
                ContentValues reminderValues = new ContentValues();
                reminderValues.put(CalendarContract.Reminders.EVENT_ID, eventId);
                reminderValues.put(CalendarContract.Reminders.MINUTES, reminder);
                reminderValues.put(CalendarContract.Reminders.METHOD, CalendarContract.Reminders.METHOD_ALERT);
                getContext().getContentResolver().insert(CalendarContract.Reminders.CONTENT_URI, reminderValues);
            }

            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("eventId", eventId);
            ret.put("title", title);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Kalendereintrag fehlgeschlagen: " + e.getMessage(), e);
        }
    }
}

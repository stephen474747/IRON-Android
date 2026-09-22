package com.iron.assistant;

import android.Manifest;
import android.content.ContentUris;
import android.content.ContentValues;
import android.database.Cursor;
import android.net.Uri;
import android.provider.CalendarContract;
import android.content.pm.PackageManager;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSArray;
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

    @PluginMethod
    public void listEvents(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) != PackageManager.PERMISSION_GRANTED) {
            requestPermissionForAlias("calendar", call, "calendarListPermissionCallback");
            return;
        }
        queryEvents(call);
    }

    @PermissionCallback
    private void calendarListPermissionCallback(PluginCall call) {
        if (ContextCompat.checkSelfPermission(getContext(), Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED) {
            queryEvents(call);
        } else {
            call.reject("Kalender-Berechtigung wurde nicht erteilt.");
        }
    }

    private void queryEvents(PluginCall call) {
        Cursor cursor = null;
        try {
            long now = System.currentTimeMillis();
            long start = call.getLong("start", now - 86400000L);
            long end = call.getLong("end", now + (90L * 86400000L));

            Uri.Builder builder = CalendarContract.Instances.CONTENT_URI.buildUpon();
            ContentUris.appendId(builder, start);
            ContentUris.appendId(builder, end);

            String[] projection = new String[] {
                CalendarContract.Instances.EVENT_ID,
                CalendarContract.Instances.TITLE,
                CalendarContract.Instances.BEGIN,
                CalendarContract.Instances.END,
                CalendarContract.Instances.EVENT_LOCATION,
                CalendarContract.Instances.DESCRIPTION,
                CalendarContract.Instances.ALL_DAY,
                CalendarContract.Instances.CALENDAR_DISPLAY_NAME
            };

            cursor = getContext().getContentResolver().query(
                builder.build(),
                projection,
                null,
                null,
                CalendarContract.Instances.BEGIN + " ASC"
            );

            JSArray events = new JSArray();
            if (cursor != null) {
                while (cursor.moveToNext()) {
                    JSObject item = new JSObject();
                    item.put("eventId", cursor.getLong(0));
                    item.put("title", cursor.isNull(1) ? "Termin" : cursor.getString(1));
                    item.put("start", cursor.getLong(2));
                    item.put("end", cursor.getLong(3));
                    item.put("location", cursor.isNull(4) ? "" : cursor.getString(4));
                    item.put("description", cursor.isNull(5) ? "" : cursor.getString(5));
                    item.put("allDay", cursor.getInt(6) == 1);
                    item.put("calendar", cursor.isNull(7) ? "" : cursor.getString(7));
                    events.put(item);
                }
            }

            JSObject ret = new JSObject();
            ret.put("ok", true);
            ret.put("events", events);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Kalender konnte nicht gelesen werden: " + e.getMessage(), e);
        } finally {
            if (cursor != null) cursor.close();
        }
    }

}

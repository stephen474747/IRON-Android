from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
android = root / "android"
java_dir = android / "app" / "src" / "main" / "java" / "com" / "iron" / "assistant"
java_dir.mkdir(parents=True, exist_ok=True)

src = root / "native" / "android" / "com" / "iron" / "assistant"
for name in ["MainActivity.java", "IronPhonePlugin.java", "IronCalendarPlugin.java", "IronSmsRelayService.java"]:
    shutil.copy2(src / name, java_dir / name)

manifest = android / "app" / "src" / "main" / "AndroidManifest.xml"
text = manifest.read_text(encoding="utf-8")
internet = '<uses-permission android:name="android.permission.INTERNET" />'
if internet not in text:
    text = text.replace("<application", internet + "\n    <application", 1)

contacts = '<uses-permission android:name="android.permission.READ_CONTACTS" />'
if contacts not in text:
    text = text.replace("<application", contacts + "\n    <application", 1)

perm = '<uses-permission android:name="android.permission.CALL_PHONE" />'
if perm not in text:
    text = text.replace("<application", perm + "\n    <application", 1)

notifications = '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />'
if notifications not in text:
    text = text.replace("<application", notifications + "\n    <application", 1)

calendar_read = '<uses-permission android:name="android.permission.READ_CALENDAR" />'
if calendar_read not in text:
    text = text.replace("<application", calendar_read + "\n    <application", 1)

calendar_write = '<uses-permission android:name="android.permission.WRITE_CALENDAR" />'
if calendar_write not in text:
    text = text.replace("<application", calendar_write + "\n    <application", 1)


sms = '<uses-permission android:name="android.permission.SEND_SMS" />'
if sms not in text:
    text = text.replace("<application", sms + "\n    <application", 1)

phone_state = '<uses-permission android:name="android.permission.READ_PHONE_STATE" />'
if phone_state not in text:
    text = text.replace("<application", phone_state + "\n    <application", 1)


phone_numbers = '<uses-permission android:name="android.permission.READ_PHONE_NUMBERS" />'
if phone_numbers not in text:
    text = text.replace("<application", phone_numbers + "\n    <application", 1)

foreground = '<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />'
if foreground not in text:
    text = text.replace("<application", foreground + "\n    <application", 1)

foreground_data = '<uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC" />'
if foreground_data not in text:
    text = text.replace("<application", foreground_data + "\n    <application", 1)

service_decl = '<service android:name=".IronSmsRelayService" android:enabled="true" android:exported="false" android:foregroundServiceType="dataSync" />'
if '.IronSmsRelayService' not in text:
    text = text.replace("</application>", "        " + service_decl + "\n    </application>", 1)


manifest.write_text(text, encoding="utf-8")
print("IRON Android native patch applied.")

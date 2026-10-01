from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
android = root / "android"
java_dir = android / "app" / "src" / "main" / "java" / "com" / "iron" / "assistant"
java_dir.mkdir(parents=True, exist_ok=True)

src = root / "native" / "android" / "com" / "iron" / "assistant"
for name in ["MainActivity.java", "IronPhonePlugin.java", "IronCalendarPlugin.java",
             "IronSmsRelayService.java", "IronSmsCommandReceiver.java", "IronSmsSentReceiver.java", "IronSmsBootReceiver.java"]:
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

for permission in ("android.permission.FOREGROUND_SERVICE",
                   "android.permission.FOREGROUND_SERVICE_REMOTE_MESSAGING",
                   "android.permission.RECEIVE_BOOT_COMPLETED"):
    line = f'<uses-permission android:name="{permission}" />'
    if line not in text:
        text = text.replace("<application", line + "\n    <application", 1)

services = '''<service android:name=".IronSmsRelayService"
            android:exported="false" android:foregroundServiceType="remoteMessaging" />
        <receiver android:name=".IronSmsSentReceiver" android:exported="false" />
        <receiver android:name=".IronSmsBootReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
            </intent-filter>
        </receiver>'''
if 'android:name=".IronSmsRelayService"' not in text:
    text = text.replace("</application>", services + "\n    </application>", 1)

manifest.write_text(text, encoding="utf-8")
print("IRON Android native patch applied.")

text=manifest.read_text(encoding="utf-8")
permission='<uses-permission android:name="android.permission.RECEIVE_SMS" />'
if permission not in text:text=text.replace("<application",permission+"\n<application",1)
receiver='''<receiver android:name=".IronSmsCommandReceiver" android:exported="true" android:permission="android.permission.BROADCAST_SMS"><intent-filter><action android:name="android.provider.Telephony.SMS_RECEIVED" /></intent-filter></receiver>'''
if 'android:name=".IronSmsCommandReceiver"' not in text:text=text.replace("</application>",receiver+"\n</application>",1)
manifest.write_text(text,encoding="utf-8")

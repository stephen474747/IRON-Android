from pathlib import Path
import shutil
import xml.etree.ElementTree as ET

root = Path(__file__).resolve().parents[1]
android = root / "android"
java_dir = android / "app" / "src" / "main" / "java" / "com" / "iron" / "assistant"
java_dir.mkdir(parents=True, exist_ok=True)

src = root / "native" / "android" / "com" / "iron" / "assistant"
for name in ["MainActivity.java", "IronPhonePlugin.java"]:
    shutil.copy2(src / name, java_dir / name)

manifest = android / "app" / "src" / "main" / "AndroidManifest.xml"
text = manifest.read_text(encoding="utf-8")
internet = '<uses-permission android:name="android.permission.INTERNET" />'
if internet not in text:
    text = text.replace("<application", internet + "\n    <application", 1)

perm = '<uses-permission android:name="android.permission.CALL_PHONE" />'
if perm not in text:
    text = text.replace("<application", perm + "\\n    <application", 1)
manifest.write_text(text, encoding="utf-8")
print("IRON Android native patch applied.")

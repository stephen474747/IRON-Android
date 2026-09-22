IRON Android V6 Core Integration

Included:
1. Cloud voice fix:
   - Correct CLOUD_BASE variable.
   - Removed Xiaomi/Android TextToSpeech dependency.
   - IRON answer remains as HUD text and the same answer is played through /api/tts.
   - Conversation mode waits until IRON finishes speaking.

2. Web researched Plan + Einkaufsliste:
   - Combined requests call /api/research-plan.
   - Function uses Anthropic web search.
   - Main plan stored in Appwrite plans with typ=plan.
   - Every separate shopping/material list stored in Appwrite plans with typ=einkauf.
   - plans.html and einkaufsliste.html reload from Appwrite.

3. Calendar:
   - Native IronCalendar plugin.
   - Voice commands such as "Mach mir morgen um 15 Uhr einen Termin Zahnarzt".
   - /api/calendar/parse resolves natural German dates.
   - Event is inserted into the Android calendar with a reminder.

4. Gmail:
   - Reads last 20 inbox mails after the user connects Gmail.
   - "IRON, fasse meine wichtigsten Mails zusammen" summarizes important ones.
   - Important unread mails can trigger local notifications while the app is active/resumed.
   - True always-on background mail push still requires FCM/Appwrite Messaging + durable server Gmail authorization.

5. News:
   - /api/news/important uses live web research and returns only major world topics.

6. Images:
   - Appwrite cloud search remains.
   - Image studio: zoom, rotate, brightness, contrast, describe with IRON Vision,
     edit name/description, save edited copy back to Appwrite.

7. Memory:
   - Appwrite row pagination fixes the old 25-row limitation.
   - Older-message retrieval is used when the user asks about previous conversations.

Required Function:
IRON Unified Appwrite Function V3.0 Core

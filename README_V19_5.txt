IRON Web v19.5

FIX:
- cloud.createRow -> cloud.create
- cloud.listRows -> cloud.list
- cloud.deleteRow -> cloud.remove
- plans.html and einkaufsliste.html read the returned Appwrite row array correctly.

GMAIL:
- Google OAuth Client ID is configured in the browser app.
- Scope is READ ONLY:
  https://www.googleapis.com/auth/gmail.readonly
- IRON can load recent inbox messages after Google consent.
- IRON cannot send, delete, archive, or modify mail.

GOOGLE CLOUD SETUP REQUIRED:
1. Enable Gmail API.
2. Google Auth Platform -> Audience:
   If External/testing, add your Gmail account as a Test User.
3. Google Auth Platform -> Clients -> your Web client:
   Add the exact GitHub Pages origin under Authorized JavaScript origins.
   Example format:
   https://USERNAME.github.io
   (use your actual site origin)
4. Data Access / OAuth scopes: gmail.readonly.
5. No Client Secret is required in the browser and none should be uploaded to GitHub.

TEST:
- "Iron, erstelle mir eine Einkaufsliste mit allem was ich für Waffeln brauche"
- Open einkaufsliste.html: it should be persisted from Appwrite.
- Open plans.html for regular plans.

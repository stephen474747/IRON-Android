IRON shopping display fix

The web page now shows a shopping row when either:
- typ == einkauf
OR
- name starts with EINKAUF //

So both old and new Appwrite rows are supported.

Required plans columns:
name       Varchar/Text
inhalt     Text
erstellt   Datetime
typ        Varchar(20), optional while migrating

After upload to GitHub: Ctrl+F5.

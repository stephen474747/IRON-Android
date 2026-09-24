from pathlib import Path
import re, sys
app=Path("www/app.js").read_text(encoding="utf-8")
routes=sorted(set(re.findall(r'["\'`](\/api\/[A-Za-z0-9_?&=\/\-.]+)',app)))
print("Client API references:")
for r in routes: print(" -",r)
required={"/api/news/important","/api/images/list","/api/images/get?id=","/api/research-plan"}
missing=[r for r in required if r not in routes]
if missing:
    print("Missing client references:",missing); sys.exit(1)
print("Route reference audit OK")

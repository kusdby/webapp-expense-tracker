import http.cookiejar
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB = ROOT / "data" / "dev-smoke-auth.db"
DB.unlink(missing_ok=True)

env = os.environ.copy()
env.update({"PORT": "8098", "ADMIN_USERNAME": "kusdby", "ADMIN_NAME": "Kusdby", "ADMIN_PASSWORD": "maskus123", "FINANCE_DB": str(DB)})
proc = subprocess.Popen([sys.executable, "-m", "app.server"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
try:
    for _ in range(30):
        try:
            urllib.request.urlopen("http://127.0.0.1:8098/", timeout=1).read()
            break
        except Exception:
            time.sleep(0.2)
    else:
        raise RuntimeError("server did not start")

    try:
        urllib.request.urlopen("http://127.0.0.1:8098/api/summary", timeout=2).read()
        raise AssertionError("summary should require login")
    except urllib.error.HTTPError as exc:
        assert exc.code == 401, exc.code

    jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
    req = urllib.request.Request(
        "http://127.0.0.1:8098/api/login",
        data=json.dumps({"username": "kusdby", "password": "maskus123"}).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    opener.open(req, timeout=2).read()
    summary = json.loads(opener.open("http://127.0.0.1:8098/api/summary", timeout=2).read())
    assert summary["reset_day"] == 25
    assert summary["total_balance"] == 3_475_000
    assert len(summary["accounts"]) == 3
    print("smoke ok", summary["total_balance"], summary["reset_day"], len(summary["accounts"]))
finally:
    proc.terminate()
    try:
        proc.wait(timeout=5)
    except subprocess.TimeoutExpired:
        proc.kill()

"""Scan indexed text files offline; download only a checksum-verified scanner binary."""
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import subprocess
import tarfile
import tempfile
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]
VERSION = "8.30.1"
WORK = ROOT / ".wrangler"
WORK.mkdir(exist_ok=True)
windows = platform.system() == "Windows"
binary = WORK / "security-tools" / ("gitleaks.exe" if windows else "gitleaks")
binary.parent.mkdir(exist_ok=True)
asset = f"gitleaks_{VERSION}_{'windows' if windows else 'linux'}_x64.{ 'zip' if windows else 'tar.gz'}"
base = f"https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/"
if not binary.exists():
    data = urllib.request.urlopen(base + asset).read()
    checksums = urllib.request.urlopen(base + f"gitleaks_{VERSION}_checksums.txt").read().decode()
    expected = next(line.split()[0] for line in checksums.splitlines() if line.endswith(asset))
    if hashlib.sha256(data).hexdigest() != expected:
        raise RuntimeError("Scanner checksum mismatch")
    if windows:
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            binary.write_bytes(archive.read("gitleaks.exe"))
    else:
        with tarfile.open(fileobj=io.BytesIO(data), mode="r:gz") as archive:
            binary.write_bytes(archive.extractfile("gitleaks").read())
        binary.chmod(0o700)
report = WORK / "secret-scan.json"
with tempfile.TemporaryDirectory(prefix="secret-scan-", dir=WORK) as temporary:
    snapshot = Path(temporary)
    for name in subprocess.check_output(["git", "ls-files", "-z"], cwd=ROOT).split(b"\0"):
        if not name:
            continue
        relative = Path(os.fsdecode(name))
        source = ROOT / relative
        if not source.is_file() or source.stat().st_size > 5_000_000:
            continue
        data = source.read_bytes()
        if b"\0" in data[:8192]:
            continue
        target = snapshot / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
    scan = subprocess.run([str(binary), "dir", str(snapshot), "--config", str(ROOT / ".gitleaks.toml"),
        "--redact=100", "--report-format=json", "--report-path=" + str(report), "--no-banner", "--no-color"], cwd=ROOT)
findings = json.loads(report.read_text()) if report.exists() else []
print(json.dumps({"scanner": "Gitleaks " + VERSION, "findings": len(findings)}))
raise SystemExit(scan.returncode)

"""Check native .fig ZIP contents without decoding the proprietary canvas format."""

import hashlib
import json
from pathlib import Path
import zipfile

run = Path(__file__).resolve().parents[1] / "research/2026-10-15/replication-01"
metadata = json.loads((run / "metadata.json").read_text())
for profile, record in metadata["files"].items():
    filename = run / record["localFile"]
    raw = filename.read_bytes()
    assert len(raw) == record["bytes"], filename
    assert hashlib.sha256(raw).hexdigest() == record["sha256"], filename
    with zipfile.ZipFile(filename) as archive:
        assert archive.testzip() is None, filename
        assert {"canvas.fig", "thumbnail.png", "meta.json"}.issubset(archive.namelist())
        entries = [
            {"name": info.filename, "bytes": info.file_size, "crc32": format(info.CRC, "08x")}
            for info in archive.infolist()
        ]
        assert entries == record["zipMembers"], filename
        actual = json.loads(archive.read("meta.json"))
        assert actual["file_name"] == record["fileName"]
        assert actual["exported_at"] == record["exportedAt"]
        assert archive.read("thumbnail.png") == (run / "figma" / f"{profile}-thumbnail.png").read_bytes()
    print(f"Archive consistency: {filename.name}; ZIP entries, CRC, SHA-256 and export metadata match.")
print("This checks native export containers; it neither decodes canvas.fig nor reimports the files into Figma.")

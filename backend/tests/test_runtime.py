from pathlib import Path
from threading import Thread
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.request import urlopen
import pytest
from desktop.paths import resolve_paths
from desktop.launcher import launch

def test_data_outside_frozen_resources(tmp_path, monkeypatch):
    import sys
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(tmp_path / "bundle"), raising=False)
    paths = resolve_paths(tmp_path / "persist")
    assert not paths.data_root.is_relative_to(paths.resource_root)
    assert paths.database_path.parent == paths.data_root

def test_same_directory_preserves_secret(tmp_path):
    first = resolve_paths(tmp_path)
    secret = first.secret_path.read_text()
    assert len(secret) >= 50
    assert resolve_paths(tmp_path).secret_path.read_text() == secret

def test_foreign_port_not_terminated(tmp_path):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200); self.end_headers(); self.wfile.write(b"foreign")
        def log_message(self, *args):
            pass
    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True); thread.start()
    try:
        assert launch(tmp_path, port=server.server_port, open_browser=False) != 0
        assert urlopen(f"http://127.0.0.1:{server.server_port}").read() == b"foreign"
    finally:
        server.shutdown(); server.server_close(); thread.join()

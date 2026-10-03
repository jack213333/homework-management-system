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
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b"foreign")

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        assert launch(tmp_path, port=server.server_port, open_browser=False) != 0
        assert urlopen(f"http://127.0.0.1:{server.server_port}").read() == b"foreign"
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def test_installer_remembers_chinese_data_path(tmp_path, monkeypatch):
    import sys

    install = tmp_path / "课序 程序"
    install.mkdir()
    target = tmp_path / "课程 作业数据"
    (install / "data-dir.txt").write_text(str(target), encoding="utf-8-sig")
    monkeypatch.setattr(sys, "frozen", True, raising=False)
    monkeypatch.setattr(sys, "_MEIPASS", str(install / "_internal"), raising=False)
    monkeypatch.setattr(sys, "executable", str(install / "HomeworkManager.exe"))
    monkeypatch.delenv("HOMEWORK_DATA_DIR", raising=False)
    assert resolve_paths().data_root == target.resolve()
    assert (
        resolve_paths(target).secret_path.read_text()
        == resolve_paths().secret_path.read_text()
    )


def test_relaunch_reuses_owned_server(tmp_path):
    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"app":"homework-management-system","status":"ok"}')

        def log_message(self, *args):
            pass

    server = HTTPServer(("127.0.0.1", 0), Handler)
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        assert launch(tmp_path, server.server_port, False) == 0
        assert (
            urlopen(f"http://127.0.0.1:{server.server_port}/api/health").status == 200
        )
    finally:
        server.shutdown()
        server.server_close()
        thread.join()


def test_unknown_api_not_spa(client):
    response = client.get("/api/not-found")
    assert response.status_code == 404
    assert response["Content-Type"].startswith("application/json")

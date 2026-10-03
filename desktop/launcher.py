import argparse
import json
import os
from pathlib import Path
import socket
import sys
from threading import Thread
from urllib.request import urlopen
import webbrowser

from desktop.paths import resolve_paths

def launch(data_dir: Path | None = None, port: int = 8765, open_browser: bool = True) -> int:
    paths = resolve_paths(data_dir)
    # Windowed PyInstaller executables have no stdout/stderr. Keep diagnostics
    # in the persistent data directory so startup errors remain inspectable.
    if sys.stdout is None or sys.stderr is None:
        log = (paths.data_root / "startup.log").open("a", encoding="utf-8")
        if sys.stdout is None: sys.stdout = log
        if sys.stderr is None: sys.stderr = log
    url = f"http://127.0.0.1:{port}"
    # Inspect occupied ports; never terminate an unrelated process.
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", port)) == 0:
            try:
                with urlopen(url + "/api/health", timeout=2) as response:
                    known = json.load(response).get("app") == "homework-management-system"
            except Exception:
                known = False
            if known:
                if open_browser:
                    webbrowser.open(url)
                return 0
            print(f"端口 {port} 已被其他程序占用，请改用 --port。", file=sys.stderr)
            return 2
    os.environ["HOMEWORK_DATA_DIR"] = str(paths.data_root)
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    sys.path.insert(0, str(paths.resource_root / "backend"))
    import django
    django.setup()
    from django.core.management import call_command
    from django.core.wsgi import get_wsgi_application
    from waitress import create_server
    call_command("migrate", interactive=False, verbosity=0)
    # Seed is idempotent, and never resets an existing user's password.
    from django.core.management import get_commands
    if "seed_demo" in get_commands():
        call_command("seed_demo", verbosity=0)
    server = create_server(get_wsgi_application(), host="127.0.0.1", port=port, threads=4)
    if not open_browser:
        try:
            server.run()
        except KeyboardInterrupt:
            pass
        finally:
            server.close()
        return 0
    worker = Thread(target=server.run, daemon=True)
    worker.start()
    webbrowser.open(url)
    import tkinter as tk
    from tkinter import ttk
    root = tk.Tk()
    root.title("电子作业管理系统 · 本机服务")
    root.geometry("430x190")
    root.resizable(False, False)
    ttk.Label(root, text="电子作业管理系统已启动", font=("Microsoft YaHei UI", 14)).pack(pady=(25, 12))
    ttk.Label(root, text=url).pack()
    ttk.Button(root, text="打开工作台", command=lambda: webbrowser.open(url)).pack(pady=12)
    ttk.Label(root, text="关闭此窗口将退出本机服务。", foreground="#48617D").pack()
    def stop():
        server.close()
        server.task_dispatcher.shutdown()
        root.destroy()
    root.protocol("WM_DELETE_WINDOW", stop)
    root.mainloop()
    return 0

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data-dir", type=Path)
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    return launch(args.data_dir, args.port, not args.no_browser)

if __name__ == "__main__":
    raise SystemExit(main())

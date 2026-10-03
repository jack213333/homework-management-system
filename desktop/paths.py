from dataclasses import dataclass
from pathlib import Path
import os
import sys
import secrets


@dataclass(frozen=True)
class RuntimePaths:
    resource_root: Path
    data_root: Path
    database_path: Path
    uploads_root: Path
    frontend_dist: Path
    secret_path: Path


def resolve_paths(data_dir: Path | None = None) -> RuntimePaths:
    frozen = getattr(sys, "frozen", False)
    root = Path(sys._MEIPASS) if frozen else Path(__file__).resolve().parents[1]
    if data_dir is None:
        default = (
            (
                Path("D:/homework-data")
                if Path("D:/").exists()
                else Path(os.environ.get("LOCALAPPDATA", str(Path.home())))
                / "HomeworkManager"
            )
            if frozen
            else root / "data"
        )
        configuration = Path(sys.executable).parent / "data-dir.txt" if frozen else None
        configured = (
            configuration.read_text(encoding="utf-8-sig").strip()
            if configuration and configuration.exists()
            else str(default)
        )
        data_dir = Path(os.environ.get("HOMEWORK_DATA_DIR", configured))
    data_dir = data_dir.resolve()
    data_dir.mkdir(parents=True, exist_ok=True)
    uploads = data_dir / "uploads"
    uploads.mkdir(exist_ok=True)
    secret = data_dir / "secret.key"
    try:
        with secret.open("x", encoding="utf-8") as handle:
            handle.write(secrets.token_urlsafe(64))
    except FileExistsError:
        pass
    return RuntimePaths(
        root,
        data_dir,
        data_dir / "homework.sqlite3",
        uploads,
        root / "frontend" / "dist",
        secret,
    )

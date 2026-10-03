# 课序 · 电子作业管理系统

Windows 单机电子作业管理实训。Python 3.12 / Django 5.2 / React / SQLite。

当前正在实现。运行需要先安装项目依赖并构建前端：

```powershell
uv sync --python 3.12
npm.cmd --prefix frontend ci
npm.cmd --prefix frontend run build
.\.venv\Scripts\python.exe -m desktop.launcher
```

浏览器地址 http://127.0.0.1:8765，关闭服务控制窗口退出。开发数据默认保存 `data/`，可用 `HOMEWORK_DATA_DIR` 或 `--data-dir` 指定。运行数据不进入 Git。

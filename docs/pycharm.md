# 在 PyCharm 中打开和运行课序

## 当前电脑直接使用已有项目

1. 在 PyCharm 欢迎页点击 Open（打开）；已打开其他项目时使用 File → Open。选择整个 `D:\codex\homework-management-system` 文件夹。
2. 打开 Settings（设置，Ctrl+Alt+S），搜索 Python Interpreter（Python 解释器）。选择已有解释器，路径为 `D:\codex\homework-management-system\.venv\Scripts\python.exe`。
3. 打开 PyCharm 底部 Terminal（终端），确认当前目录是项目根目录。第一次运行前或改过前端时执行 `./scripts/build.ps1`，成功后运行下面的命令。

```powershell
.\.venv\Scripts\python.exe -m desktop.launcher --port 8768 --data-dir .\data\pycharm
```

本命令会创建独立的开发数据目录，自动迁移数据库、初始化虚构样例并打开浏览器。工作台地址为 `http://127.0.0.1:8768/`。首次演示账号可使用 `admin`、`teacher`、`student01`，初始密码均为 `DemoPass123!`。保留本机服务控制窗口；关闭该窗口才退出服务。

当前电脑的依赖和构建资源已准备好，不需要重新创建虚拟环境。若 PyCharm 终端提示找不到 npm，可先执行下面的命令，再运行构建脚本；此命令只调整当前终端的 PATH。

```powershell
$env:Path='D:\Program Files\nodejs;'+$env:Path
./scripts/build.ps1
```

## 配置绿色运行按钮

在 Run → Edit Configurations（运行 → 编辑配置）中新增 Python 配置：

| 设置项 | 填写内容 |
| --- | --- |
| Name（名称） | 课序开发运行 |
| Run target（运行目标） | 选择 Module name（模块名） |
| Module name（模块名） | desktop.launcher |
| Parameters（参数） | --port 8768 --data-dir ./data/pycharm |
| Working directory（工作目录） | D:\codex\homework-management-system |
| Python interpreter（解释器） | 项目中的 .venv\Scripts\python.exe |

点击 Apply、OK 后，选择该配置并点击绿色运行按钮。用模块方式运行启动器可以保持包导入关系，并完成迁移、样例初始化和本机服务启动。

## 代码位置和前端修改

`backend` 保存 Python 接口与业务逻辑，`frontend/src` 保存 React 页面，`desktop` 保存桌面启动器，`packaging` 保存 Windows 安装脚本。数据库和上传原件保存在独立数据目录。

修改 React 页面后，重新运行 `./scripts/build.ps1` 并刷新浏览器。修改 Python 逻辑后，关闭本机服务窗口，再重新运行启动器。

如果要使用前端热更新，先让后端运行在默认8765端口，再另开终端执行 `npm.cmd --prefix frontend run dev`。Vite 默认代理到8765，请以终端显示的前端地址访问页面；使用8768的上述完整系统运行方式时，采用构建后刷新即可。

## 其他电脑或仅解压源码的情况

源码压缩包不包含虚拟环境和 node_modules。需要先安装 Python 3.12、uv 和 Node.js 22.12及以上版本，并在项目根目录执行：

```powershell
uv sync --locked --python 3.12
npm.cmd --prefix frontend ci
./scripts/build.ps1
```

然后将 PyCharm 解释器指向解压位置下的 `.venv\Scripts\python.exe`，按前面的模块名启动。GitHub 克隆方式见项目 README。

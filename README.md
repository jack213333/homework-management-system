# 课序 · 电子作业管理系统

Windows 单机电子作业管理实训。Python 3.12 / Django 5.2 / React / SQLite。

面向 Windows 桌面浏览器与单机答辩。管理员管理账号和课程；教师发布作业、批改、发布成绩、查看报告与代码相似片段；学生提交多附件并保留版本。全部业务、字体、图标和动画组件在本机运行，不需要模型 API 或联网服务。

## 使用安装包

运行单独交付的 `Setup.exe`，分别选择程序目录与数据目录。默认优先使用 D 盘。安装后打开“课序”，浏览器进入 <http://127.0.0.1:8765>；关闭“本机服务”控制窗口退出。程序资源与作业数据分开保存，卸载程序保留数据库和附件。

第一次启动创建虚构演示数据，演示密码均为 `DemoPass123!`：

| 账号 | 角色 | 用途 |
| --- | --- | --- |
| admin | 管理员 | 账号、角色、课程和选课维护 |
| teacher | 教师 | 软件设计综合实训、Python 程序设计 |
| teacher2 | 教师 | 演示不同教师的数据范围 |
| student01–student04 | 学生 | 提交、版本、已发布成绩 |

所有姓名与作业样例均为虚构。默认人物照片和课程书图为生成的虚构素材，并随程序保存在本机。管理员可修改账号资料、重置密码和停用账号。只在空用户数据库初始化演示内容并保存完成标记；旧数据库没有标记时保留已有业务数据。重启不会恢复已删除选课、重新创建改名课程或作业，也不会重置已有密码。手动 seed_demo 同样跳过已有用户数据库。

## 从源码运行

需要 Git、Python 3.12、uv、Node.js 22.12+。在 PowerShell 中执行：

```powershell
git clone https://github.com/jack213333/homework-management-system.git
cd homework-management-system
uv sync --locked --python 3.12
npm.cmd --prefix frontend ci
./scripts/build.ps1
.\.venv\Scripts\python.exe -m desktop.launcher
```

源码运行的数据默认保存 `data/`，可用 `HOMEWORK_DATA_DIR` 或 `--data-dir` 指定。安装版读取程序旁的 `data-dir.txt`，参数优先级为命令行、环境变量、安装配置、默认目录。备份前先关闭服务，再完整复制数据目录（数据库、uploads、secret.key 一起保留）。运行数据不进入 Git。

只启动后台服务或更换端口：

```powershell
.\.venv\Scripts\python.exe -m desktop.launcher --no-browser --port 8768 --data-dir 'D:/homework-data'
```

如果端口已运行本项目，重新打开程序会复用服务；如果端口属于其他程序，返回错误而不终止其他程序。`--no-browser` 模式用 Ctrl+C 退出。

开发时先启动后端，再另开终端执行 `npm.cmd --prefix frontend run dev`。Vite 默认代理到 8765。

## 文件和相似检测

报告支持 DOCX、含文字层 PDF、TXT；代码支持 PY、JAVA。每个附件最多 20 MiB、每次提交最多 50 MiB、20 个附件。损坏或扫描文件保留原件并显示提取状态，扫描 PDF 不会被当作“0% 相似”的正常结果。

离线算法比较同一作业中不同学生的最新提交：SHA-256 后核验原件字节、报告字符规范化、代码词元过滤注释与空白、确定性 Winnowing、公共模板指纹排除和原文位置映射。双方有效指纹覆盖率仅供定位线索，不等于作弊概率或全文抄袭比例。变量重命名、语义改写、OCR、跨语言比较和互联网论文库检索未实现。单次同步检测限制 160 个附件、400 万提取字符。

## 验证与打包

```powershell
.\.venv\Scripts\python.exe -m pytest backend/tests -q
./scripts/build.ps1
npm.cmd --prefix frontend run test:e2e
./scripts/package.ps1 -Compiler 'D:/Tools/Inno Setup 6/ISCC.exe'
```

浏览器测试需要 Chromium。`CHROMIUM_EXECUTABLE` 可指定自己的 Chromium/Chrome 可执行文件；此工作区默认路径见 `frontend/playwright.config.ts`。如果本机没有浏览器，可先在项目内执行 `npm.cmd --prefix frontend exec -- playwright install chromium`，再把环境变量指向该浏览器可执行文件。浏览器测试使用独立虚构数据目录，不使用私人作业。打包还需要 Inno Setup 6。安装包输出为 `artifacts/Setup.exe`，不提交到源码仓库。

实测结果和验证范围见 [测试说明](docs/testing.md)。当前机器的安装验证不能替代一台未装开发环境的干净 Windows 电脑验证。

## 代码阅读

| 目录 | 内容 |
| --- | --- |
| backend/accounts、classroom | 用户、角色、课程、选课和审计 |
| backend/assignments | 作业、提交、附件、评分和统计 |
| backend/plagiarism | 提取、指纹、比较、任务快照与复核 |
| frontend/src/features | 三角色真实业务页面 |
| desktop | 数据路径、迁移、初始化与服务控制 |
| packaging、scripts | Windows 安装包和开发工具 |

项目由小组成员共同协作开发，源代码采用 [MIT](LICENSE)。实际使用的 shadcn/ui Dialog 与 21st.dev 收录的 Motion Primitives Animated Background 保留来源和许可，见 [第三方说明](THIRD_PARTY_NOTICES.md)。开发说明和答辩资料以实际代码和测试结果为依据。

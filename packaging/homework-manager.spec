from pathlib import Path
from PyInstaller.utils.hooks import collect_submodules, collect_data_files
root = Path(SPECPATH).parent
hidden = sum((collect_submodules(name) for name in ['django','rest_framework','whitenoise','waitress','config','accounts','classroom','common','assignments','plagiarism','docx','pypdf','pygments']), [])
a = Analysis([str(root/'desktop'/'entry.py')], pathex=[str(root),str(root/'backend')], binaries=[], datas=[(str(root/'frontend'/'dist'),'frontend/dist'), (str(root/'backend'),'backend')] + collect_data_files('django') + collect_data_files('rest_framework'), hiddenimports=hidden, hookspath=[], runtime_hooks=[], excludes=['pytest'])
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='HomeworkManager', debug=False, bootloader_ignore_signals=False, strip=False, upx=False, console=False)
coll = COLLECT(exe,a.binaries,a.datas,strip=False,upx=False,name='HomeworkManager')

from pathlib import Path
from zipfile import ZipFile
from .types import ExtractionResult

MAX_TEXT = 500_000

def extract_file(path: Path, kind: str, language: str | None = None) -> ExtractionResult:
    parts=[];locations=[];offset=0;note=[];status="ready"
    def append(text, **location):
        nonlocal offset
        if not text.strip():return
        text=text[:max(0,MAX_TEXT-offset)]
        if not text:return
        parts.append(text);locations.append({"start":offset,"end":offset+len(text),**location});offset+=len(text)+1
    try:
        suffix=path.suffix.lower()
        if suffix==".docx":
            with ZipFile(path) as archive:
                if len(archive.infolist())>10000 or sum(i.file_size for i in archive.infolist())>50*1024*1024:
                    return ExtractionResult("failed",note="DOCX 解压后超出解析上限")
            from docx import Document
            from docx.text.paragraph import Paragraph
            from docx.table import Table
            document=Document(path)
            counter=0
            def visit(element,parent):
                nonlocal counter
                for child in element:
                    if child.tag.endswith("}p"):
                        counter+=1;append(Paragraph(child,parent).text,paragraph=counter,label=f"段落 {counter}")
                    elif child.tag.endswith("}tbl"):
                        table=Table(child,parent);seen=set()
                        for row in table.rows:
                            for cell in row.cells:
                                if cell._tc in seen:continue
                                seen.add(cell._tc);visit(cell._tc,cell)
            visit(document.element.body,document)
            note.append("检测正文与表格文字；不检测图片和公式")
        elif suffix==".pdf":
            from pypdf import PdfReader
            reader=PdfReader(path)
            if reader.is_encrypted:return ExtractionResult("failed",note="加密 PDF 无法解析，请提供未加密版本")
            missing=[]
            for index,page in enumerate(reader.pages[:300]):
                text=page.extract_text() or ""
                if not text.strip():missing.append(index+1)
                else:append(text,page=index+1,label=f"第 {index+1} 页")
            if missing:note.append("未能提取文字的页："+", ".join(map(str,missing)))
            if len(reader.pages)>300:note.append("仅解析前 300 页");status="partial"
            if missing:status="partial" if parts else "unsupported"
        else:
            raw=path.read_bytes()
            if b"\x00" in raw:return ExtractionResult("failed",note="文件含二进制内容，无法作为文本解析")
            try:text=raw.decode("utf-8-sig")
            except UnicodeDecodeError:
                text=raw.decode("gb18030");note.append("使用 GB18030 解码")
            for index,line in enumerate(text.splitlines()):
                # Preserve blank lines and original code offsets too.
                bounded=line[:max(0,MAX_TEXT-offset)]
                parts.append(bounded);locations.append({"start":offset,"end":offset+len(bounded),"line":index+1,"label":f"第 {index+1} 行"});offset+=len(bounded)+1
                if offset>=MAX_TEXT:break
        text="\n".join(parts)
        if not text.strip():return ExtractionResult("unsupported",note="未提取到可检测文字；请人工检查原件")
        if offset>=MAX_TEXT:status="partial";note.append("文字量超过 50 万字符，仅检测已提取部分")
        return ExtractionResult(status,text,locations,"；".join(note))
    except Exception as exc:
        return ExtractionResult("failed",note=f"文件解析失败（{type(exc).__name__}），请人工检查原件")

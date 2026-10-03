from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
import hashlib
from django.conf import settings
from .normalization import normalize_report,tokenize_code
from .fingerprints import winnow
from .types import PairResult

DEFAULT_PARAMETERS={'report':{'k':20,'w':10},'code':{'k':12,'w':8},'screening_threshold':0.8}
@dataclass
class PreparedFile:
    content:object
    fingerprints:list
    identities:dict
    actual_hash:str|None
    integrity:bool

def prepare_file(file,templates,parameters):
    content=tokenize_code(file.extracted_text,file.language) if file.kind=='code' else normalize_report(file.extracted_text,file.locations)
    spec=parameters[file.kind];fingerprints=winnow(content.units,**spec)
    # Verify normalized k-grams as well as digest equality, including template exclusions.
    excluded=set()
    for template in templates:
        if template.kind!=file.kind or (file.kind=='code' and template.language!=file.language):continue
        data=tokenize_code(template.extracted_text,template.language) if file.kind=='code' else normalize_report(template.extracted_text,template.locations)
        for fp in winnow(data.units,**spec):excluded.add((fp.digest,tuple(data.units[fp.unit_start:fp.unit_end])))
    identities=defaultdict(list)
    for fp in fingerprints:
        identity=(fp.digest,tuple(content.units[fp.unit_start:fp.unit_end]))
        if identity not in excluded:identities[identity].append(fp)
    path=Path(settings.MEDIA_ROOT)/file.storage_key
    actual_hash=None
    try:
        with path.open('rb') as stream:
            digest=hashlib.file_digest(stream,'sha256').hexdigest()
        actual_hash=digest
    except OSError:pass
    return PreparedFile(content,fingerprints,dict(identities),actual_hash,actual_hash==file.sha256)

def _equal_bytes(a,b):
    try:
        with (Path(settings.MEDIA_ROOT)/a.storage_key).open('rb') as left,(Path(settings.MEDIA_ROOT)/b.storage_key).open('rb') as right:
            while True:
                chunk=left.read(65536)
                if chunk!=right.read(65536):return False
                if not chunk:return True
    except OSError:return False

def _label(file,start,end):
    labels=[loc.get('label','') for loc in file.locations if loc['end']>start and loc['start']<end]
    return ' — '.join(dict.fromkeys([labels[0],labels[-1]])) if labels else f"第 {file.extracted_text.count(chr(10),0,start)+1} 行"

def compare_files(a,b,templates,parameters,prepared=None) -> PairResult|None:
    if a.kind!=b.kind or (a.kind=='code' and a.language!=b.language):return None
    result=PairResult(a.kind)
    pa,pb=prepared if prepared else (prepare_file(a,templates,parameters),prepare_file(b,templates,parameters))
    if not pa.integrity or not pb.integrity:
        result.note='原件缺失或校验不一致，请检查数据备份；不生成覆盖率';return result
    result.exact_duplicate=a.sha256==b.sha256 and _equal_bytes(a,b)
    if a.extraction_status not in ('ready','partial') or b.extraction_status not in ('ready','partial'):
        result.note='至少一侧无法提取可检测文字，请下载原件人工检查';return result
    if not pa.identities or not pb.identities:
        result.note='有效内容不足，或指纹已由公共模板排除；覆盖率不可用';return result
    common=pa.identities.keys() & pb.identities.keys()
    result.coverage_a=len(common)/len(pa.identities);result.coverage_b=len(common)/len(pb.identities)
    spans=[]
    for identity in sorted(common):
        # Bound repeated-text Cartesian products; coverage still uses all distinct identities.
        for fa in pa.identities[identity][:8]:
            for fb in pb.identities[identity][:8]:spans.append((fa.unit_start,fa.unit_end,fb.unit_start,fb.unit_end))
    spans.sort();merged=[]
    for sa,ea,sb,eb in spans:
        if merged and sa<=merged[-1][1] and sb<=merged[-1][3] and sb-sa==merged[-1][2]-merged[-1][0]:
            merged[-1][1]=max(merged[-1][1],ea);merged[-1][3]=max(merged[-1][3],eb)
        else:merged.append([sa,ea,sb,eb])
    for sa,ea,sb,eb in merged[:200]:
        a_start,a_end=pa.content.raw_spans[sa][0],pa.content.raw_spans[ea-1][1]
        b_start,b_end=pb.content.raw_spans[sb][0],pb.content.raw_spans[eb-1][1]
        result.matches.append({'a_start':a_start,'a_end':a_end,'b_start':b_start,'b_end':b_end,'a_label':_label(a,a_start,a_end),'b_label':_label(b,b_start,b_end),'a_text':a.extracted_text[a_start:a_end],'b_text':b.extracted_text[b_start:b_end]})
    notes=['不同有效指纹的覆盖比例；仅供教师筛查']
    if len(merged)>200:notes.append('匹配片段仅展示前 200 组；重复词元每指纹最多展示每侧 8 处')
    if a.extraction_status=='partial' or b.extraction_status=='partial':notes.append('包含部分解析文件，仅比较已提取部分')
    result.note='；'.join(notes)
    return result

import unicodedata
from pygments.lexers import PythonLexer,JavaLexer
from pygments.token import Comment,Text
from .types import NormalizedContent

def normalize_report(text:str,locations:list[dict]) -> NormalizedContent:
    units=[];spans=[];position=0
    while position<len(text):
        end=position+1
        while end<len(text) and unicodedata.combining(text[end]):end+=1
        for char in unicodedata.normalize('NFKC',text[position:end]):
            if not char.isspace():units.append(char);spans.append((position,end))
        position=end
    return NormalizedContent(units,spans)

def tokenize_code(text:str,language:str) -> NormalizedContent:
    if language not in ('python','java'):raise ValueError('不支持的代码语言')
    lexer=PythonLexer() if language=='python' else JavaLexer()
    units=[];spans=[]
    for start,kind,value in lexer.get_tokens_unprocessed(text):
        if kind in Comment or not value.strip():continue
        units.append(value);spans.append((start,start+len(value)))
    return NormalizedContent(units,spans)

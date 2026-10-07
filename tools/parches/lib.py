import re
class Src:
    def __init__(self, path):
        self.path=path; self.s=open(path,encoding='utf-8').read()
    def rep(self, old, new, count=1):
        n=self.s.count(old)
        assert n>=1, "NO ENCONTRADO: "+old[:120]
        if count==1: assert n==1, f"AMBIGUO ({n}): "+old[:120]
        self.s=self.s.replace(old,new) if count!=1 else self.s.replace(old,new,1)
    def span_func(self, name):
        m=re.search(r'^(async )?function '+re.escape(name)+r'\b', self.s, re.M)
        assert m, "func "+name
        i=m.start()
        m2=re.compile(r'^(function |async function |/\* =====|export default function |const [A-Z_]+ = )', re.M).search(self.s, m.end())
        j=m2.start() if m2 else len(self.s)
        return i,j
    def replace_func(self, name, new):
        i,j=self.span_func(name); self.s=self.s[:i]+new.rstrip()+"\n\n"+self.s[j:]
    def delete_between(self, start, end):
        i=self.s.index(start); j=self.s.index(end,i); self.s=self.s[:i]+self.s[j:]
    def save(self): open(self.path,'w',encoding='utf-8').write(self.s)

/* Worker: compile/AST only. Never execute student code. */
const ROOT='https://cdn.jsdelivr.net/pyodide/v0.27.7/full/';
let engine;
const CHECK=String.raw`import ast, json, builtins, symtable
src = _doctor_source
lines = src.splitlines()
findings = []
def issue(node, title, reason, fix):
    findings.append({'line':getattr(node,'lineno',1),'col':getattr(node,'col_offset',0)+1,'title':title,'reason':reason,'fix':fix})
def compile_error(s):
    try:
        compile(s, '<source>', 'exec', dont_inherit=True)
        return {'ok':True}
    except (SyntaxError,ValueError,OverflowError) as e:
        return {'ok':False,'type':type(e).__name__,'message':getattr(e,'msg',str(e)),'line':getattr(e,'lineno',None) or 1,'col':getattr(e,'offset',None) or 0}
first = compile_error(src)
recovered = []
# Only simulate small, unambiguous fixes on a private copy. No source is executed or edited.
trial = src.split('\n')
current = first
seen = set()
for _ in range(12):
    if current['ok']: break
    n = current['line'] - 1
    key = (n,current['message'])
    if key in seen or not 0 <= n < len(trial): break
    seen.add(key)
    old = trial[n]
    if current['message'] == "expected ':'" and n < len(trial):
        # tokenize keeps comments/strings distinct
        import tokenize, io
        try:
            toks = list(tokenize.generate_tokens(io.StringIO(old.lstrip()).readline))
            comment = next((t for t in toks if t.type == tokenize.COMMENT),None)
            pos = len(old)-len(old.lstrip())+comment.start[1] if comment else len(old)
            trial[n] = old[:pos].rstrip()+':'+old[len(old[:pos].rstrip()):]
        except (tokenize.TokenError,IndentationError): break
    elif current['type'] in ('IndentationError','TabError'):
        # recovery only for a misaligned else/elif/except/finally with a preceding matching opener
        import re
        m = re.match(r'^(\s*)(else|elif|except|finally)\b', old)
        if not m: break
        kw=m.group(2)
        heads={'else':r'(if|elif|for|while|try|except)', 'elif':r'(if|elif)', 'except':r'(try|except)', 'finally':r'(try|except|else)'}[kw]
        opts=[re.match(r'^(\s*)'+heads+r'\b',x) for x in trial[:n]]
        opts=[x.group(1) for x in opts if x]
        if not opts: break
        closest=min(reversed(opts),key=lambda x:abs(len(x.expandtabs(8))-len(m.group(1).expandtabs(8))))
        trial[n]=closest+old.lstrip()
    else: break
    if trial[n]==old: break
    current=compile_error('\n'.join(trial))
    if not current['ok'] and (current['line'],current['message'])!=(first.get('line'),first.get('message')):
        recovered.append(current)
if first['ok']:
    tree = ast.parse(src)
    for node in ast.walk(tree):
        if len(findings)>=100: break
        if isinstance(node,ast.BinOp) and isinstance(node.op,(ast.Div,ast.FloorDiv,ast.Mod)) and isinstance(node.right,ast.Constant) and node.right.value==0:
            issue(node,'อาจหารด้วยศูนย์','ตัวหารเป็น 0 จะเกิด ZeroDivisionError เมื่อคำสั่งนี้ทำงาน','ตรวจตัวหารก่อนคำนวณ หรือแก้สูตรให้ตรงโจทย์')
        if isinstance(node,ast.Expr) and isinstance(node.value,ast.Compare):
            issue(node,'เปรียบเทียบค่าแต่ไม่ได้ใช้ผล','คำสั่งเปรียบเทียบเดี่ยว ๆ ไม่ได้เปลี่ยนค่าตัวแปร','หากตั้งใจเก็บค่า ให้ใช้ = หรือใช้ผลเปรียบเทียบในเงื่อนไข')
        if isinstance(node,ast.Compare) and len(node.ops)==1 and ast.dump(node.left)==ast.dump(node.comparators[0]):
            issue(node,'เปรียบเทียบค่ากับตัวเอง','ทั้งสองฝั่งเป็นนิพจน์เดียวกัน อาจเป็นการสะกดชื่อตัวแปรผิด','ตรวจว่าต้องเปรียบเทียบตัวแปรอีกตัวหรือไม่')
        if isinstance(node,ast.Call) and isinstance(node.func,ast.Name):
            if node.func.id=='range' and len(node.args)==3 and isinstance(node.args[2],ast.Constant) and node.args[2].value==0:
                issue(node,'range มี step เป็น 0','range ไม่อนุญาตให้ step เป็นศูนย์ หากเรียก built-in range','กำหนด step ให้เป็นค่าที่ไม่ใช่ 0')
        if isinstance(node,(ast.FunctionDef,ast.AsyncFunctionDef)):
            for d in node.args.defaults+node.args.kw_defaults:
                if isinstance(d,(ast.List,ast.Dict,ast.Set)):
                    issue(d,'ค่าเริ่มต้นของ argument เปลี่ยนแปลงได้','list/dict/set เดิมจะถูกใช้ร่วมกันในการเรียกฟังก์ชันหลายครั้ง','พิจารณาใช้ None แล้วสร้างค่าใหม่ภายในฟังก์ชัน')
        if isinstance(node,ast.If) and node.orelse and [ast.dump(x) for x in node.body]==[ast.dump(x) for x in node.orelse]:
            issue(node,'เงื่อนไขทั้งสองฝั่งทำงานเหมือนกัน','if และ else มีคำสั่งเหมือนกันทั้งหมด','เทียบกับโจทย์ว่าต้องทำงานต่างกันหรือไม่')
        if isinstance(node,ast.Dict):
            keys=set()
            for k in node.keys:
                if isinstance(k,ast.Constant):
                    try:
                        if k.value in keys: issue(k,'dictionary มี key ซ้ำ','ค่าที่ตามหลังจะทับค่าเดิม','ตรวจชื่อ key ให้ตรงกับข้อมูลที่ต้องการ')
                        keys.add(k.value)
                    except TypeError: pass
        if isinstance(node,ast.Subscript) and isinstance(node.value,(ast.List,ast.Tuple)) and isinstance(node.slice,ast.Constant) and type(node.slice.value) is int:
            if not -len(node.value.elts)<=node.slice.value<len(node.value.elts):
                issue(node,'index อาจเกินขอบเขต','ตำแหน่งเกินจำนวนสมาชิกที่ระบุไว้','ตรวจ index โดยเริ่มนับจาก 0 และตรวจ len()')
    # Conservative unresolved global names; dynamic code and star imports disable this check.
    if not any(isinstance(n,ast.ImportFrom) and any(a.name=='*' for a in n.names) or isinstance(n,ast.Call) and isinstance(n.func,ast.Name) and n.func.id in ('exec','eval','globals','locals','setattr') for n in ast.walk(tree)):
        st=symtable.symtable(src,'<source>','exec')
        known=set(dir(builtins))|{'__name__','__file__','__package__','__doc__','__builtins__','__annotations__','__loader__','__spec__','__cached__'}
        known|={s.get_name() for s in st.get_symbols() if s.is_assigned() or s.is_imported() or s.is_namespace()}
        missing=set()
        def walk_table(t):
            for s in t.get_symbols():
                if s.is_referenced() and s.is_global() and s.get_name() not in known and not s.is_assigned() and not s.is_imported(): missing.add(s.get_name())
            for child in t.get_children(): walk_table(child)
        walk_table(st)
        for name in sorted(missing):
            matches=[n for n in ast.walk(tree) if isinstance(n,ast.Name) and isinstance(n.ctx,ast.Load) and n.id==name]
            if matches: issue(min(matches,key=lambda n:n.lineno),'อาจไม่พบชื่อ '+name,'ไม่พบการประกาศชื่อนี้ในไฟล์ที่ตรวจ อาจมาจากไฟล์หรือบริบทอื่น','ตรวจการสะกด การประกาศ และ import ก่อนใช้งาน')
json.dumps({'first':first,'recovered':recovered,'findings':findings[:100]})`;
self.onmessage=async({data})=>{
  try {
    if(typeof data.source!=='string'||data.source.length>150000) throw Error('source too large');
    if(!engine){importScripts(ROOT+'pyodide.js');engine=await loadPyodide({indexURL:ROOT});}
    engine.globals.set('_doctor_source',data.source);
    let result;try{result=JSON.parse(engine.runPython(CHECK));}finally{engine.globals.delete('_doctor_source');}
    self.postMessage({id:data.id,result});
  }catch(e){self.postMessage({id:data.id,error:String(e)});}
};

/* Code DoctorSiRi V4 — analysis only, no execution of pasted code. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const legacyPython=pythonFallback;
const issues=(out,type,title,line,raw,easy,fix,patch='',col=1)=>add(out,type,title,line,col,raw,easy,fix,patch);
const normalize=s=>s.replace(/\r\n?/g,'\n');
const rawLines=s=>normalize(s).split('\n');
// C-family masking: preserve line/column offsets; replace strings with a placeholder.
function mask(source){
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'|`(?:\\[\s\S]|[^`\\])*`/g,(m)=>{
    let t=m.replace(/[^\n]/g,' ');return /^["'`]/.test(m)?'S'+t.slice(1):t;
  });
}
function brackets(src,out,label,masked=mask(src)){
  const stack=[],pairs={')':'(',']':'[','}':'{'};let ln=1,col=0;
  for(const c of masked){if(c==='\n'){ln++;col=0;continue;}col++;
    if('([{'.includes(c))stack.push({c,ln,col});
    else if(')]}'.includes(c)){if(stack.at(-1)?.c===pairs[c])stack.pop();else {issues(out,'warn',label+': วงเล็บปิดอาจไม่ตรงคู่',ln,c,'ตัวตรวจพื้นฐานพบวงเล็บไม่ตรงกับวงเล็บเปิด','ตรวจวงเล็บและข้อความก่อนหน้า','',col);}}
  }
  for(const t of stack.slice(-20))issues(out,'warn',label+': วงเล็บเปิดอาจยังไม่ปิด',t.ln,t.c,'ยังไม่พบวงเล็บปิดที่ตรงกัน','ตรวจ block และวงเล็บให้ครบ','',t.col);
}
function pythonLocal(src,out){
  legacyPython(src,out);
  const rows=rawLines(src);let previous=null, depth=0,triple=null,continued=false;
  for(let i=0;i<rows.length;i++){
    const r=rows[i];let m='',quote=null;
    for(let k=0;k<r.length;k++){
      const c=r[k];if(triple){if(r.startsWith(triple,k)){k+=2;triple=null;}continue;}
      if(quote){if(c==='\\'){k++;continue;}if(c===quote)quote=null;continue;}
      if(c==='#')break;if(c==='"'||c==="'"){if(r.startsWith(c.repeat(3),k)){triple=c.repeat(3);k+=2;}else quote=c;m+='S';continue;}m+=c;
    }
    const t=m.trim(),indent=(r.match(/^[\t ]*/)||[''])[0].replace(/\t/g,'        ').length;
    const beforeDepth=depth;for(const c of m){if('([{'.includes(c))depth++;if(')]}'.includes(c))depth=Math.max(0,depth-1);}
    const skip=beforeDepth||continued||triple;continued=/\\\s*$/.test(m);if(skip||!t)continue;
    const line=i+1;
    if(previous&&previous.block&&indent<=previous.indent)issues(out,'error','IndentationError: ขาดคำสั่งที่เยื้องเข้าในบล็อก',line,r,'หัวคำสั่งก่อนหน้าต้องมีชุดคำสั่งที่เยื้องเข้าไป','เยื้องคำสั่งให้ถูกระดับ หรือใช้ pass หากตั้งใจเว้นบล็อก');
    if(/^\s*(?:if|elif|while)\b/.test(m)&&/(?<![<>=!:])=(?!=)/.test(m)&&!/[\[(].*=/.test(m))issues(out,'warn','ตรวจสอบ = ในเงื่อนไข Python',line,r,'= ใช้กำหนดค่า ไม่ใช่เปรียบเทียบ','หากต้องการเปรียบเทียบ ให้ใช้ ==');
    if(/^\s*[A-Za-z_]\w*\s*=\s*$/.test(m))issues(out,'error','SyntaxError: ขาดค่าหลัง =',line,r,'ต้องมีนิพจน์ทางขวาของ =','เติมค่าหรือนิพจน์ให้ตรงกับโจทย์');
    if(/^\s*print\s+S\s*$/.test(m))issues(out,'error','SyntaxError: print ต้องมีวงเล็บใน Python 3',line,r,'print เป็นฟังก์ชันใน Python 3','ใช้ print(...)');
    if(/(?:\/\/|\/|%)\s*0(?:\.0+)?\s*(?:$|[),;])/.test(m))issues(out,'warn','อาจหารด้วยศูนย์',line,r,'ตัวหารเป็น 0 อาจทำให้เกิด ZeroDivisionError','ตรวจตัวหารก่อนคำนวณ');
    previous={indent,block:/^(?:(?:async\s+)?(?:def|for|with)|if|elif|else|while|try|except\*?|finally|class|match|case)\b.*:\s*$/.test(t)&&depth===0};
  }
  // Every local error is explicitly an estimate until CPython confirms or disproves it.
}
function cLocal(src,lang,out){
  const rows=rawLines(src), ms=rawLines(mask(src));
  brackets(src,out,'C/C++');
  const corrections={Printf:'printf',Scanf:'scanf',PrintF:'printf',digitalWrit:'digitalWrite',pinmode:'pinMode',digitalwrite:'digitalWrite',analogread:'analogRead',analogwrite:'analogWrite',DelAy:'delay',Cout:'cout',Cin:'cin'};
  for(let i=0;i<ms.length;i++){
    const m=ms[i],t=m.trim(),r=rows[i],ln=i+1;
    if(!t||/^#/.test(t))continue;
    for(const [bad,good] of Object.entries(corrections))if(new RegExp('\\b'+bad+'\\b').test(m))issues(out,'warn','อาจสะกดชื่อ '+bad+' ผิด',ln,r,'C/C++ แยกตัวพิมพ์ใหญ่เล็ก ตรวจว่าตั้งใจเรียก '+good+' หรือไม่','หากหมายถึงชื่อมาตรฐาน ให้เปลี่ยนเป็น '+good,r.slice(0,m.search(new RegExp('\\b'+bad+'\\b')))+good+r.slice(m.search(new RegExp('\\b'+bad+'\\b'))+bad.length));
    if(/^main\s*\(/.test(t))issues(out,'warn','main() ยังไม่ระบุชนิดคืนค่า',ln,r,'มาตรฐาน C/C++ ใช้ int main()','ระบุ int ก่อน main หากเป็น entry point ของโปรแกรม');
    if(/\bprintf\s*\(/.test(m)&&!/#include\s*[<"](?:stdio\.h|cstdio)[>"]/.test(src))issues(out,'warn','ใช้ printf แต่ไม่พบ header ในไฟล์นี้',ln,r,'อาจต้องประกาศ printf จาก header มาตรฐาน','ตรวจ #include <stdio.h> หรือ <cstdio> และไฟล์อื่นที่เกี่ยวข้อง');
    if(/\b(?:if|while)\s*\(\s*[A-Za-z_]\w*\s*=(?!=)/.test(m))issues(out,'warn','กำหนดค่าในเงื่อนไข',ln,r,'= ในเงื่อนไขอาจตั้งค่าแทนการเปรียบเทียบ','ตรวจว่าต้องการใช้ == หรือไม่');
    if(/(?:\/|%)\s*0\s*(?:$|[);,])/.test(m))issues(out,'warn','อาจหารด้วยศูนย์',ln,r,'การหารจำนวนเต็มด้วย 0 ไม่ถูกต้อง','ตรวจตัวหารและชนิดข้อมูล');
    if(/^(?:if|for|while)\s*\(.*\)\s*;\s*$/.test(t))issues(out,'warn','มี ; ต่อท้ายหัวเงื่อนไข',ln,r,'อาจทำให้คำสั่งควบคุมมี body ว่าง','ตรวจว่าตั้งใจให้ body ว่างหรือไม่');
    // Very narrow semicolon hint; avoid function headers and multiline expressions.
    if(/^(?:(?:return|break|continue)\b[^;{}]*|(?:int|float|double|char|bool|long|short|String)\s+\w+\s*=\s*[^;{}]+|(?:printf|scanf|digitalWrite|pinMode|delay)\s*\([^;{}]*\))$/.test(t)&&!/[;,\\+\-*/=]$/.test(t)&&!/^return\s*$/.test(t)&&!/^\s*[+\-*/.,?:(\[]/.test(ms[i+1]||'')){
      const next=(ms[i+1]||'').trim();if(next==='}'||/^(?:return|if|else|for|while|int|float|double|printf|scanf|digitalWrite|pinMode|delay)\b/.test(next))issues(out,'warn','อาจลืม ; ท้ายคำสั่ง',ln,r,'คำสั่งลักษณะนี้โดยทั่วไปต้องจบด้วย ;','ตรวจบรรทัดก่อนหน้าและเติม ; หากเป็นคำสั่งที่สมบูรณ์');
    }
  }
  const arduino=$('compiler').value==='arduino'||/\bvoid\s+(?:setup|loop)\s*\(/.test(mask(src));
  if(arduino&&window.CodeDoctorSiRiArduinoAddon){for(const x of window.CodeDoctorSiRiArduinoAddon.analyze(src))issues(out,'error',x.title,x.line,x.before,x.cause,x.fix,'',x.column);}
}
function jsLocal(src,out){
  if(!window.acorn){brackets(src,out,'JavaScript');return;}
  let ast=null,err;
  for(const sourceType of ['script','module']){try{ast=acorn.parse(src,{ecmaVersion:'latest',sourceType,allowHashBang:true,locations:true});break;}catch(e){if(!err||e.pos>err.pos)err=e;}}
  if(!ast){issues(out,'error','JavaScript SyntaxError',err.loc?.line||1,err.message,'ตัวแปลไวยากรณ์ JavaScript อ่านโค้ดไม่ผ่าน','ตรวจตำแหน่งที่แจ้งและบรรทัดก่อนหน้า','',(err.loc?.column||0)+1);return;}
  const rows=rawLines(src);
  const visit=n=>{if(!n||typeof n!=='object')return;
    const ln=n.loc?.start.line||1,raw=rows[ln-1];
    if(['IfStatement','WhileStatement','DoWhileStatement'].includes(n.type)&&n.test?.type==='AssignmentExpression')issues(out,'warn','กำหนดค่าในเงื่อนไข JavaScript',ln,raw,'อาจใช้ = แทนการเปรียบเทียบ','ตรวจว่าต้องการใช้ === หรือไม่');
    if(n.type==='BinaryExpression'&&['/','%'].includes(n.operator)&&n.right?.type==='Literal'&&n.right.value===0)issues(out,'warn','ตัวหารเป็นศูนย์',ln,raw,'ผลอาจเป็น Infinity หรือ NaN','ตรวจตัวหารก่อนคำนวณ');
    if(n.type==='ExpressionStatement'&&n.expression?.type==='BinaryExpression'&&['==','===','!=','!=='].includes(n.expression.operator))issues(out,'warn','เปรียบเทียบค่าแต่ไม่ได้ใช้ผล',ln,raw,'นิพจน์นี้ไม่เปลี่ยนค่าตัวแปร','ตรวจว่าตั้งใจใช้ = หรือเงื่อนไขหรือไม่');
    if(n.type==='ForStatement'&&n.body?.type==='EmptyStatement')issues(out,'warn','ลูป for มี body ว่าง',ln,raw,'อาจมี ; เกินหลังหัวลูป','ตรวจว่าตั้งใจให้ลูปไม่มีคำสั่งหรือไม่');
    if(n.type==='VariableDeclaration'&&n.kind==='var'){} // valid syntax, no warning
    for(const [k,v] of Object.entries(n)){if(k==='loc')continue;if(Array.isArray(v))v.forEach(visit);else if(v&&typeof v==='object'&&v.type)visit(v);}
  };visit(ast);
}
function htmlLocal(src,out){
  const voids=new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));
  const optional=new Set('html head body li dt dd p rt rp optgroup option colgroup thead tbody tfoot tr td th'.split(' '));
  const auto={li:['li'],dt:['dt','dd'],dd:['dt','dd'],p:['p','div','section','article','h1','h2','h3','ul','ol','table','form','pre','blockquote'],option:['option','optgroup'],tr:['tr'],td:['td','th'],th:['td','th'],tbody:['tbody','tfoot'],thead:['tbody','tfoot']};
  const clean=src.replace(/<!--[\s\S]*?-->|<(script|style|textarea|title)\b(?:"[^"]*"|'[^']*'|[^'">])*>[\s\S]*?<\/\1\s*>/gi,m=>m.replace(/[^\n]/g,' '));
  const re=/<(\/?)([a-z][\w:-]*)(?:"[^"]*"|'[^']*'|[^'">])*>/gi,stack=[];let m;
  while((m=re.exec(clean))){const name=m[2].toLowerCase(),ln=clean.slice(0,m.index).split('\n').length;if(voids.has(name)||/\/>$/.test(m[0]))continue;
    if(!m[1]){while(stack.length&&auto[stack.at(-1).name]?.includes(name))stack.pop();stack.push({name,ln});}
    else{while(stack.length&&stack.at(-1).name!==name&&optional.has(stack.at(-1).name))stack.pop();if(stack.at(-1)?.name===name)stack.pop();else {issues(out,'warn','แท็ก HTML อาจปิดไม่ตรง',ln,m[0],'ตัวตรวจโครงสร้างพบแท็กปิดไม่ตรงกับแท็กล่าสุด','ตรวจการซ้อนแท็กและกฎ HTML ของแท็กนั้น');const at=stack.map(x=>x.name).lastIndexOf(name);if(at>=0)stack.splice(at);}}
  }
  for(const x of stack)if(!optional.has(x.name))issues(out,'warn','แท็ก <'+x.name+'> อาจยังไม่ปิด',x.ln,'','ไม่พบแท็กปิดในโค้ดที่ส่งมา','ตรวจว่าต้องเพิ่ม </'+x.name+'> หรือไม่');
  // Embedded JS syntax, skip JSON/data scripts and external scripts.
  const scripts=/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  const noComments=src.replace(/<!--[\s\S]*?-->/g,m=>m.replace(/[^\n]/g,' '));
  while((m=scripts.exec(noComments))){if(/\bsrc\s*=/i.test(m[1])||/\btype\s*=\s*["']?(?!module\b|text\/javascript\b|application\/javascript\b)[\w/+-]+/i.test(m[1]))continue;const offset=src.slice(0,m.index+m[0].indexOf('>')+1).split('\n').length-1;const found=[];jsLocal(m[2],found);for(const x of found)out.push({...x,line:x.line+offset,title:'ใน <script>: '+x.title,codefix:''});}
}
function cssLocal(src,out){
  const masked=mask(src);brackets(src,out,'CSS',masked);const rows=rawLines(src),ms=rawLines(masked);let depth=0;
  for(let i=0;i<ms.length;i++){const t=ms[i].trim();for(const c of t){if(c==='{')depth++;if(c==='}')depth--;}
    if(depth>0&&/^[\w-]+\s*:\s*[^;{}]+$/.test(t)&&/^\s*[\w-]+\s*:\s*[^{}]/.test(ms[i+1]||''))issues(out,'warn','อาจขาด ; ระหว่าง CSS declarations',i+1,rows[i],'มี declaration ถัดไป แต่บรรทัดนี้ยังไม่จบด้วย ;','ตรวจว่าค่าไม่ได้ต่อเนื่องหลายบรรทัด แล้วเติม ; หากจำเป็น');
  }
}
staticChecks=(source,l,out)=>{if(l==='python')pythonLocal(source,out);else if(l==='c'||l==='cpp')cLocal(source,l,out);else if(l==='js')jsLocal(source,out);else if(l==='html')htmlLocal(source,out);else if(l==='css')cssLocal(source,out);};
// Expand compiler log support without pretending to know a line when the compiler didn't provide one.
const oldExplain=explainCompilerMessage;
explainCompilerMessage=(out,type,msg,ln,col,raw)=>{
  const rules=[[/No such file or directory|file not found|cannot open include file/i,'ไม่พบไฟล์หรือ header','ไฟล์หรือไลบรารีที่ระบุไม่อยู่ในเส้นทางค้นหา','ตรวจชื่อไฟล์ พาธ และการติดตั้งไลบรารี'],[/multiple definition|LNK2005/i,'Linker: พบสัญลักษณ์ซ้ำ','มี implementation ซ้ำระหว่างไฟล์','ให้มี definition เดียวและตรวจการ link'],[/undefined reference|unresolved external symbol/i,'Linker: ไม่พบ implementation','ประกาศชื่อไว้แต่ไม่พบโค้ดที่ link ได้','ตรวจไฟล์ .c/.cpp และไลบรารีที่ต้อง link; หาก log ไม่มีเลขบรรทัด ตำแหน่งที่แสดงเป็นเพียงค่าเริ่มต้น'],[/invalid conversion|cannot convert|incompatible (?:type|pointer)/i,'ชนิดข้อมูลไม่ตรงกัน','ชนิดค่าที่ส่งไม่ตรงกับปลายทาง','ตรวจชนิดข้อมูล pointer และ signature ไม่ควร cast โดยไม่เข้าใจ'],[/conflicting types|ambiguous/i,'การประกาศไม่สอดคล้องหรือกำกวม','มีชนิดหรือ overload ที่ไม่ตรงกัน','ตรวจ declaration และ argument'],[/lvalue required|expression must be a modifiable lvalue/i,'ด้านซ้ายของการกำหนดค่าแก้ไขไม่ได้','นิพจน์ไม่ใช่ตำแหน่งเก็บค่าที่แก้ไขได้','ตรวจด้านซ้ายของ = และ const'],[/division by zero/i,'หารด้วยศูนย์','ตัวหารมีค่า 0','ตรวจสูตรและเงื่อนไขก่อนหาร'],[/expected.*semicolon|expected\s+['`‘];['`’]/i,'อาจขาด ;','Compiler คาดว่าจะพบ semicolon','ตรวจบรรทัดก่อนหน้าจุดที่แจ้ง'],[/stray|unterminated|missing terminating/i,'อักขระหรือข้อความไม่สมบูรณ์','Compiler พบอักขระผิดตำแหน่งหรือ string ไม่ครบ','ตรวจ quote อักขระแปลก และ escape'],[/control reaches end|non-void function does not return/i,'ฟังก์ชันอาจไม่ได้คืนค่า','บางเส้นทางไม่มี return','ตรวจให้ return ตรงชนิดในทุกเส้นทาง']];
  const hit=rules.find(r=>r[0].test(msg));if(hit){add(out,type,hit[1],ln,col,raw,hit[2],hit[3]);return;}oldExplain(out,type,msg,ln,col,raw);const x=out.at(-1);if(x)x.codefix=''; // remove sample-specific hard-coded replacements
};
const oldPyExplain=pythonExplain,oldPyFix=pythonFix;
const pyErrors={ZeroDivisionError:['หารด้วยศูนย์','ตรวจตัวหารก่อนคำนวณ'],ModuleNotFoundError:['ไม่พบโมดูล','ตรวจชื่อโมดูลและ environment ที่ติดตั้ง package'],ImportError:['นำเข้าโมดูลหรือชื่อไม่สำเร็จ','ตรวจ import และเวอร์ชันไลบรารี'],AttributeError:['วัตถุไม่มี attribute ที่เรียก','ตรวจชนิดข้อมูลและชื่อ method'],UnboundLocalError:['ตัวแปร local ยังไม่มีค่าก่อนใช้','กำหนดค่าก่อนทุกเส้นทางที่นำไปใช้'],FileNotFoundError:['ไม่พบไฟล์','ตรวจพาธและ working directory'],PermissionError:['ไม่มีสิทธิ์เข้าถึง','ตรวจสิทธิ์และพาธ'],RecursionError:['เรียกซ้อนลึกเกินไป','ตรวจเงื่อนไขหยุด recursion'],EOFError:['ไม่มีข้อมูล input เหลือ','ตรวจจำนวนบรรทัด input'],AssertionError:['เงื่อนไข assert ไม่เป็นจริง','ตรวจค่าที่ทำให้เงื่อนไขล้มเหลว'],OverflowError:['ค่ามากเกินช่วงที่รองรับ','ตรวจช่วงค่าและชนิดข้อมูล'],MemoryError:['หน่วยความจำไม่พอ','ตรวจขนาดข้อมูลและการสร้างข้อมูลซ้ำ'],TypeError:['ชนิดข้อมูลหรือจำนวน argument ไม่ตรง','ตรวจ type() และ signature ของฟังก์ชัน']};
pythonExplain=(t,m)=>pyErrors[t]?.[0]||oldPyExplain(t,m);pythonFix=(t,m)=>pyErrors[t]?.[1]||oldPyFix(t,m);
const oldLog=parseCompilerLog;
parseCompilerLog=(text,out)=>{oldLog(text,out);let line=1;for(const raw of rawLines(text)){const frame=raw.match(/File\s+".*?",\s+line\s+(\d+)/);if(frame)line=+frame[1];const py=raw.trim().match(/^([A-Za-z]+(?:Error|Exception)):\s*(.*)$/);if(lang.value==='python'&&py&&!out.some(x=>x.raw===raw.trim()||x.raw===py[1]+': '+py[2]))pythonCompilerIssue({ok:false,type:py[1],message:py[2],line,col:0},code.value,out);
  if(/fatal error:/i.test(raw)&&!out.some(x=>x.raw===raw)){const m=raw.match(/:(\d+)(?::(\d+))?:\s*fatal error:\s*(.*)/i);explainCompilerMessage(out,'error',m?.[3]||raw,m?+m[1]:1,m?.[2]?+m[2]:0,raw);}
  if(/undefined reference|unresolved external symbol|multiple definition/i.test(raw)&&!out.some(x=>x.raw===raw))explainCompilerMessage(out,'error',raw,1,0,raw);
  if(/(?:SyntaxError|ReferenceError|TypeError|RangeError):/.test(raw)&&lang.value==='js'&&!out.some(x=>x.raw===raw))add(out,'error','JavaScript: '+raw.trim().split(':')[0],1,0,raw,'เบราว์เซอร์แจ้งข้อผิดพลาด','ตรวจ stack trace และค่าที่บรรทัดที่แจ้ง');
}if(text.trim()&&!out.length)add(out,'info','ยังแปล Compiler Log นี้ไม่ได้',1,0,text.slice(0,1500),'รูปแบบข้อความไม่อยู่ในกฎที่รองรับ','ดู error แรกจาก IDE และคัดลอกข้อความเต็มพร้อมบรรทัด');};
// Only display concrete, contextual patches; never invent replacement lines from error descriptions.
autoFixedLine=item=>item.codefix||'';
let worker=null,seq=0,pending=null;
function pythonCheck(source){return new Promise((resolve,reject)=>{
  if(location.protocol==='file:'){reject(Error('เปิดผ่าน file://; ใช้ HTTPS หรือ localhost'));return;}
  if(pending){clearTimeout(pending.timer);pending.reject(Error('superseded'));pending=null;worker?.terminate();worker=null;}
  try{if(!worker)worker=new Worker('./python-check.js');}catch(e){reject(e);return;}
  const id=++seq;const fail=e=>{if(pending?.id!==id)return;clearTimeout(pending.timer);pending=null;worker?.terminate();worker=null;reject(e);};
  pending={id,reject,timer:setTimeout(()=>fail(Error('Python engine timeout')),25000)};
  worker.onerror=()=>fail(Error('worker unavailable'));worker.onmessage=({data})=>{if(data.id!==id||pending?.id!==id)return;if(data.error){fail(Error(data.error));return;}clearTimeout(pending.timer);pending=null;resolve(data.result);};worker.postMessage({id,source});
});}
let lastItems=[],lastSource='',undo=[];
const originalRender=render;
render=items=>{lastItems=dedupe(items).sort((a,b)=>({error:0,warn:1,info:2}[a.type]-({error:0,warn:1,info:2}[b.type]))||a.line-b.line);lastSource=code.value;const renderedRevision=analysisRevision;originalRender(lastItems);const nodes=$('issues').querySelectorAll('.issue');nodes.forEach((node,i)=>{const x=lastItems[i];if(!x?.codefix||x.codefix.includes('\n')||!sourceLine(x.line)||sourceLine(x.line)===x.codefix)return;const b=document.createElement('button');b.textContent='นำคำแนะนำไปแก้บรรทัดนี้';b.style.marginTop='8px';b.onclick=()=>{if(code.value!==lastSource||renderedRevision!==analysisRevision){status.textContent='โค้ดเปลี่ยนแล้ว กรุณาตรวจใหม่ก่อนแก้';return;}if(!confirm('นำคำแนะนำนี้ไปแทนบรรทัด '+x.line+'? ตรวจให้ตรงกับโจทย์ก่อนยืนยัน'))return;undo.push(code.value);const lines=rawLines(code.value);lines[x.line-1]=x.codefix;code.value=lines.join('\n');code.dispatchEvent(new Event('input'));$('analyze').click();};node.appendChild(b);});};
const toolbar=document.querySelector('.toolbar');const undoBtn=document.createElement('button');undoBtn.textContent='↶ ย้อนการแก้';undoBtn.onclick=()=>{if(!undo.length){status.textContent='ยังไม่มีการแก้ผ่านปุ่มคำแนะนำ';return;}if(!confirm('ย้อนกลับไปยังโค้ดก่อนใช้คำแนะนำล่าสุด? การแก้ด้วยมือหลังจากนั้นอาจหายไป'))return;code.value=undo.pop();code.dispatchEvent(new Event('input'));$('analyze').click();};toolbar.appendChild(undoBtn);
const report=document.createElement('button');report.textContent='คัดลอกผลตรวจ';report.onclick=async()=>{if(!lastItems.length){status.textContent='ยังไม่มีผลตรวจให้คัดลอก';return;}try{await navigator.clipboard.writeText(lastItems.map(x=>`${x.type.toUpperCase()} | บรรทัด ${x.line}: ${x.title}\n${x.easy}\nวิธีแก้: ${x.fix}`).join('\n\n'));status.textContent='คัดลอกผลตรวจแล้ว';}catch(e){status.textContent='คัดลอกอัตโนมัติไม่ได้ ให้เลือกข้อความผลตรวจด้วยตนเอง';}};toolbar.appendChild(report);
const oldSample=$('loadSample').onclick;$('loadSample').onclick=()=>{undo=[];oldSample();};
const oldClear=$('clear').onclick;$('clear').onclick=()=>{undo=[];lastItems=[];oldClear();};
function merged(...groups){const list=[];for(const x of groups.flat()){if(!list.some(y=>y.line===x.line&&y.title===x.title))list.push(x);}return list;}
function foot(msg){$('easy').insertAdjacentHTML('afterbegin','<div class="tip"><b>ขอบเขตการตรวจ</b><span>'+esc(msg)+'</span></div>');}
$('analyze').onclick=async()=>{
  const revision=++analysisRevision,source=code.value,language=lang.value,logs=[],local=[];
  if(source.length>150000||log.value.length>150000){status.textContent='ข้อมูลเกิน 150,000 ตัวอักษร กรุณาแบ่งไฟล์';return;}
  if(log.value.trim())parseCompilerLog(log.value,logs);
  if(!source.trim()&&!log.value.trim()){showAnalysis([],'ยังไม่มีข้อมูล');$('issues').innerHTML='<div class="empty">กรุณาวาง Source Code หรือ Compiler Log</div>';return;}
  if(source.trim())try{staticChecks(source,language,local);}catch(e){add(local,'info','ตัวตรวจพื้นฐานทำงานไม่สมบูรณ์',1,0,'','ยังตรวจโค้ดได้ไม่ครบ','ลองแบ่งโค้ดเป็นไฟล์เล็กลงหรือใช้ Compiler จริง');}
  const py=language==='python'&&source.trim();
  const scope=language==='js'&&window.acorn?'ตรวจไวยากรณ์ JS ด้วย Acorn':language==='c'||language==='cpp'?'ตรวจพื้นฐาน C/C++ (ไม่ใช่ Compiler)':language==='html'||language==='css'?'ตรวจโครงสร้างพื้นฐาน': 'ตรวจพื้นฐาน';
  showAnalysis(merged(logs,local),py?'ตรวจพื้นฐาน • กำลังโหลด Python':scope);
  foot('Error จาก Compiler Log หรือ parser เป็นข้อมูลที่ยืนยันจากเครื่องมือ ส่วนผลตรวจพื้นฐานอาจคลาดเคลื่อน และ Warning ต้องเทียบโจทย์ ไม่ได้รันโปรแกรม');
  if(window.innerWidth<=700)setTimeout(()=>$('issues').scrollIntoView({behavior:'smooth',block:'start'}),80);
  if(!py)return;
  try{const res=await pythonCheck(source);if(revision!==analysisRevision||source!==code.value||language!==lang.value)return;
    const confirmed=[];pythonCompilerIssue(res.first,source,confirmed);
    const hints=res.findings.map(x=>({type:'warn',title:x.title,line:x.line,col:x.col,raw:sourceLine(x.line),easy:x.reason,fix:x.fix,codefix:''}));
    const recovery=[];for(const x of res.recovered){const tmp=[];pythonCompilerIssue(x,source,tmp);for(const item of tmp)recovery.push({...item,type:'warn',title:'หลังจำลองแก้: '+item.title,codefix:item.codefix||'',easy:'พบหลังจำลองแก้ข้อผิดพลาดก่อนหน้าในสำเนาเท่านั้น — '+item.easy});}
    const basic=local.filter(x=>x.type!=='error'||!res.first.ok).filter(x=>![...confirmed,...recovery].some(y=>x.line===y.line&&(x.title===y.title.replace(/^หลังจำลองแก้: /,'')||(/IndentationError/.test(x.title)&&/IndentationError/.test(y.title))))).map(x=>x.type==='error'?{...x,type:'warn',title:'ตัวตรวจพื้นฐาน: '+x.title}:x);
    const combined=merged(confirmed,logs,basic,recovery,hints);showAnalysis(combined,'ตรวจด้วย CPython + AST แล้ว');foot(res.first.ok?'CPython ยืนยันว่า compile ผ่าน แต่ไม่ได้รันโค้ด จึงไม่ยืนยันผลลัพธ์หรือความถูกต้องตามโจทย์':'CPython ยืนยันข้อผิดพลาดแรก ส่วนคำเตือนหลังจำลองแก้และตัวตรวจพื้นฐานอาจเป็นข้อผิดพลาดต่อเนื่อง ให้แก้แล้วตรวจซ้ำ');
  }catch(e){if(revision!==analysisRevision||source!==code.value||language!==lang.value)return;showAnalysis(merged(logs,local),'โหมดพื้นฐาน • Python engine ไม่พร้อม');foot('ต้องใช้อินเทอร์เน็ตและ HTTPS/localhost เพื่อโหลด CPython จาก CDN; โหมดพื้นฐานไม่ยืนยันว่า syntax ถูกต้องทั้งหมด');}
};
// Clear stale findings on edit or language change; avoid applying patches to old source.
for(const el of [code,log,lang])el.addEventListener(el===lang?'change':'input',()=>{lastItems=[];});
})();

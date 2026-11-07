
(()=>{'use strict';
const cfg=window.COURT_CONFIG, $=s=>document.getElementById(s);
const root=cfg.url+'/rest/v1/court_offices',authUrl=cfg.url+'/auth/v1/token?grant_type=password';
const floors=['الأرضي','الأول','الثاني','الثالث','الرابع'];
let token='',records=[];
function status(message,error=false){$('status').textContent=message;$('status').className='message'+(error?' error':'');}
function headers(json=false){const h={apikey:cfg.key};if(token)h.Authorization='Bearer '+token;if(json)h['Content-Type']='application/json';return h;}
async function api(url,opts={}){const r=await fetch(url,{...opts,headers:{...headers(Boolean(opts.body)),...(opts.headers||{})}});if(!r.ok){const t=await r.text();throw Error(r.status+' '+t.slice(0,240))}return r.status===204?null:await r.json();}
function loginState(on){$('login').classList.toggle('hide',on);$('management').classList.toggle('hide',!on);}
function clearForm(){$('editId').value='';$('officeName').value='';$('floor').value='الأرضي';}
function dom(tag,txt){const e=document.createElement(tag);if(txt!==undefined)e.textContent=txt;return e;}
async function load(){
 records=await api(root+'?select=id,name,floor,sort_order&order=sort_order.asc,name.asc&limit=1000');
 $('total').textContent=records.length;
 const box=$('records');box.replaceChildren();
 for(const item of records){
 const row=dom('div');row.className='row';row.append(dom('span',item.name+' — الدور '+item.floor));
 const edit=dom('button','تعديل');edit.className='secondary';
 edit.onclick=()=>{$('editId').value=item.id;$('officeName').value=item.name;$('floor').value=item.floor;window.scrollTo({top:0,behavior:'smooth'});$('officeName').focus();};
 const del=dom('button','حذف');del.className='danger';
 del.onclick=async()=>{if(!confirm('حذف "'+item.name+'" من الدليل لجميع الزوار؟'))return;try{await api(root+'?id=eq.'+encodeURIComponent(item.id),{method:'DELETE',headers:{Prefer:'return=representation'}});await load();status('تم الحذف من قاعدة البيانات للجميع.')}catch(e){status('فشل الحذف: '+e.message,true)}};
 row.append(edit,del);box.append(row);
 }
}
$('floor').replaceChildren(...floors.map(f=>{const e=dom('option',f);e.value=f;return e}));
$('loginForm').onsubmit=async(e)=>{
 e.preventDefault();status('جاري تسجيل الدخول...');
 try{
 const resp=await fetch(authUrl,{method:'POST',headers:{apikey:cfg.key,'Content-Type':'application/json'},body:JSON.stringify({email:$('email').value.trim(),password:$('password').value})});
 const data=await resp.json();if(!resp.ok||!data.access_token)throw Error(data.error_description||data.msg||data.message||'بيانات الدخول غير صحيحة');
 token=data.access_token;$('password').value='';
 // Authorization for modifications is enforced server-side by RLS.
 const check=await api(cfg.url+'/rest/v1/rpc/is_court_admin',{method:'POST',body:'{}'});
 if(check!==true){token='';throw Error('هذا المستخدم غير مصرح له بإدارة الدليل.');}
 loginState(true);await load();status('تم تسجيل الدخول. أي تعديل سيظهر للزوار بعد تحديث الصفحة.');
 }catch(err){loginState(false);status('تعذر تسجيل الدخول: '+err.message,true)}
};
$('logout').onclick=()=>{token='';records=[];loginState(false);status('تم تسجيل الخروج.')};
$('clear').onclick=clearForm;
$('officeForm').onsubmit=async(e)=>{
 e.preventDefault();const id=$('editId').value,name=$('officeName').value.trim(),floor=$('floor').value;
 if(!name)return;
 try{
 if(id)await api(root+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify({name,floor}),headers:{Prefer:'return=representation'}});
 else await api(root,{method:'POST',body:JSON.stringify({name,floor,sort_order:records.length}),headers:{Prefer:'return=representation'}});
 clearForm();await load();status('تم الحفظ في قاعدة البيانات للجميع.');
 }catch(err){status('تعذر الحفظ: '+err.message,true)}
};
$('download').onclick=()=>{
 const blob=new Blob([JSON.stringify(records.map(({id,name,floor,sort_order})=>({id,name,floor,sort_order})),null,2)],{type:'application/json'});
 const u=URL.createObjectURL(blob);const a=dom('a');a.href=u;a.download='north-banha-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
$('importBtn').onclick=()=>$('importFile').click();
$('importFile').onchange=async(e)=>{
 const file=e.target.files[0];if(!file)return;
 try{
 const data=JSON.parse(await file.text());
 if(!Array.isArray(data)||!data.every(x=>x&&typeof x.name==='string'&&floors.includes(x.floor)))throw Error('صيغة الملف غير صحيحة.');
 if(!confirm('سيتم إضافة العناصر المستوردة بدون حذف أي مكاتب موجودة. هل تكملي؟'))return;
 const existing=new Set(records.map(x=>x.name+'|'+x.floor));
 const newItems=data.filter(x=>!existing.has(x.name+'|'+x.floor)).map((x,i)=>({name:x.name.trim(),floor:x.floor,sort_order:records.length+i}));
 for(let i=0;i<newItems.length;i+=100)await api(root,{method:'POST',body:JSON.stringify(newItems.slice(i,i+100)),headers:{Prefer:'return=representation'}});
 await load();status('تم استيراد '+newItems.length+' مكتب جديد للجميع.');
 }catch(err){status('فشل الاستيراد: '+err.message,true)}finally{e.target.value=''}
};
loginState(false);status('ادخلي بحساب الإدارة المصرح له.');
})();

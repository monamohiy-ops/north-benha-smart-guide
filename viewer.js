
(()=>{'use strict';
const cfg=window.COURT_CONFIG, $=id=>document.getElementById(id);
const floors=['الأرضي','الأول','الثاني','الثالث','الرابع'];
const initial=window.COURT_INITIAL||[];
let offices=initial.slice(), active='الكل', source='local';
const normalize=s=>String(s||'').normalize('NFKC').replace(/[أإآ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[ًٌٍَُِّْـ]/g,'').toLowerCase().trim();
function el(tag,klass,txt){const x=document.createElement(tag);if(klass)x.className=klass;if(txt!==undefined)x.textContent=txt;return x;}
function render(){
 const nav=$('floors');nav.replaceChildren();
 for(const f of ['الكل',...floors]){
  const b=el('button','pill'+(active===f?' active':''),f==='الكل'?'كل الأدوار':'الدور '+f);
  b.type='button';b.onclick=()=>{active=f;render()};nav.append(b);
 }
 const q=normalize($('search').value);
 const list=offices.filter(o=>(active==='الكل'||o.floor===active)&&normalize(o.name).includes(q));
 $('heading').textContent=active==='الكل'?'جميع المكاتب والأدوار':'الدور '+active;
 $('count').textContent=list.length+' نتيجة من إجمالي '+offices.length+' جهة ومكتب';
 const cards=$('cards');cards.replaceChildren();
 if(!list.length){cards.append(el('div','empty','لا توجد نتائج مطابقة.'));return;}
 for(const o of list){
  const a=el('article','card');a.append(el('h3','',o.name),el('span','tag','الدور '+o.floor),el('div','foot','محكمة شمال بنها الابتدائية'));cards.append(a);
 }
}
async function refresh(){
 const notice=$('liveStatus'); notice.textContent='جاري تحديث بيانات المكاتب...';
 try{
  const response=await fetch(cfg.url+'/rest/v1/court_offices?select=id,name,floor,sort_order&order=sort_order.asc,name.asc&limit=1000',
    {headers:{apikey:cfg.key},cache:'no-store'});
  if(!response.ok)throw Error('HTTP '+response.status);
  const result=await response.json();
  if(!Array.isArray(result))throw Error('Invalid response');
  // An empty table is expected until initial_data.sql is executed.
  if(result.length){offices=result;source='cloud';notice.textContent='البيانات محدثة من دليل المحكمة';}
  else {source='local';offices=initial.slice();notice.textContent='تعرض البيانات الأساسية حاليًا؛ لم تُنقل المكاتب لقاعدة البيانات بعد.';}
 }catch(e){source='local';offices=initial.slice();notice.textContent='تعذر الاتصال بقاعدة البيانات؛ تظهر البيانات الأساسية المحفوظة مؤقتًا.';console.error(e);}
 render();
}
$('search').addEventListener('input',()=>{if($('search').value.trim())active='الكل';render()});
$('reset').onclick=()=>{$('search').value='';active='الكل';render()};
const notice=el('div','muted');notice.id='liveStatus';notice.setAttribute('role','status');
$('cards').before(notice);
render();refresh();
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
})();

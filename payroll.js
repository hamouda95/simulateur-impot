/* Bulletin PDF : lecture locale, confirmation humaine, stockage privé par compte. */
(()=>{'use strict';
const root=document.getElementById('payroll-app');if(!root)return;
const cfg=window.FAMILY_BACKEND||{};
const client=window.familySupabaseClient||(cfg.url&&cfg.anonKey&&window.supabase?window.supabase.createClient(cfg.url,cfg.anonKey,{auth:{storageKey:'family-auth-token'}}):null);
const money=n=>Number(n||0).toLocaleString('fr-FR',{style:'currency',currency:'EUR'});
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={gross_salary:'Salaire brut',employee_contributions:'Cotisations salariales',employer_contributions:'Cotisations patronales',net_social:'Net social',net_before_income_tax:'Net avant impôt',net_taxable:'Net imposable',withholding_tax_rate:'Taux PAS (%)',withholding_tax_amount:'Impôt prélevé',net_paid:'Net versé',total_employer_cost:'Coût employeur'};
const fields=Object.keys(labels);
let currentFile=null,parsed=null,rawLines=[],user=null,history=[];
root.innerHTML='<div class="card" style="max-width:1060px;margin:24px auto"><h2>Mes fiches de paie</h2><p class="hint">Documents privés, accessibles uniquement depuis votre compte. Le PDF est lu localement dans votre navigateur. Vérifiez les montants avant chaque enregistrement.</p><div id="payroll-status" role="status"></div><div id="payroll-content"></div></div>';
const status=(s,error=false)=>{const x=document.getElementById('payroll-status');x.textContent=s;x.style.color=error?'#b91c1c':'var(--muted)'};
const content=()=>document.getElementById('payroll-content');
function number(s){if(s==null)return null;const t=String(s).replace(/[\s\u00a0\u202f]/g,'').replace(/\.(?=\d{3}(?:[,.]|$))/g,'').replace(',','.');const n=Number(t);return Number.isFinite(n)?n:null}
function findAmount(text,re){const m=text.match(re);return m?number(m[1]):null}
function extract(text){
 const v={employer_name:'',employer_siret:''};
 const amount='([0-9][0-9 .\\u00a0\\u202f]*[,.][0-9]{2})';
 const match=(label,flags='i')=>findAmount(text,new RegExp(label+'\\s+'+amount,flags));
 const siret=text.match(/SIRET\\s*:\\s*([0-9]{14})/i);if(siret)v.employer_siret=siret[1];
 const period=text.match(/P[ée]riode\\s+du\\s+(\\d{2}\\/\\d{2}\\/\\d{4})\\s+au\\s+(\\d{2}\\/\\d{2}\\/\\d{4})/i);
 const date=d=>d?d.slice(6)+'-'+d.slice(3,5)+'-'+d.slice(0,2):'';
 v.period_start=period?date(period[1]):'';
 v.period_end=period?date(period[2]):'';
 v.gross_salary=match('MONTANT\\s+BRUT');
 v.net_social=match('MONTANT\\s+NET\\s+SOCIAL');
 v.net_before_income_tax=match('MONTANT\\s+NET\\s+[ÀA]\\s+PAYER\\s+AVANT\\s+IMP[ÔO]T\\s+SUR\\s+LE\\s+REVENU');
 v.net_taxable=match('Montant\\s+net\\s+imposable');
 v.net_paid=match('MONTANT\\s+NET\\s+[ÀA]\\s+PAYER\\s*\\(EN\\s+EUROS\\)');
 v.total_employer_cost=match('TOTAL\\s+VERS[ÉE]\\s+PAR\\s+L.EMPLOYEUR');
 const cot=text.match(new RegExp('TOTAL\\s+DES\\s+COTISATIONS\\s+ET\\s+CONTRIBUTIONS\\s+'+amount+'\\s+'+amount,'i'));
 v.employee_contributions=cot?number(cot[1]):null;
 v.employer_contributions=cot?number(cot[2]):null;
 const pas=text.match(new RegExp('Imp[ôo]t\\s+sur\\s+le\\s+revenu\\s+pr[ée]lev[ée]\\s+[àa]\\s+la\\s+source\\s+'+amount+'\\s+([0-9]+[,.][0-9]{1,3})\\s+'+amount,'i'));
 v.withholding_tax_rate=pas?number(pas[2]):null;
 v.withholding_tax_amount=pas?number(pas[3]):null;
 const leave={};
 for(const [key,re] of Object.entries({acquired:/Acquis\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)/i,taken:/Pris\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)/i,remaining:/Restant\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)\\s+([\\d,.]+)/i})){
  const m=text.match(re);if(m)for(let i=1;i<=4;i++){const type=['cp_n','cp_n_minus_1','rtt','recovery'][i-1];(leave[type]??={})[key]=number(m[i])}
 }
 return {values:v,leave};
}
function view(){
 if(!user){content().innerHTML='<p>Connectez-vous dans « Mon compte / Famille » pour accéder à vos bulletins privés.</p><button type="button" id="payroll-login">Ouvrir mon compte</button>';document.getElementById('payroll-login').onclick=()=>document.getElementById('family-open')?.click();return}
 content().innerHTML='<label for="payroll-file"><strong>1. Choisir un bulletin PDF (10 Mo maximum)</strong></label><input type="file" id="payroll-file" accept="application/pdf,.pdf"><p class="hint">Le document n’est pas envoyé au serveur tant que vous ne confirmez pas.</p><div id="payroll-review"></div><h3>Historique enregistré</h3><div id="payroll-history"></div>';
 document.getElementById('payroll-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  if(file.size>10*1024*1024||file.size===0||!file.name.toLowerCase().endsWith('.pdf')){status('PDF invalide ou supérieur à 10 Mo.',true);return}
  try{
   if(!window.pdfjsLib)throw Error('Le lecteur PDF est indisponible.');
   window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
   const bytes=await file.arrayBuffer();const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
   if(pdf.numPages>5)throw Error('Bulletin de plus de 5 pages : vérification manuelle requise.');
   let text='';rawLines=[];
   for(let p=1;p<=pdf.numPages;p++){const page=await pdf.getPage(p),items=(await page.getTextContent()).items;const groups=new Map();
    for(const item of items){const y=Math.round(item.transform?.[5]||0);if(!groups.has(y))groups.set(y,[]);groups.get(y).push({x:item.transform?.[4]||0,str:item.str})}
    const lines=[...groups.entries()].sort((a,b)=>b[0]-a[0]).map(([,parts])=>parts.sort((a,b)=>a.x-b.x).map(x=>x.str).join(' '));rawLines.push(...lines);text+=lines.join(' ')+' ';
   }
   parsed=extract(text);currentFile=file;review();status('Lecture locale terminée. Vérifiez les champs avant validation.');
  }catch(err){parsed=null;currentFile=null;status(err.message||'PDF non lisible.',true)}
 };
 renderHistory();
}
function review(){
 const v=parsed.values;
 const inputs=fields.map(k=>'<label style="display:block;margin:8px 0">'+escape(labels[k])+'<input style="display:block;width:100%;max-width:360px" type="number" step="0.01" min="0" data-payroll="'+k+'" value="'+(v[k]??'')+'" placeholder="À vérifier"></label>').join('');
 const leave=['cp_n','cp_n_minus_1','rtt','recovery'].map(type=>'<fieldset style="margin:10px 0"><legend>'+escape(type)+'</legend>'+['acquired','taken','remaining'].map(k=>'<label style="margin-right:10px">'+({acquired:'Acquis',taken:'Pris',remaining:'Restant'}[k])+' <input type="number" min="0" step="0.001" style="width:90px" data-leave="'+type+':'+k+'" value="'+(parsed.leave[type]?.[k]??'')+'"></label>').join('')+'</fieldset>').join('');
 document.getElementById('payroll-review').innerHTML='<h3>2. Vérifier les données extraites</h3><p class="hint">L’extraction PDF peut se tromper, notamment sur les colonnes de cotisations. Les champs vides nécessitent une saisie manuelle. Ne validez que les valeurs vérifiées.</p><label>Début de période <input type="date" id="payroll-start" value="'+escape(v.period_start)+'"></label> <label>Fin de période <input type="date" id="payroll-end" value="'+escape(v.period_end)+'"></label><label style="display:block">Nom employeur <input id="payroll-employer" value="'+escape(v.employer_name)+'"></label><label style="display:block">SIRET employeur <input id="payroll-siret" value="'+escape(v.employer_siret)+'" maxlength="14"></label><div class="row">'+inputs+'</div><h3>Compteurs de congés</h3>'+leave+'<label style="display:block;margin:12px 0"><input type="checkbox" id="payroll-confirm"> Je confirme avoir vérifié les montants et autorise leur stockage privé.</label><button type="button" id="payroll-save">3. Enregistrer ce bulletin</button>';
 document.getElementById('payroll-save').onclick=save;
}
async function save(){
 const button=document.getElementById('payroll-save');button.disabled=true;let path=null;
 try{
  if(!document.getElementById('payroll-confirm').checked)throw Error('Confirmez la vérification des données.');
  const start=document.getElementById('payroll-start').value,end=document.getElementById('payroll-end').value;
  if(!start||!end||start>end)throw Error('Dates de période invalides.');
  const values={};
  for(const k of fields){const el=document.querySelector('[data-payroll="'+k+'"]');if(el.value.trim()===''){values[k]=null;continue}const val=Number(el.value);if(!Number.isFinite(val)||val<0)throw Error('Valeur incorrecte : '+labels[k]);values[k]=val}
  if([values.net_before_income_tax,values.withholding_tax_amount,values.net_paid].every(x=>x!==null)&&Math.abs(values.net_before_income_tax-values.withholding_tax_amount-values.net_paid)>0.03){if(!confirm('Attention : net avant impôt − PAS diffère du net versé (indemnités ou retenues possibles). Avez-vous vérifié ce montant sur le bulletin ?'))throw Error('Vérification des montants nécessaire.');}
  // Le net social ne se déduit pas systématiquement du brut moins les cotisations : ne pas bloquer à tort.
  const employer=document.getElementById('payroll-employer').value.trim(),siret=document.getElementById('payroll-siret').value.trim();
  if(!employer||!/^[0-9]{14}$/.test(siret))throw Error('Employeur ou SIRET invalide.');
  const leave=[];
  for(const type of ['cp_n','cp_n_minus_1','rtt','recovery']){
   const record={leave_type:type};
   for(const k of ['acquired','taken','remaining']){const x=document.querySelector('[data-leave="'+type+':'+k+'"]');record[k]=x.value.trim()===''?null:Number(x.value);if(record[k]!==null&&(!Number.isFinite(record[k])||record[k]<0))throw Error('Compteur invalide')}
   if(['acquired','taken','remaining'].some(k=>record[k]!==null))leave.push(record);
  }
  const {data:auth,error:authError}=await client.auth.getUser();if(authError||!auth?.user||auth.user.id!==user.id)throw Error('Session expirée, reconnectez-vous.');
  const {data:existing,error:checkError}=await client.from('payroll_slips').select('id').eq('user_id',user.id).eq('employer_siret',siret).eq('period_start',start).eq('period_end',end).maybeSingle();
  if(checkError)throw checkError;if(existing)throw Error('Ce bulletin est déjà enregistré : doublon évité.');
  path=user.id+'/'+crypto.randomUUID()+'.pdf';
  const uploaded=await client.storage.from('payroll-private').upload(path,currentFile,{contentType:'application/pdf',upsert:false,cacheControl:'0'});
  if(uploaded.error)throw uploaded.error;
  const {data:slip,error:dbError}=await client.from('payroll_slips').insert({...values,user_id:user.id,employer_name:employer,employer_siret:siret,period_start:start,period_end:end,source_filename:currentFile.name,storage_path:path,extraction_status:'reviewed',additional_data:{source:'browser_pdf_review',leave_reviewed:true}}).select('id').single();
  if(dbError)throw dbError;
  const {error:leaveError}=leave.length?await client.from('payroll_leave_balances').insert(leave.map(x=>({...x,slip_id:slip.id,user_id:user.id}))):{error:null};
  if(leaveError){await client.from('payroll_slips').delete().eq('id',slip.id);throw leaveError}
  status('Bulletin et congés enregistrés. Les lignes de cotisations détaillées nécessitent encore un parseur validé.');parsed=null;currentFile=null;view();
 }catch(err){if(path)await client.storage.from('payroll-private').remove([path]);status(err.message||'Échec de l’enregistrement.',true)}
 finally{button.disabled=false}
}
async function renderHistory(){
 const target=document.getElementById('payroll-history');if(!target||!user)return;
 const {data,error}=await client.from('payroll_slips').select('id,period_start,period_end,employer_name,gross_salary,net_paid,withholding_tax_amount,storage_path').order('period_end',{ascending:false}).limit(100);
 if(error){target.textContent='Historique indisponible : '+error.message;return}
 target.replaceChildren();
 if(!data.length){target.textContent='Aucun bulletin enregistré pour le moment.';return}
 for(const item of data){
 const row=document.createElement('div');row.style='padding:12px;border:1px solid var(--border);border-radius:10px;margin:8px 0';
 const title=document.createElement('strong');title.textContent=item.period_end+' · '+item.employer_name;
 const info=document.createElement('p');info.textContent='Brut : '+money(item.gross_salary)+' · Net après impôt : '+money(item.net_paid)+' · PAS : '+money(item.withholding_tax_amount);
 const download=document.createElement('button');download.textContent='Consulter PDF';download.disabled=!item.storage_path;download.type='button';download.onclick=async()=>{const {data,error}=await client.storage.from('payroll-private').createSignedUrl(item.storage_path,60);if(error)status(error.message,true);else window.open(data.signedUrl,'_blank','noopener')};
 const del=document.createElement('button');del.textContent='Supprimer';del.type='button';del.style.marginLeft='10px';del.onclick=async()=>{if(!confirm('Supprimer définitivement ce bulletin et ses données ?'))return;const {error}=await client.from('payroll_slips').delete().eq('id',item.id);if(error){status(error.message,true);return}if(item.storage_path){const removed=await client.storage.from('payroll-private').remove([item.storage_path]);if(removed.error)status('Données supprimées, mais suppression du PDF à vérifier : '+removed.error.message,true)}renderHistory()};
 row.append(title,info,download,del);target.append(row);
 }
}
async function boot(){if(!client){status('Configuration Supabase manquante.',true);return}const {data}=await client.auth.getUser();user=data?.user||null;view();client.auth.onAuthStateChange((_e,session)=>{const id=session?.user?.id||null;if(id!==user?.id){user=session?.user||null;parsed=null;currentFile=null;view()}})}
boot();
})();

(function(){
'use strict';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('fr-FR')+' €';
const main=document.querySelector('main'),form=main.querySelector('section'),aside=main.querySelector('aside');
const sim=document.createElement('div');sim.id='simulation';sim.append(form,aside);
const matrix=document.createElement('section');matrix.id='matrix';const breakdown=document.createElement('section');breakdown.id='breakdown';
main.replaceChildren(matrix,sim,breakdown);main.className='new-layout';
const nav=document.createElement('nav');nav.className='tabbar';nav.setAttribute('aria-label','Onglets');main.before(nav);
const labels=['1 · Matrice fiscale','2 · Simulateur','3 · Déclarants et conseils'];
[ matrix,sim,breakdown ].forEach((panel,i)=>{const b=document.createElement('button');b.textContent=labels[i];b.type='button';b.onclick=()=>{[matrix,sim,breakdown].forEach((p,j)=>p.hidden=j!==i);[...nav.children].forEach((n,j)=>n.setAttribute('aria-selected',String(j===i)));if(i===0)drawMatrix();if(i===2)drawBreakdown()};nav.append(b)});
nav.children[1].click();
const style=document.createElement('style');style.textContent='.tabbar{max-width:1140px;margin:-35px auto 46px;padding:0 16px;display:flex;gap:8px;position:relative}.tabbar button{flex:1;border:1px solid var(--border);background:var(--card);color:var(--fg);border-radius:12px;padding:13px 5px;cursor:pointer}.tabbar button[aria-selected=true]{background:#4f46e5;color:white}.new-layout{display:block;margin-top:-30px}.new-layout [hidden]{display:none!important}#simulation{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px}#matrix,#breakdown{max-width:950px;margin:auto}.tax-matrix{width:100%;border-collapse:collapse}.tax-matrix td,.tax-matrix th{padding:9px;border-bottom:1px solid var(--border);text-align:left}.tax-matrix input{max-width:150px}.pay-record{border:1px solid var(--border);border-radius:10px;padding:10px;margin:10px 0}.pay-record input{max-width:145px}.pay-record label{margin-top:6px}.pay-record button{padding:8px;background:var(--accent);border:0;color:white;border-radius:8px;cursor:pointer}.pay-fields{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.hint-warn{border-left:4px solid #f59e0b;padding:10px;background:#f59e0b12}@media(max-width:800px){#simulation{grid-template-columns:1fr}.tabbar button{font-size:.8rem}}@media(max-width:550px){.pay-fields,.split{grid-template-columns:1fr}}';document.head.append(style);
const original=JSON.parse(JSON.stringify(parameters)),storageKey='simulator-tax-matrix-v3';
try{const saved=JSON.parse(localStorage.getItem(storageKey)||'{}');for(const y of Object.keys(saved))if(parameters[y]&&saved[y].bands?.length===5){parameters[y]=saved[y];parameters[y].bands[4][1]=Infinity}}catch(e){}
function persist(){try{localStorage.setItem(storageKey,JSON.stringify(parameters))}catch(e){}}
function drawMatrix(){
const year=$('year').value,p=parameters[year];p.bands[4][1]=Infinity;matrix.replaceChildren();
const card=document.createElement('div');card.className='card';card.innerHTML='<h2>Barème et paramètres modifiables — revenus '+(2000+Number(year))+'</h2><p class="hint hint-warn">Les valeurs modifiées sont propres à votre navigateur et ne constituent pas un barème officiel. La simulation des revenus 2026 reste provisoire.</p>';
const t=document.createElement('table');t.className='tax-matrix';t.innerHTML='<thead><tr><th>Tranche</th><th>Seuil inférieur (€)</th><th>Taux (%)</th></tr></thead>';const tb=document.createElement('tbody');
p.bands.forEach((band,i)=>{const tr=document.createElement('tr'),label=document.createElement('td');label.textContent='Tranche '+(i+1);tr.append(label);[0,2].forEach(k=>{const td=document.createElement('td'),input=document.createElement('input');input.type='number';input.min=0;input.step=k===2?'0.1':'1';input.value=k===2?band[k]*100:band[k];input.disabled=k===0&&i===0;input.onchange=()=>{const v=Number(input.value);if(!Number.isFinite(v)||v<0||(k===2&&v>100)||(k===0&&i>0&&v<=p.bands[i-1][0])||(k===0&&i<4&&v>=p.bands[i+1][0])){alert('Seuil ou taux invalide');drawMatrix();return}if(k===0){band[0]=v;p.bands[i-1][1]=v}else band[2]=v/100;persist();calculate()};td.append(input);tr.append(td)});tb.append(tr)});t.append(tb);card.append(t);
for(const [key,title] of [['deductionMin','Abattement minimum (€)'],['deductionMax','Abattement maximum (€)'],['halfShareCap','Plafond indicatif par demi-part (€)']]){const l=document.createElement('label');l.textContent=title;const input=document.createElement('input');input.type='number';input.min='0';input.value=p[key];input.onchange=()=>{p[key]=Math.max(0,Number(input.value)||0);persist();calculate()};card.append(l,input)}
const reset=document.createElement('button');reset.className='small-btn';reset.textContent='Rétablir les paramètres initiaux';reset.onclick=()=>{parameters[year]=JSON.parse(JSON.stringify(original[year]));parameters[year].bands[4][1]=Infinity;persist();drawMatrix();calculate()};card.append(reset);matrix.append(card)
}
$('year').addEventListener('change',drawMatrix);
const records=[[],[]];
function parseAmount(s){s=s.trim().replace(/[\u00a0\u202f ]/g,'');if(/^\d{4,7}$/.test(s))return Number(s)/100;return Number(s.replace(/\.(?=\d{3})/g,'').replace(',','.'))}
function amounts(s){return [...s.matchAll(/\d{1,3}(?:[ \u00a0\u202f]\d{3})*[.,]\d{2}|\d+[.,]\d{2}|\d{1,7}[ \u00a0\u202f]\d{2}|\b\d{4,7}\b/g)].map(m=>parseAmount(m[0])).filter(Number.isFinite)}
function parsePay(text,name){
const lines=text.split('\n').map(x=>x.trim()).filter(Boolean),find=re=>lines.find(x=>re.test(x))||'';
const y=/20(24|25|26)/.exec(name)||/20(24|25|26)/.exec(text.slice(0,1200));
const out={name,year:y?y[0]:'20'+$('year').value,month:null,net:null,pas:null,annualNet:null,annualPas:null};
const month=/20(?:24|25|26)[_-]?(0[1-9]|1[012])|(?:^|[_-])(0[1-9]|1[012])[_-]20(?:24|25|26)/.exec(name);
if(month)out.month=Number(month[1]||month[2]);else{const words=['JANVIER','FEVRIER','MARS','AVRIL','MAI','JUIN','JUILLET','AOUT','SEPTEMBRE','OCTOBRE','NOVEMBRE','DECEMBRE'];const normalized=text.slice(0,1200).toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');for(let i=0;i<12;i++)if(normalized.includes(words[i]+' '+out.year)){out.month=i+1;break}}
let a=find(/^NET FISCAL\b/i);if(a){const n=amounts(a.replace(/^NET FISCAL/i,''));if(n.length>=2){out.net=n[0];out.annualNet=n[1]}}
a=find(/MONTANT NET IMPOSABLE/i);if(a){const n=amounts(a.replace(/^.*?MONTANT NET IMPOSABLE/i,''));if(n.length){out.net=n[0];if(n.length>1)out.annualNet=n.at(-1)}}
const annual=find(/^ANNUEL\b/i),monthly=find(/^MENSUEL\b/i);if(annual&&monthly){const n=amounts(annual),m=amounts(monthly);if(n.length>=4&&m.length>=4){out.annualNet??=n[3];out.net??=m[3]}}
a=find(/CUMUL PAS ANNUEL/i);if(a){const n=amounts(a);if(n.length)out.annualPas=n.at(-1)}
a=find(/^PRELEVEMENT A LA SOURCE\b/i);if(a){const n=amounts(a.replace(/^PRELEVEMENT A LA SOURCE/i,''));if(n.length>=2){out.pas=n[0];out.annualPas=n[1]}}
a=find(/^IMPOT SUR LE REVENU PRELEVE\b/i);if(a){const n=amounts(a.replace(/^IMPOT SUR LE REVENU PRELEVE(?: A LA SOURCE)?/i,''));if(n.length>=3){out.pas=n.at(-1);if(n.length>=4){out.pas=n.at(-2);out.annualPas=n.at(-1)}}}
a=find(/IMPOT SUR LE REVENU PRELEVE A LA SOURCE - PAS/i);if(a){const n=amounts(a.replace(/^.*?IMPOT SUR LE REVENU PRELEVE A LA SOURCE - PAS/i,''));if(n.length)out.pas=n.at(-1)}
return out;
}
async function readPdf(file){
if(!window.pdfjsLib)throw Error('Bibliothèque PDF.js indisponible');
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer()}).promise;const lines=[];
for(let i=1;i<=Math.min(8,pdf.numPages);i++){const page=await pdf.getPage(i),items=(await page.getTextContent()).items.filter(x=>x.str?.trim()),groups=new Map();
for(const item of items){const y=Math.round((item.transform?.[5]||0)/3)*3;if(!groups.has(y))groups.set(y,[]);groups.get(y).push(item)}
for(const y of [...groups.keys()].sort((a,b)=>b-a))lines.push(groups.get(y).sort((a,b)=>a.transform[4]-b.transform[4]).map(x=>x.str).join(' '))}
return parsePay(lines.join('\n'),file.name);
}
function yearly(k,key){
const arr=records[k].filter(r=>r.year==='20'+$('year').value),cum=key==='net'?'annualNet':'annualPas';
const cumulative=arr.filter(r=>Number.isFinite(r[cum])).sort((a,b)=>(b.month||0)-(a.month||0));
if(cumulative.length)return {value:cumulative[0][cum],source:'cumul '+(cumulative[0].month||'?')+'/'+cumulative[0].year,complete:cumulative[0].month===12};
const monthly=arr.filter(r=>Number.isFinite(r[key]));return {value:monthly.reduce((a,r)=>a+r[key],0),source:monthly.length+' bulletin(s) mensuels',complete:monthly.length>=12};
}
window.taxPayrollClear=function(){records.forEach(arr=>arr.splice(0));};
window.taxPayrollSnapshot=function(){return [0,1].map(k=>({net:yearly(k,'net'),pas:yearly(k,'pas'),count:records[k].length}))};
showPeople=function(){
const host=$('people');host.replaceChildren();
for(let k=0;k<(state.status==='couple'?2:1);k++){const person=state.people[k],box=document.createElement('div');box.innerHTML='<h3>Déclarant '+(k+1)+'</h3><label class="upload">Importer des bulletins PDF <input type="file" accept=".pdf,application/pdf" multiple></label><div class="records"></div><div class="row"><div><label>Net fiscal annuel corrigé (€)</label><input class="annual" type="number" min="0"></div><div><label>Autres revenus salariaux (€)</label><input class="extra" type="number" min="0"></div><div><label>Frais réels (€)</label><input class="expenses" type="number" min="0"></div><div><label>PAS annuel corrigé (€)</label><input class="pas" type="number" min="0"></div></div><p class="hint extraction"></p>';host.append(box);
const annual=box.querySelector('.annual'),pas=box.querySelector('.pas');annual.value=person.manual??'';pas.value=person.manualPas??'';box.querySelector('.extra').value=person.extra||'';box.querySelector('.expenses').value=person.expenses||'';
annual.oninput=()=>{person.manual=annual.value===''?null:Math.max(0,Number(annual.value)||0);calculate()};
pas.oninput=()=>{person.manualPas=pas.value===''?null:Math.max(0,Number(pas.value)||0);calculate()};
box.querySelector('.extra').oninput=e=>{person.extra=Math.max(0,Number(e.target.value)||0);calculate()};
box.querySelector('.expenses').oninput=e=>{person.expenses=Math.max(0,Number(e.target.value)||0);calculate()};
box.querySelector('[type=file]').onchange=async e=>{for(const file of [...e.target.files||[]]){if(records[k].length>=24)break;if(file.size>20e6||(!/\.pdf$/i.test(file.name)&&file.type!=='application/pdf'))continue;const r={name:file.name,year:'20'+$('year').value,month:null,net:null,pas:null,annualNet:null,annualPas:null,error:'Lecture en cours'};records[k].push(r);draw();try{Object.assign(r,await readPdf(file));r.error=''}catch(err){r.error=err.message}draw()}e.target.value=''};
function draw(){const list=box.querySelector('.records');list.replaceChildren();records[k].forEach((r,i)=>{const wrap=document.createElement('div');wrap.className='pay-record';const title=document.createElement('strong');title.textContent=r.name;wrap.append(title);const grid=document.createElement('div');grid.className='pay-fields';for(const [key,label] of [['year','Année'],['month','Mois'],['net','Net fiscal du mois'],['pas','PAS du mois'],['annualNet','Net fiscal cumulé'],['annualPas','PAS cumulé']]){const d=document.createElement('div'),l=document.createElement('label'),input=document.createElement('input');l.textContent=label;input.type=key==='year'?'text':'number';if(key!=='year'){input.min='0';input.step=key==='month'?'1':'.01'}input.value=r[key]??'';input.onchange=()=>{r[key]=key==='year'?input.value.trim():input.value===''?null:Math.max(0,Number(input.value)||0);update();calculate()};d.append(l,input);grid.append(d)}wrap.append(grid);const note=document.createElement('p');note.className='hint';note.textContent=r.error||'Valeurs extraites automatiquement : à vérifier';wrap.append(note);const del=document.createElement('button');del.textContent='Supprimer';del.onclick=()=>{records[k].splice(i,1);draw()};wrap.append(del);list.append(wrap)});update();calculate()}
function update(){const net=yearly(k,'net'),paid=yearly(k,'pas');if(person.manual===null)annual.value=net.value||'';if(person.manualPas==null)pas.value=paid.value||'';box.querySelector('.extraction').textContent='Net fiscal : '+net.source+' ; PAS : '+paid.source+'. '+(!net.complete||!paid.complete?'Année incomplète possible. Ne pas extrapoler automatiquement.':'Cumuls de décembre détectés.')}
draw();
}};
const polish=document.createElement('style');polish.textContent=`#simulation{align-items:start}#simulation>*,#simulation .card,#simulation .stack{min-width:0}#simulation .detail{width:100%;table-layout:fixed}#simulation .detail tr{display:grid;grid-template-columns:minmax(0,1fr) minmax(105px,auto);gap:12px;align-items:center;border-bottom:1px solid var(--border)}#simulation .detail td{border:0;min-width:0;overflow-wrap:anywhere;white-space:normal;padding:12px 0;line-height:1.45}#simulation .detail td:last-child{text-align:right;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}#simulation .detail tr:has(.pas-explanation){display:block}#simulation .detail .pas-explanation{display:block;white-space:normal;text-align:left;font-weight:400;font-size:.81rem;color:var(--muted);padding:14px 0;line-height:1.65;overflow-wrap:anywhere}#simulation .detail .pas-important-row{font-weight:700;color:var(--fg)}#simulation .detail .pas-important-row td{font-weight:750}.pas-reconciliation{border:1px solid var(--border);border-radius:14px;background:linear-gradient(135deg,#4f46e50c,#0891b20c);padding:16px;margin:0 0 14px;min-width:0}.pas-eyebrow{font-size:.7rem;font-weight:750;letter-spacing:.07em;color:var(--muted);margin:0 0 8px}.pas-headline{font-size:clamp(1.1rem,2.3vw,1.45rem);font-weight:800;line-height:1.3;overflow-wrap:anywhere}.pas-subline{font-size:.79rem;color:var(--muted);line-height:1.6;margin:8px 0 0;overflow-wrap:anywhere}@media(max-width:450px){#simulation .detail tr{grid-template-columns:minmax(0,1fr) minmax(85px,auto);gap:8px}#simulation .detail td{font-size:.8rem}}@media print{#simulation .detail tr{break-inside:avoid}.pas-reconciliation{break-inside:avoid}}`;polish.textContent+=' .pas-explanation-block{display:block;max-width:100%;min-width:0;margin-top:14px;padding:14px 16px;background:var(--bg);border:1px solid var(--border);border-radius:12px;line-height:1.55;overflow-wrap:anywhere;white-space:normal}.pas-explanation-block strong{display:block;font-size:.85rem}.pas-explanation-block p{margin:7px 0 0;font-size:.82rem;color:var(--muted);white-space:normal;overflow-wrap:anywhere}.pas-explanation-block .pas-formula{font-weight:750;color:var(--fg);font-variant-numeric:tabular-nums;font-size:1rem}@media print{.pas-explanation-block{break-inside:avoid;page-break-inside:avoid}}';document.head.append(polish);
const previous=calculate;
let result=null;
calculate=function(){
const p=parameters[$('year').value],n=state.status==='couple'?2:1,people=[];
let salaryGross=0,professional=0;
for(let k=0;k<n;k++){const person=state.people[k],sal=(person.manual??yearly(k,'net').value)+person.extra,paid=person.manualPas??yearly(k,'pas').value;people.push({salary:sal,paid});salaryGross+=sal;professional+=Math.min(sal,person.expenses>0?person.expenses:sal>0?Math.min(Math.max(sal*.1,p.deductionMin),p.deductionMax):0)}
const taxable=Math.max(0,salaryGross-professional+Number($('other').value||0)-Number($('pension').value||0)-Math.min(Number($('per').value||0),Number($('perLimit').value||0)));
const s=shares(),baseTax=taxForIncome(taxable/s.base,p.bands)*s.base,familyTax=taxForIncome(taxable/s.total,p.bands)*s.total;
const tax=Math.max(familyTax,baseTax-(s.total-s.base)*2*p.halfShareCap);
const num=id=>Math.max(0,Number($(id).value)||0);
const donation=Math.min(tax,taxable*.2,Math.min(num('don75'),1000)*.75+(Math.max(0,num('don75')-1000)+num('don66'))*.66);
const homeCredit=Math.round(Math.min(12000,Math.max(0,num('home')-num('homeAid')))*.5);const careCredit=Math.round(Math.min(num('care'),3500*Math.max(1,num('children')))*.5);const credits=homeCredit+careCredit;
// Décote légale : après plafonnement du quotient familial, avant réductions et crédits.
// Revenus 2026 : paramètres 2025 utilisés à titre provisoire.
const decoteRule=$('year').value==='24'?{single:889,couple:1470,rate:.4525}:{single:897,couple:1483,rate:.4525};
const decoteCeiling=n===2?decoteRule.couple:decoteRule.single;
const decote=Math.min(tax,Math.max(0,Math.round(decoteCeiling-decoteRule.rate*tax)));
const afterDecote=Math.max(0,tax-decote);
const donationApplied=Math.min(afterDecote,donation);
const due=Math.max(0,Math.round(afterDecote-donationApplied-credits));
const pasDeclarant1=Math.max(0,Number(people[0]?.paid)||0),pasDeclarant2=n===2?Math.max(0,Number(people[1]?.paid)||0):0;
const pasComplementaire=num('withheld'),pas=pasDeclarant1+pasDeclarant2+pasComplementaire;
const advanceJanuary=num('creditAdvance'),advanceImmediate=num('immediateAdvance');
const balance=Math.round(due+advanceJanuary+advanceImmediate-pas);
$('estimate').textContent=fmt(due);$('resultNote').textContent='Impôt indicatif avec décote 2025/2026 estimée, hors cas particuliers. PAS total du foyer : '+fmt(pas)+' (déclarant 1 : '+fmt(pasDeclarant1)+(n===2?' + déclarant 2 : '+fmt(pasDeclarant2):'')+(pasComplementaire?' + autres PAS : '+fmt(pasComplementaire):'')+')';
$('average').textContent=taxable?(100*due/taxable).toFixed(1).replace('.',',')+' %':'0 %';
$('marginal').textContent=Math.round((p.bands.filter(b=>taxable/s.total>b[0]).at(-1)||p.bands[0])[2]*100)+' %';$('shares').textContent=String(s.total).replace('.',',');
const rows=[['Salaires imposables',salaryGross],['Frais professionnels',-professional],['Revenu net imposable',taxable],['Impôt après plafonnement',tax],['Décote',-decote],['Impôt après décote',afterDecote],['Réduction dons',-donationApplied],['Crédits estimés',-credits],['Impôt net estimé',due],['PAS déjà payé — déclarant 1',-pasDeclarant1],...(n===2?[['PAS déjà payé — déclarant 2',-pasDeclarant2]]:[]),...(pasComplementaire?[['Autres prélèvements déjà payés',-pasComplementaire]]:[]),['Total des impôts déjà avancés (PAS)',-pas],['Avance de réductions et crédits déjà reçue',advanceJanuary],['Avance immédiate emploi à domicile déjà utilisée',advanceImmediate],[balance<0?'Remboursement estimé':'Solde estimé',Math.abs(balance)]];
const body=$('details');body.replaceChildren();
let summary=document.getElementById('pas-reconciliation');if(!summary){summary=document.createElement('section');summary.id='pas-reconciliation';summary.className='pas-reconciliation';body.closest('.card').insertBefore(summary,body.closest('table'));}
summary.replaceChildren();const eyebrow=document.createElement('p');eyebrow.className='pas-eyebrow';eyebrow.textContent='RÉGULARISATION ESTIMÉE DU FOYER';const headline=document.createElement('div');headline.className='pas-headline';headline.textContent=(balance<0?'Remboursement estimé':'Reste à payer estimé')+' : '+fmt(Math.abs(balance));const sub=document.createElement('p');sub.className='pas-subline';sub.textContent='Impôt '+fmt(due)+' − déjà prélevé '+fmt(pas)+' + avances de crédits '+fmt(advanceJanuary+advanceImmediate);summary.append(eyebrow,headline,sub);for(const [label,value] of rows){const tr=document.createElement('tr'),a=document.createElement('td'),b=document.createElement('td');a.textContent=label;b.textContent=fmt(value);if(label==='Décote'||label==='Total des impôts déjà avancés (PAS)'||label==='Impôt net estimé'||label==='Solde estimé'||label==='Remboursement estimé')tr.className='pas-important-row';tr.append(a,b);body.append(tr)}
// Présenter l'explication hors du tableau : un texte long dans un <tr> déborde à l'impression.
let explanation=document.getElementById('pas-explanation');if(!explanation){explanation=document.createElement('div');explanation.id='pas-explanation';explanation.className='pas-explanation-block';body.closest('.card').append(explanation)}
explanation.replaceChildren();
const explanationTitle=document.createElement('strong');explanationTitle.textContent='Comment est calculé votre solde ?';
const formula=document.createElement('p');formula.className='pas-formula';formula.textContent=fmt(due)+' + '+fmt(advanceJanuary+advanceImmediate)+' − '+fmt(pas)+' = '+fmt(balance);
const meaning=document.createElement('p');meaning.textContent=(balance<0?'L’administration pourrait vous rembourser '+fmt(-balance)+'.':'Il resterait environ '+fmt(balance)+' à payer.')+' Les '+fmt(pas)+' de prélèvement à la source ont déjà été payés : ils ne constituent pas une nouvelle dépense.';
explanation.append(explanationTitle,formula,meaning);
result={people,due,pas,balance,decote,advanceJanuary,advanceImmediate};if(!breakdown.hidden)drawBreakdown();
};
function drawBreakdown(){if(!result)return;breakdown.innerHTML='<div class="card"><h2>Répartition indicative de l’impôt entre déclarants</h2><p class="hint hint-warn">L’impôt sur le revenu est calculé pour le foyer. La part d’impôt ci-dessous est une ventilation indicative au prorata des salaires, et non un impôt individuel légal. Le taux de PAS constaté est calculé séparément pour chaque déclarant : PAS annuel ÷ salaire net fiscal annuel. Il ne correspond pas nécessairement au taux officiel appliqué sur les bulletins de paie.</p><div class="split"></div></div><div class="card"><h2>Propositions pour réduire l’impôt</h2><p class="hint">Comparer les frais réels avec l’abattement de 10 %, vérifier le plafond de déduction PER figurant sur l’avis d’impôt, conserver les justificatifs des dons et dépenses d’emploi à domicile, et contrôler les dépenses de garde éligibles. Chaque option dépend de votre situation ; aucune économie n’est garantie.</p><p class="hint">Modifier le taux de prélèvement à la source peut améliorer la trésorerie mais ne réduit pas l’impôt final.</p></div>';
const total=result.people.reduce((a,p)=>a+p.salary,0);result.people.forEach((p,i)=>{const ratio=total?p.salary/total:1/result.people.length,part=result.due*ratio,card=document.createElement('div');card.className='card';card.innerHTML='<h3>Déclarant '+(i+1)+'</h3>';const table=document.createElement('table');table.className='detail';for(const [label,v] of [['Salaires imposables',fmt(p.salary)],['Part des revenus',(100*ratio).toFixed(1).replace('.',',')+' %'],['Part indicative de l’impôt',fmt(part)],['Taux effectif de PAS constaté',p.salary?(100*p.paid/p.salary).toFixed(2).replace('.',',')+' %':'Non calculable'],['PAS annuel constaté',fmt(p.paid)],['Écart indicatif',fmt(part-p.paid)]]){const tr=document.createElement('tr'),a=document.createElement('td'),b=document.createElement('td');a.textContent=label;b.textContent=v;tr.append(a,b);table.append(tr)}card.append(table);breakdown.querySelector('.split').append(card)})}
// Les écouteurs historiques du formulaire appellent l’ancienne fonction par référence.
// Recalculer après eux pour que le détail du PAS reste cohérent à chaque modification.
document.querySelectorAll('#simulation input:not([type=file]),#simulation select,#year').forEach(el=>{el.addEventListener('input',()=>calculate());el.addEventListener('change',()=>calculate())});
$('status').addEventListener('click',()=>queueMicrotask(calculate));
$('year').addEventListener('change',()=>{showPeople();calculate()});showPeople();drawMatrix();calculate();
})();
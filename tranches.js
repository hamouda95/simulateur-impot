(()=>{'use strict';
const aside=document.querySelector('#simulation > aside .stack');if(!aside)return;
const card=document.createElement('div');card.className='card';card.id='tax-brackets';card.innerHTML='<h2>Impôt par tranche et par taux</h2><p class="hint">Répartition du calcul progressif selon le revenu imposable par part. Montants avant plafonnement du quotient familial, réductions, crédits et autres corrections.</p><div id="bracket-table"></div><p class="hint" id="bracket-note"></p>';
const details=aside.querySelector('.card:nth-child(2)');if(details)details.after(card);else aside.append(card);
const css=document.createElement('style');css.textContent='#tax-brackets .tax-row{display:grid;grid-template-columns:72px 1fr 95px;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);font-size:.87rem}#tax-brackets .tax-row strong{text-align:right}#tax-brackets .tax-track{height:8px;border-radius:9px;background:var(--border);overflow:hidden;margin-top:5px}#tax-brackets .tax-fill{height:100%;background:var(--accent);border-radius:9px}#tax-brackets .tax-total{display:flex;justify-content:space-between;font-weight:800;margin-top:14px}';document.head.append(css);
const fmt=n=>Math.round(n).toLocaleString('fr-FR')+' €';
function redraw(){
try{
const y=document.getElementById('year').value,p=parameters[y],part=Number(document.getElementById('shares').textContent.replace(',','.'))||1;
const taxableRow=[...document.querySelectorAll('#details tr')].find(tr=>/Revenu net imposable/i.test(tr.cells[0]?.textContent||''));
if(!taxableRow)return;
const taxable=Number(taxableRow.cells[1].textContent.replace(/[^\d,-]/g,'').replace(',','.'))||0;
const perPart=taxable/part;
const rows=p.bands.map(([start,end,rate])=>{const base=Math.max(0,Math.min(perPart,end)-start)*part;return {rate,base,tax:base*rate,start,end}});
const total=rows.reduce((a,b)=>a+b.tax,0),max=Math.max(...rows.map(r=>r.tax),1),host=document.getElementById('bracket-table');host.replaceChildren();
for(const r of rows){
const row=document.createElement('div');row.className='tax-row';const rate=document.createElement('b');rate.textContent=(r.rate*100).toLocaleString('fr-FR')+' %';
const center=document.createElement('div'),range=document.createElement('span');range.className='hint';range.textContent=fmt(r.start)+' à '+(Number.isFinite(r.end)?fmt(r.end):'plus');const track=document.createElement('div');track.className='tax-track';const fill=document.createElement('div');fill.className='tax-fill';fill.style.width=(100*r.tax/max)+'%';track.append(fill);center.append(range,track);
const amount=document.createElement('strong');amount.textContent=fmt(r.tax);row.append(rate,center,amount);host.append(row)}
const footer=document.createElement('div');footer.className='tax-total';const label=document.createElement('span');label.textContent='Total au barème brut';const amount=document.createElement('span');amount.textContent=fmt(total);footer.append(label,amount);host.append(footer);
document.getElementById('bracket-note').textContent='Revenu imposable : '+fmt(taxable)+' · '+part.toLocaleString('fr-FR')+' part(s). Ce total peut différer de l’impôt final affiché.';
}catch(e){document.getElementById('bracket-note').textContent='Détail indisponible pour les données actuelles.'}
}
document.addEventListener('input',()=>setTimeout(redraw,0));document.addEventListener('change',()=>setTimeout(redraw,0));document.querySelectorAll('.tabbar button').forEach(b=>b.addEventListener('click',()=>setTimeout(redraw,0)));setTimeout(redraw,0);
})();
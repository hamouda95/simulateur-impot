/* Module de cadrage stratégique — calculs fiscaux non validés, aucun gagnant chiffré fictif. */
(()=>{
'use strict';
function init(){
 const root=document.getElementById('business-strategy');if(!root)return;
 const fmt=x=>Math.round(x).toLocaleString('fr-FR')+' €';
 root.innerHTML=`<div class="card"><h2>Stratégie d'entreprise · Comparateur</h2>
 <p class="hint">Projection du chiffre d'affaires et identification des statuts à comparer. Les revenus nets, cotisations et impôts nécessitent un moteur métier vérifié ; aucune recommandation chiffrée n'est inventée.</p>
 <div class="row"><div><label for="biz-activity">Activité</label><select id="biz-activity"><option value="data">Freelance Data / Power BI</option><option value="marketing">Agence marketing / agents IA</option><option value="ecommerce">E-commerce</option><option value="import">Commerce B2B / importation</option></select></div><div><label for="biz-experience">Années d'expérience</label><input id="biz-experience" type="number" min="0" max="60" value="6"></div></div>
 <label for="biz-description">Description libre du projet</label><textarea id="biz-description" rows="3" style="width:100%;padding:11px;border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--fg)" placeholder="Ex. freelance Power BI, 6 ans d'expérience"></textarea>
 <div class="row"><div><label for="biz-rate">CA journalier HT envisagé (€)</label><input id="biz-rate" type="number" min="0" value="550"></div><div><label for="biz-days">Jours facturés/an</label><input id="biz-days" type="number" min="0" max="366" value="180"></div>
 <div><label for="biz-expenses">Dépenses professionnelles annuelles (€)</label><input id="biz-expenses" type="number" min="0" value="8000"></div><div><label for="biz-goal">Objectif</label><select id="biz-goal"><option value="net">Revenu net personnel</option><option value="capital">Réinvestissement</option><option value="social">Protection sociale</option></select></div></div>
 <div class="card hero" style="margin-top:14px"><small>CA annuel HT estimé (hors fiscalité)</small><div class="amount" id="biz-ca">—</div><small id="biz-note"></small></div>
 <h3>Trois statuts à analyser</h3><div id="biz-options"></div>
 <p class="hint warn">La micro-entreprise n'autorise pas la déduction individuelle des frais réels. L'EURL et la SASU ont des régimes de cotisations et d'imposition différents. Le statut gagnant exige de connaître le foyer fiscal, la rémunération, les dividendes et les règles applicables à l'exercice.</p></div>`;
 const charges={
 data:'Matériel informatique, licences Power BI, cloud, formation, coworking, déplacements',
 marketing:'API IA, CRM, publicité, sous-traitance, hébergement',
 ecommerce:'Achats, stock, publicité, transport, commissions, retours',
 import:'Achats, transport, douane, stockage, assurance, transitaires'
 };
 const fields=['biz-activity','biz-rate','biz-days','biz-expenses','biz-goal'];
 function update(){
  const n=id=>Math.max(0,Number(document.getElementById(id).value)||0);
  const ca=n('biz-rate')*n('biz-days'),activity=document.getElementById('biz-activity').value,expenses=n('biz-expenses');
  document.getElementById('biz-ca').textContent=fmt(ca);
  document.getElementById('biz-note').textContent='Dépenses indiquées : '+fmt(expenses)+' · Dépenses potentielles à examiner : '+charges[activity]+'.';
  const micro=activity==='data'||activity==='marketing'?'prestations de services':'vente de marchandises';
  document.getElementById('biz-options').innerHTML=[
   ['Micro-entreprise','Cotisations sur chiffre d’affaires ; abattement forfaitaire ; seuil et catégorie '+micro+' à contrôler.'],
   ['EURL à l’IS','Rémunération gérant TNS et bénéfices conservés ; calcul des cotisations et de l’IS à intégrer.'],
   ['SASU à l’IS','Rémunération président assimilé salarié et dividendes ; calcul des charges et impôts à intégrer.']
  ].map(([title,desc])=>'<div style="border:1px solid var(--border);border-radius:10px;padding:12px;margin:8px 0"><strong>'+title+'</strong><p class="hint">'+desc+'</p><strong>Net annuel : non calculé</strong></div>').join('');
 }
 fields.forEach(id=>document.getElementById(id).addEventListener('input',update));
 update();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
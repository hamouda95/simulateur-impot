/* Parcours guidé métier : progression conditionnelle, sans simulation fiscale non vérifiée. */
(()=>{'use strict';
const init=()=>{
const host=document.getElementById('business-strategy');if(!host)return;
const state={step:0,answers:{},error:''};
const activities={data:'Freelance Data / Power BI',marketing:'Agence marketing et agents IA',ecommerce:'E-commerce',import:'Commerce B2B / importation'};
const euro=n=>Math.round(n).toLocaleString('fr-FR')+' €';
const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const questions=[
 {key:'activity',title:'Quelle activité souhaitez-vous exercer ?',help:'Votre choix détermine les questions suivantes.',type:'choice',options:Object.entries(activities)},
 {key:'stage',title:'Où en êtes-vous dans votre projet ?',type:'choice',options:[['creation','Je crée mon activité'],['existing','Je suis déjà indépendant / dirigeant'],['transition','Je suis salarié et je prépare une transition']]},
 {key:'model',title:'Comment comptez-vous générer votre chiffre d’affaires ?',type:'choice',options:a=>a.activity==='data'?[['day','Facturation à la journée (TJM)'],['project','Missions au forfait']]:a.activity==='marketing'?[['subscription','Abonnements mensuels clients'],['project','Prestations au forfait']]:[['sales','Vente de produits avec marge'],['project','Contrats ou commandes B2B']]},
 {key:'revenue',title:'Quel volume d’activité prévoyez-vous ?',type:'fields',fields:a=>a.model==='day'?[['rate','TJM HT (€)','550'],['days','Jours facturés par an','180']]:a.model==='subscription'?[['price','Revenu mensuel moyen par client (€)','1500'],['clients','Nombre moyen de clients actifs','5']]:a.model==='sales'?[['sales','Ventes annuelles HT (€)','120000'],['cost','Coût d’achat des marchandises (€)','60000']]:[['sales','CA annuel prévisionnel HT (€)','90000']]},
 {key:'costs',title:'Quels sont vos frais professionnels annuels ?',help:'Indiquez des frais réels, justifiables et exclusivement professionnels. Ne comptez pas deux fois les achats de marchandises.',type:'fields',fields:a=>[['expenses',a.model==='sales'?'Autres frais hors achats (€)':'Frais professionnels hors rémunération (€)','8000'],['experience','Années d’expérience','6']]},
 {key:'household',title:'Quelle est votre situation fiscale ?',help:'Nécessaire pour analyser le net après impôt sur le revenu.',type:'fields',fields:a=>[['parts','Nombre de parts fiscales (indicatif)','1'],['otherIncome','Autres revenus nets imposables annuels du foyer (€)','0']]},
 {key:'priority',title:'Quel est votre objectif prioritaire ?',type:'choice',options:[['net','Maximiser mon net personnel'],['invest','Réinvestir les bénéfices'],['balance','Équilibrer revenu et protection sociale']]}
];
const count=questions.length;
const opts=q=>typeof q.options==='function'?q.options(state.answers):q.options;
const fields=q=>typeof q.fields==='function'?q.fields(state.answers):q.fields;
const n=k=>Math.max(0,Number(state.answers[k])||0);
const ca=()=>state.answers.model==='day'?n('rate')*n('days'):state.answers.model==='subscription'?n('price')*n('clients')*12:n('sales');
function render(){
 const q=questions[state.step],finished=state.step===count;
 host.innerHTML='<div class="card" style="max-width:840px;margin:0 auto"><div style="display:flex;justify-content:space-between;gap:10px;align-items:center"><h2>Assistant de stratégie d’entreprise</h2><span class="hint">'+(finished?'Analyse du projet':('Étape '+(state.step+1)+' / '+count))+'</span></div><div style="height:7px;background:var(--border);border-radius:20px;overflow:hidden;margin:12px 0 22px"><div style="width:'+((finished?count:state.step)/count*100)+'%;height:100%;background:#16a34a"></div></div><div id="biz-wizard-body"></div></div>';
 const body=document.getElementById('biz-wizard-body');
 if(finished){
 const revenue=ca(),expenses=n('expenses')+(state.answers.model==='sales'?n('cost'):0);
 const options=[['Micro-entreprise','Vérifier les seuils, la nature de l’activité et le régime applicable. Frais réels non déductibles individuellement.'],['EURL à l’IS','Évaluer rémunération TNS, cotisations, IS, dividendes et frais professionnels.'],['SASU à l’IS','Évaluer salaire assimilé salarié, charges, IS et dividendes.']];
 body.innerHTML='<h3>Votre profil entrepreneurial</h3><p><strong>'+safe(activities[state.answers.activity])+'</strong> · '+safe(state.answers.stage)+' · '+safe(state.answers.priority)+'</p><div class="card hero"><small>CA annuel HT prévisionnel</small><div class="amount">'+euro(revenue)+'</div><small>Coûts annuels renseignés : '+euro(expenses)+' · Marge avant rémunération, cotisations et impôts : '+euro(revenue-expenses)+'</small></div><h3>Structures juridiques à comparer</h3>'+options.map(([title,detail])=>'<div style="border:1px solid var(--border);padding:14px;border-radius:12px;margin:10px 0"><strong>'+title+'</strong><p class="hint">'+detail+'</p><small>Net après impôts : calcul non disponible</small></div>').join('')+'<p class="hint warn">Aucun gagnant n’est affiché tant que les règles sociales et fiscales 2026, le régime de TVA, les paramètres du foyer et les scénarios de rémunération ne sont pas calculés et vérifiés. Cette synthèse est un cadrage, pas un conseil fiscal personnalisé.</p><div style="display:flex;gap:10px;flex-wrap:wrap"><button id="biz-back" type="button">← Modifier mes réponses</button><button id="biz-reset" type="button">Recommencer</button></div>';
 document.getElementById('biz-back').onclick=()=>{state.step=count-1;render()};
 document.getElementById('biz-reset').onclick=()=>{state.step=0;state.answers={};render()};return;
 }
 let controls='';
 if(q.type==='choice')controls='<div style="display:grid;gap:10px">'+opts(q).map(([value,label])=>'<label style="display:flex;align-items:center;gap:12px;border:1px solid var(--border);border-radius:12px;padding:14px;cursor:pointer"><input type="radio" name="biz-choice" value="'+safe(value)+'" '+(state.answers[q.key]===value?'checked':'')+'><span>'+safe(label)+'</span></label>').join('')+'</div>';
 else controls='<div class="row">'+fields(q).map(([key,label,def])=>'<div><label for="biz-'+key+'">'+safe(label)+'</label><input id="biz-'+key+'" type="number" min="0" step="any" value="'+safe(state.answers[key]??def)+'"></div>').join('')+'</div>';
 body.innerHTML='<h3>'+safe(q.title)+'</h3>'+(q.help?'<p class="hint">'+safe(q.help)+'</p>':'')+controls+'<p id="biz-error" role="alert" style="color:#b91c1c">'+safe(state.error)+'</p><div style="display:flex;justify-content:space-between;gap:12px;margin-top:20px"><button type="button" id="biz-prev" '+(state.step===0?'disabled':'')+'>← Retour</button><button type="button" id="biz-next" style="background:#4338ca;color:white;padding:12px 20px;border:0;border-radius:9px;cursor:pointer">'+(state.step===count-1?'Voir mon analyse →':'Continuer →')+'</button></div>';
 document.getElementById('biz-prev').onclick=()=>{state.step--;state.error='';render()};
 document.getElementById('biz-next').onclick=()=>{
  if(q.type==='choice'){
   const selected=body.querySelector('input[name="biz-choice"]:checked');
   if(!selected){state.error='Sélectionnez une réponse pour continuer.';render();return}
   const prior=state.answers[q.key];state.answers[q.key]=selected.value;
   if(prior!==selected.value&&['activity','model'].includes(q.key)){for(const k of ['model','rate','days','price','clients','sales','cost'])if(k!==q.key)delete state.answers[k]}
  }else{
   for(const [key,label] of fields(q)){const input=document.getElementById('biz-'+key);if(input.value.trim()===''||!Number.isFinite(Number(input.value))||Number(input.value)<0){state.error='Renseignez un montant valide pour : '+label;render();return}state.answers[key]=input.value}
   if(q.key==='revenue'&&ca()<=0){state.error='Le chiffre d’affaires prévisionnel doit être supérieur à zéro.';render();return}
   if(q.key==='household'&&n('parts')<1){state.error='Indiquez au moins une part fiscale.';render();return}
  }
  state.error='';state.step++;render();
 };
}
render();
};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
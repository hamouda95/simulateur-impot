(()=>{'use strict';
const $=s=>document.querySelector(s);
const header=$('header'),nav=$('.tabbar'),main=$('main'),sim=$('#simulation'),form=$('#simulation > section'),aside=$('#simulation > aside');
if(!header||!nav||!main||!form)return;
document.title='Simulateur impôt France — estimation et optimisation';
const css=document.createElement('style');
css.textContent=`
:root{--page-width:1180px}
html{scroll-behavior:smooth}body{line-height:1.5}header{padding:42px max(20px,calc((100vw - var(--page-width))/2)) 85px;background:linear-gradient(125deg,#312e81,#1d4ed8 60%,#0891b2)}
header h1{font-size:clamp(1.9rem,3.6vw,2.75rem);letter-spacing:-.045em;max-width:750px;line-height:1.1}header p{max-width:720px;line-height:1.55}
.tabbar{max-width:var(--page-width);margin:-53px auto 28px;background:var(--card);border:1px solid var(--border);border-radius:17px;padding:6px;box-shadow:0 16px 36px #0002;gap:5px}
.tabbar button{font-size:.92rem;font-weight:700;border:0;border-radius:11px;padding:15px 8px;background:transparent}
.tabbar button[aria-selected=true]{background:var(--accent);color:white}
.new-layout{max-width:var(--page-width);margin:0 auto 40px}
#simulation{grid-template-columns:minmax(0,1.5fr) minmax(320px,.9fr);gap:24px}
#simulation .card{padding:24px;border-radius:16px}
#simulation .card h2{font-size:1.15rem;letter-spacing:-.025em}
#simulation > section>.card{scroll-margin-top:30px}
#simulation > aside .stack{top:20px}
#simulation > aside .hero{background:linear-gradient(125deg,#4338ca,#2563eb 65%,#0891b2)}
#simulation .row{gap:12px 16px}
#simulation input[type=number],#simulation select{min-height:45px}
#simulation .upload{padding:18px;background:color-mix(in srgb,var(--accent) 5%,var(--card));border-radius:12px}
#simulation .upload:focus-within{outline:2px solid var(--accent)}
#simulation .card .hint{line-height:1.65}
#simulation .choice button{min-height:46px}
#simulation .detail td{padding:11px 3px}
#simulation .detail tr:last-child{background:color-mix(in srgb,var(--accent) 9%,transparent)}
#simulation .detail tr:last-child td{font-weight:800}
#simulation .pay-record{background:color-mix(in srgb,var(--accent) 3%,var(--card))}
#simulation .pay-fields input{max-width:none;width:100%}
.site-steps{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:20px}
.site-steps a{color:var(--fg);background:var(--card);border:1px solid var(--border);padding:10px 13px;border-radius:10px;text-decoration:none;font-size:.85rem;font-weight:650}
.site-steps a:hover{border-color:var(--accent)}
.site-steps a:focus-visible,.site-actions button:focus-visible{outline:3px solid var(--accent);outline-offset:3px}
.site-section-title{display:flex;align-items:center;gap:12px}
.site-section-title .step-number{display:grid;place-items:center;width:34px;height:34px;flex:none;border-radius:10px;background:color-mix(in srgb,var(--accent) 15%,var(--card));color:var(--accent);font-weight:800}
.site-section-title h2{margin:0}
.site-intro{border-left:4px solid var(--accent);padding-left:14px;margin:13px 0 18px;color:var(--muted);font-size:.88rem}
.site-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:16px}
.site-actions button{background:var(--accent);color:white;border:0;border-radius:10px;padding:12px 18px;font:inherit;font-weight:700;cursor:pointer}
.site-actions button.secondary{background:var(--card);border:1px solid var(--border);color:var(--fg)}
.site-mode{display:flex;gap:8px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
.site-mode button{border:1px solid var(--border);border-radius:9px;background:var(--card);color:var(--fg);padding:9px 15px;cursor:pointer}
.site-mode button[aria-pressed=true]{background:var(--accent);color:white;border-color:var(--accent)}
.site-advanced[hidden]{display:none!important}
.site-advanced summary{cursor:pointer;font-weight:700;padding:8px 0}
.site-topline{max-width:var(--page-width);margin:0 auto;padding:12px 16px;font-size:.79rem;color:var(--muted);display:flex;gap:16px;justify-content:space-between;flex-wrap:wrap}
.site-topline a{color:inherit}
#matrix .card,#breakdown .card{border-radius:16px}
@media(max-width:900px){#simulation{grid-template-columns:1fr}#simulation > aside .stack{position:static}.tabbar{margin-left:16px;margin-right:16px}}
@media(max-width:560px){header{padding-bottom:75px}.tabbar{margin-top:-45px;gap:2px}.tabbar button{font-size:.74rem;padding:12px 4px}.new-layout{padding:0 12px}#simulation .card{padding:17px}.site-steps{display:grid;grid-template-columns:repeat(2,1fr)}.site-steps a{text-align:center}.site-actions button{flex:1}}
`;document.head.append(css);
const topline=document.createElement('div');topline.className='site-topline';topline.innerHTML='<span>Simulateur indépendant · Aucune connexion requise</span><span><a href="https://www.impots.gouv.fr/" target="_blank" rel="noopener noreferrer">Source officielle : impots.gouv.fr ↗</a></span>';document.body.prepend(topline);
const sections=[...form.querySelectorAll(':scope > .card')];
const ids=['start','household','income','deductions','credits','special'];
sections.forEach((card,i)=>{card.id='step-'+ids[i]});
const steps=document.createElement('div');steps.className='site-steps';steps.setAttribute('aria-label','Étapes de la simulation');
[['household','1. Mon foyer'],['income','2. Mes revenus'],['deductions','3. Mes déductions'],['credits','4. Mes crédits']].forEach(([id,title])=>{const a=document.createElement('a');a.href='#step-'+id;a.textContent=title;steps.append(a)});
form.prepend(steps);
const subtitles={
household:'Commencez par votre année de revenus et votre situation familiale.',
income:'Saisissez le net fiscal annuel ou importez les bulletins. Vérifiez toujours les cumuls.',
deductions:'Ajoutez seulement les montants qui concernent votre situation.',
credits:'Les réductions et crédits peuvent diminuer l’impôt estimé.',
special:'Signalez les situations qui nécessitent un calcul fiscal plus complet.'
};
for(const [i,id] of ids.entries()){
const card=sections[i];if(!card)continue;
const heading=card.querySelector(':scope > h2');if(heading){const title=heading.textContent.replace(/^\d+\s*[·.]\s*/,''),wrap=document.createElement('div'),num=document.createElement('span');wrap.className='site-section-title';num.className='step-number';num.textContent=String(i||'✓');heading.textContent=title;heading.before(wrap);wrap.append(num,heading);
if(subtitles[id]){const p=document.createElement('p');p.className='site-intro';p.textContent=subtitles[id];wrap.after(p)}
}
}
const intro=sections[0];if(intro){intro.classList.add('site-guide');const old=intro.querySelector('p.hint');if(old&&old.textContent.includes('Comment commencer'))old.remove()}
const mode=document.createElement('div');mode.className='site-mode';mode.innerHTML='<strong>Affichage :</strong><button type="button" aria-pressed="true" data-mode="simple">Essentiel</button><button type="button" aria-pressed="false" data-mode="expert">Complet</button>';
form.insertBefore(mode,sections[1]);
const advanced=sections.filter((_,i)=>i>=3);let current='simple';
function setMode(next){current=next;for(const button of mode.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.dataset.mode===next));for(const card of advanced){if(card===sections[3]||card===sections[4]||card===sections[5])card.classList.toggle('site-advanced',next==='simple')}for(const card of advanced){if(next==='simple'&&card!==sections[3])card.hidden=true;else card.hidden=false}if(next==='simple'&&sections[3])sections[3].hidden=true}
mode.querySelectorAll('button').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));setMode('simple');
const actions=document.createElement('div');actions.className='site-actions';const showAdvanced=document.createElement('button');showAdvanced.textContent='Afficher les déductions et crédits';showAdvanced.type='button';showAdvanced.onclick=()=>{setMode('expert');sections[3]?.scrollIntoView({behavior:'smooth',block:'start'})};actions.append(showAdvanced);
const detail=document.createElement('button');detail.className='secondary';detail.type='button';detail.textContent='Voir le détail par déclarant →';detail.onclick=()=>{const tabs=[...nav.querySelectorAll('button')];tabs[2]?.click();window.scrollTo({top:0,behavior:'smooth'})};actions.append(detail);sections[2]?.append(actions);
const right=$('#simulation > aside .stack');if(right){const explanation=document.createElement('p');explanation.className='hint';explanation.textContent='Le montant estimé évolue à chaque saisie. Les chiffres restent indicatifs tant que tous les revenus et crédits ne sont pas renseignés.';right.querySelector('.hero')?.append(explanation)}
})();

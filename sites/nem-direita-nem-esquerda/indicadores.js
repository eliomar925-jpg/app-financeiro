/* Progressive enhancement of the existing portal, using one normalized catalog. */
const liveDefinitions=[
 ['pib_anual_recente','PIB anual — último ano completo','Economia','ibge','pib_anual_recente','R$','Anual'],
 ['ipca_mensal','IPCA mensal','Economia','ibge','ipca_mensal','%', 'Mensal'],
 ['pib_contas_anuais','PIB — Contas Nacionais anuais consolidadas','Economia','ibge','pib_anual','R$','Anual'],
 ['pib_per_capita','PIB per capita — Contas Nacionais anuais','Economia','ibge','pib_per_capita','R$','Anual'],
 ['rendimento','Rendimento médio real habitual','Trabalho','ibge','rendimento','R$','Trimestral'],
 ['ocupados','Pessoas ocupadas','Trabalho','ibge','ocupados','pessoas','Trimestre móvel'],
 ['desemprego_trimestral','Desemprego trimestral','Trabalho','ibge','desemprego_trimestral','%','Trimestral']
];
const apiCache=new Map();
function officialGet(url){if(!apiCache.has(url))apiCache.set(url,fetch(url,{signal:AbortSignal.timeout(15000)}).then(r=>{if(!r.ok)throw Error('Fonte temporariamente indisponível.');return r.json()}).catch(e=>{apiCache.delete(url);throw e}));return apiCache.get(url)}
function displayValue(x){if(x.valor==null)return 'Fonte temporariamente indisponível.';if(typeof x.valor!=='number')return String(x.valor);return x.unidade==='R$'?fmtMoney(x.valor):x.valor.toLocaleString('pt-BR',{maximumFractionDigits:2})+' '+x.unidade;}
function safeCard(x){
 const a=document.createElement('a');a.className='source';
 try{const u=new URL(x.url);if(u.protocol==='https:'){a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';}}catch{}
 const title=document.createElement('b');title.textContent=x.nome;a.append(title);
 for(const text of [displayValue(x),`${x.periodo||x.referencia||'Referência não validada'} • ${x.territorio||'Brasil'}`,x.fonte,x.observacao]){if(text){const el=document.createElement('span');el.textContent=text;a.append(el)}}
 return a;
}
indicatorCard=x=>safeCard(x).outerHTML;
async function synchronizeIndicators(){
 const bindings={divida_bruta_pib:['bcb','divida'],selic_efetiva:['bcb','selic'],desemprego_latest:['ibge','desemprego'],ipca_12m:['ibge','ipca12m'],pib_4tri:['ibge','pib_4tri'],cambio_usd:['bcb','cambio'],reservas_internacionais:['bcb','reservas'],resultado_primario_pib:['bcb','primario_pib'],juros_nominais_pib:['bcb','juros_pib'],resultado_nominal_pib:['bcb','nominal_pib'],conta_corrente_pib:['bcb','conta_corrente_pib']};
 for(const [id,nome,tema,api,serie,unidade,periodicidade] of liveDefinitions){if(!portalData.indicadores.some(x=>x.id===id))portalData.indicadores.push({id,nome,tema,unidade,periodicidade,valor:null,fonte:'IBGE/SIDRA',territorio:'Brasil',abrangencia:['Brasil'],url:'https://sidra.ibge.gov.br/'});bindings[id]=[api,serie];}
 await Promise.allSettled(portalData.indicadores.map(async x=>{
  if(!bindings[x.id])return;
  const [api,serie]=bindings[x.id];x.valor=null;x.status='consultando';x.tipo_atualizacao='automatica';
  try{const d=await officialGet(`./api/${api}?serie=${serie}`);if(d.valor==null||!Number.isFinite(Number(d.valor)))throw Error();Object.assign(x,{...d,id:x.id,nome:x.nome,tema:x.tema,valor:Number(d.valor),periodo:d.periodo||d.data,referencia:d.periodo||d.data,status:'validado',territorio:'Brasil'});}
  catch{x.status='indisponivel';x.observacao='Fonte temporariamente indisponível.';x.referencia=null;}
 }));
 renderCatalog();renderAdditionalPanels();refreshExistingCards();if(q.value)searchPortal();
}
function renderAdditionalPanels(){
 for(const [panel,theme] of [['economia','Economia'],['trabalho','Trabalho']]){
  let box=document.getElementById('latest-'+panel);if(!box){box=document.createElement('div');box.id='latest-'+panel;box.className='panel';document.getElementById(panel).prepend(box)}
  box.replaceChildren();const title=document.createElement('h2');title.textContent='Consulta oficial atualizada • Brasil';box.append(title);const grid=document.createElement('div');grid.className='source-grid';portalData.indicadores.filter(x=>x.tema===theme&&x.tipo_atualizacao==='automatica').forEach(x=>grid.append(safeCard(x)));box.append(grid);
 }
 let box=document.getElementById('macro-extra');if(!box){box=document.createElement('div');box.id='macro-extra';box.className='panel';document.getElementById('macro').append(box)}
 box.replaceChildren();const h=document.createElement('h2');h.textContent='Atividade e preços • séries complementares';box.append(h);const grid=document.createElement('div');grid.className='source-grid';portalData.indicadores.filter(x=>liveDefinitions.some(d=>d[0]===x.id)).forEach(x=>grid.append(safeCard(x)));box.append(grid);
}
async function loadRegionalWork(){
 let box=document.getElementById('regional-work');if(!box){box=document.createElement('div');box.id='regional-work';box.className='panel';document.getElementById('trabalho').prepend(box)}
 box.replaceChildren();const h=document.createElement('h2');h.textContent='Trabalho • território selecionado';box.append(h);
 const lv=level.value,id=lv==='uf'?uf.value:mun.value;
 if(lv==='mun'){const p=document.createElement('p');p.textContent='Não disponível para este nível territorial.';box.append(p);return;}
 const label=lv==='br'?'Brasil':uf.options[uf.selectedIndex]?.text;
 for(const serie of ['desemprego_trimestral','rendimento']){
  try{const d=await officialGet(`./api/ibge?serie=${serie}&level=${lv}&id=${encodeURIComponent(id||'')}`);const def=liveDefinitions.find(x=>x[4]===serie);box.append(safeCard({...d,nome:def[1],territorio:label}));}
  catch{const p=document.createElement('p');p.textContent='Fonte temporariamente indisponível.';box.append(p)}
 }
}
document.getElementById('apply').addEventListener('click',loadRegionalWork);
function exportSnapshot(format){
 const data={...portalData,meta:{...portalData.meta,exportado_em:new Date().toISOString(),nota:'Valores nulos indicam indisponibilidade. Referência do indicador difere da data de consulta.'}};
 let text,type;
 if(format==='json'){text=JSON.stringify(data,null,2);type='application/json'}else{
  const fields=['id','nome','tema','valor','unidade','periodo','referencia','periodicidade','territorio','fonte','url','atualizado_em','tipo_atualizacao','status','observacao'];
  const esc=v=>'"'+String(v??'').replace(/^[=+@\t\r-]/,c=>"'"+c).replace(/"/g,'""')+'"';
  text='\uFEFF'+[fields,...data.indicadores.map(x=>fields.map(k=>x[k]))].map(r=>r.map(esc).join(';')).join('\r\n');type='text/csv;charset=utf-8';
 }
 const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download='brasil-em-dados.'+format;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
}
downloadCsv.onclick=()=>exportSnapshot('csv');
const jsonDownload=document.querySelector('a[download][href="./dados.json"]');if(jsonDownload){jsonDownload.removeAttribute('download');jsonDownload.onclick=e=>{e.preventDefault();exportSnapshot('json')}}

function refreshExistingCards(){
 const mappings={pib_anual_recente:['annualGdp'],pib_4tri:['fourQuarterGdp'],ipca_12m:['ipca12b'],desemprego_latest:['unemployment2']};
 for(const [id,targets] of Object.entries(mappings)){const x=portalData.indicadores.find(r=>r.id===id);if(!x)continue;for(const target of targets){const el=document.getElementById(target);if(el){el.textContent=displayValue(x);const meta=el.nextElementSibling;if(meta)meta.textContent=(x.periodo||'Referência indisponível')+' • '+x.fonte;}}}
}
async function officialHistory(){
 const box=document.getElementById('official-history');if(!box)return;box.replaceChildren();const h=document.createElement('h2');h.textContent='Série histórica oficial • IPCA mensal';box.append(h);
 try{const d=await officialGet('./api/ibge?serie=ipca_mensal&historico=1');const p=document.createElement('p');p.textContent='Brasil • IBGE/SIDRA 1737 • variação mensal (%). Sem interpolação. Referências disponíveis desde '+d.historico[0].periodo+'.';box.append(p);const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent='Abrir todos os '+d.historico.length+' períodos';details.append(summary);const table=document.createElement('table');const head=document.createElement('tr');for(const label of ['Período','Variação mensal (%)']){const th=document.createElement('th');th.scope='col';th.textContent=label;head.append(th)}table.append(head);for(const x of [...d.historico].reverse()){const tr=document.createElement('tr');for(const v of [x.periodo,x.valor.toLocaleString('pt-BR')]){const td=document.createElement('td');td.textContent=v;tr.append(td)}table.append(tr)}details.append(table);box.append(details);}
 catch{const p=document.createElement('p');p.textContent='Fonte temporariamente indisponível.';box.append(p)}
}
window.addEventListener('load',officialHistory);
let geographySearchSequence=0;
const searchIndicatorsOnly=searchPortal;
searchPortal=async()=>{
 searchIndicatorsOnly();const seq=++geographySearchSequence,term=normalize(q.value).trim();if(term.length<3||tema.value)return;
 try{
  const towns=await officialGet(API+'/municipios?orderBy=nome');if(seq!==geographySearchSequence)return;
  const matches=[...Array.from(uf.options).filter(x=>x.value&&normalize(x.text).includes(term)).map(x=>({id:x.value,nome:x.text,level:'uf'})),...towns.filter(x=>normalize(x.nome).includes(term)).slice(0,5).map(x=>({...x,level:'mun'}))].slice(0,5);
  for(const match of matches){
   const d=await fetchTerritory(match.level,match.id);if(seq!==geographySearchSequence)return;
   const link=document.createElement('a');link.className='source';const params=new URLSearchParams({nivel:match.level,uf:String(match.id).slice(0,2)});if(match.level==='mun')params.set('mun',match.id);link.href='?'+params+'#geral';
   const b=document.createElement('b');b.textContent=match.nome;link.append(b);const p=document.createElement('span');p.textContent='População: '+(d?.population?.value!=null?fmtPop(d.population.value):'Fonte temporariamente indisponível.')+' • '+(d?.population?.period||'Referência indisponível')+' • IBGE/SIDRA';link.append(p);searchResults.append(link);
  }
 }catch{}
};
searchBtn.onclick=searchPortal;
async function regionalFiscal(){
 let box=document.getElementById('regional-fiscal');if(!box){box=document.createElement('div');box.id='regional-fiscal';box.className='panel';document.getElementById('fiscal').append(box)}
 box.replaceChildren();const h=document.createElement('h2');h.textContent='Finanças territoriais • Siconfi';box.append(h);
 const p=document.createElement('p');p.textContent='Consulte os demonstrativos declarados ao Tesouro. Contas e colunas diferentes não devem ser somadas entre si. RREO registra fluxos orçamentários; RGF inclui estoques e limites.';box.append(p);
 if(level.value==='br'){const hint=document.createElement('p');hint.textContent='Selecione um estado ou município para consultar o RREO.';box.append(hint);return;}
 const entity=level.value==='uf'?uf.value:mun.value;if(!entity)return;
 const controls=document.createElement('div');controls.className='actions';
 const year=document.createElement('input');year.type='number';year.min='2015';year.max=String(new Date().getFullYear());year.value=year.max;year.setAttribute('aria-label','Exercício fiscal');
 const period=document.createElement('select');period.setAttribute('aria-label','Bimestre');for(let n=1;n<=6;n++){const o=document.createElement('option');o.value=n;o.textContent=n+'º bimestre';period.append(o)}period.value=String(Math.min(6,Math.max(1,Math.floor(new Date().getMonth()/2))));
 const button=document.createElement('button');button.className='btn primary';button.textContent='Consultar RREO';controls.append(year,period,button);box.append(controls);const result=document.createElement('div');result.setAttribute('aria-live','polite');box.append(result);
 button.onclick=async()=>{button.disabled=true;result.textContent='Consultando Tesouro Nacional...';try{
  const url='./api/siconfi?'+new URLSearchParams({endpoint:'rreo',an_exercicio:year.value,nr_periodo:period.value,id_ente:entity,co_tipo_demonstrativo:'RREO',no_anexo:'RREO-Anexo 01'});
  const d=await officialGet(url);result.replaceChildren();const info=document.createElement('p');info.textContent=d.items.length?`Exercício ${year.value} • ${period.value}º bimestre • valores conforme declaração. ${d.hasMore?'Há mais registros na fonte; exibida a primeira página.':''}`:'Demonstrativo não retornado para o período selecionado. Ausência não significa valor zero.';result.append(info);
  if(d.items.length){const table=document.createElement('table');const fields=['conta','coluna','valor'];const tr=document.createElement('tr');for(const name of fields){const th=document.createElement('th');th.textContent=name;th.scope='col';tr.append(th)}table.append(tr);for(const row of d.items){const tr=document.createElement('tr');for(const key of fields){const td=document.createElement('td');td.textContent=row[key]==null?'—':String(row[key]);tr.append(td)}table.append(tr)}result.append(table)}
 }catch{result.textContent='Fonte temporariamente indisponível.'}finally{button.disabled=false}};
}
document.getElementById('apply').addEventListener('click',regionalFiscal);window.addEventListener('load',regionalFiscal);
setInterval(()=>{apiCache.clear();synchronizeIndicators();},900000);

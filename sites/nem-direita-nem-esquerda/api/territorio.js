function cleanId(v){return /^\d+$/.test(String(v||''))?String(v):null}
function num(v){if(v==null||!/^[-+]?\d+(?:[.,]\d+)?$/.test(String(v).trim()))return null;const n=Number(String(v).replace(',','.'));return Number.isFinite(n)?n:null}
function findByLabel(rows,needle){
  needle=needle.toLowerCase();
  for(const x of rows||[]){
    const label=[x.D1N,x.D2N,x.D3N,x.D4N,x.D5N,x.D6N,x.MN].filter(Boolean).join(' ').toLowerCase();
    if(label.includes(needle)){const n=num(x.V);if(n!=null)return {value:/^mil reais$/i.test(x.MN)?n*1000:n,unit:/^mil reais$/i.test(x.MN)?'R$':x.MN,period:x.D3N||null,label,sourceUnit:x.MN};}
  }
  return null;
}
async function sidra(table,level,id,period='last 1'){
  const lvl=level==='br'?'n1':level==='uf'?'n3':'n6';
  const geo=level==='br'?'all':id;
  const u='https://apisidra.ibge.gov.br/values/t/'+table+'/'+lvl+'/'+geo+'/v/all/p/'+encodeURIComponent(period)+'?formato=json';
  const r=await fetch(u,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'nem-direita-nem-esquerda/1.2'}});
  if(!r.ok)throw new Error('SIDRA '+r.status);
  const j=await r.json();return Array.isArray(j)?j.slice(1):[];
}
export default async function handler(req,res){
  const level=req.query.level||'br';
  if(!['br','uf','mun'].includes(level))return res.status(400).json({error:'nivel territorial invalido'});
  const id=level==='br'?'all':cleanId(req.query.id);
  if(level!=='br'&&(!id||!(level==='uf'?/^\d{2}$/:/^\d{7}$/).test(id)))return res.status(400).json({error:'id territorial invalido'});
  try{
    const results=await Promise.allSettled([sidra(6579,level,id),sidra(5938,level,id)]);
    const [popRows,gdpRows]=results.map(r=>r.status==='fulfilled'?r.value:[]);
    let pop=findByLabel(popRows,'popula')||popRows.map(x=>({value:num(x.V),period:x.D3N||x.D2N})).find(x=>x.value!=null)||null;
    let gdp=findByLabel(gdpRows,'produto interno bruto a preços correntes')||findByLabel(gdpRows,'produto interno bruto a precos correntes');
    if(!pop&&!gdp)return res.status(502).json({error:'Fonte temporariamente indisponível.'});
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({updatedAt:new Date().toISOString(),partial:results.some(r=>r.status==='rejected'),level,id,fonte:'IBGE/SIDRA',population:pop,gdp:gdp,notes:['População: tabela 6579','PIB municipal: tabela 5938; série anual']});
  }catch(e){res.status(502).json({error:'fonte territorial indisponivel',detail:String(e)})}
}
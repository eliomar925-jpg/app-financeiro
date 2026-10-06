function cleanId(v){return /^\d+$/.test(String(v||''))?String(v):null}
function num(v){if(v==null)return null;const n=Number(String(v).replace(/\./g,'').replace(',','.'));return Number.isFinite(n)?n:null}
function findByLabel(rows,needle){
  needle=needle.toLowerCase();
  for(const x of rows||[]){
    const label=[x.D1N,x.D2N,x.D3N,x.D4N,x.D5N,x.D6N,x.MN].filter(Boolean).join(' ').toLowerCase();
    if(label.includes(needle)){const n=num(x.V);if(n!=null)return {value:n,period:x.D3N||x.D2N||x.D4N||x.D1N||null,label};}
  }
  return null;
}
async function sidra(table,level,id,period='last 1'){
  const lvl=level==='br'?'n1':level==='uf'?'n3':'n6';
  const geo=level==='br'?'all':id;
  const u='https://apisidra.ibge.gov.br/values/t/'+table+'/'+lvl+'/'+geo+'/v/all/p/'+encodeURIComponent(period)+'?formato=json';
  const r=await fetch(u,{headers:{'user-agent':'nem-direita-nem-esquerda/1.2'}});
  if(!r.ok)throw new Error('SIDRA '+r.status);
  const j=await r.json();return Array.isArray(j)?j.slice(1):[];
}
export default async function handler(req,res){
  const level=['br','uf','mun'].includes(req.query.level)?req.query.level:'br';
  const id=level==='br'?'all':cleanId(req.query.id);
  if(level!=='br'&&!id)return res.status(400).json({error:'id territorial invalido'});
  try{
    const [popRows,gdpRows]=await Promise.all([sidra(6579,level,id),sidra(5938,level,id)]);
    let pop=findByLabel(popRows,'popula')||popRows.map(x=>({value:num(x.V),period:x.D3N||x.D2N})).find(x=>x.value!=null)||null;
    let gdp=findByLabel(gdpRows,'produto interno bruto a preços correntes')||findByLabel(gdpRows,'produto interno bruto a precos correntes');
    if(!gdp){
      const candidates=gdpRows.map(x=>({row:x,value:num(x.V),label:[x.D1N,x.D2N,x.D3N,x.D4N,x.D5N,x.D6N,x.MN].filter(Boolean).join(' ')})).filter(x=>x.value!=null&&/produto interno bruto/i.test(x.label));
      gdp=candidates[0]?{value:candidates[0].value,period:candidates[0].row.D3N||candidates[0].row.D2N,label:candidates[0].label}:null;
    }
    res.setHeader('Cache-Control','s-maxage=21600, stale-while-revalidate=86400');
    res.status(200).json({level,id,fonte:'IBGE/SIDRA',population:pop,gdp:gdp,notes:['População: tabela 6579','PIB municipal: tabela 5938; série anual']});
  }catch(e){res.status(502).json({error:'fonte territorial indisponivel',detail:String(e)})}
}
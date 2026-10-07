function parseRows(j){return Array.isArray(j)?j.slice(1):[]}
function n(v){if(v==null||!/^[-+]?\d+(?:[.,]\d+)?$/.test(String(v).trim()))return null;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null}
async function sidra(path){
  const r=await fetch('https://apisidra.ibge.gov.br/values'+path,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'nem-direita-nem-esquerda/1.3'}});
  if(!r.ok)throw new Error('SIDRA '+r.status);
  return parseRows(await r.json());
}
export default async function handler(req,res){
  const serie=String(req.query.serie||'');
  try{
    if(serie==='desemprego'){
      const rows=await sidra('/t/6381/n1/all/v/4099/p/last%201?formato=json');
      const x=rows.find(r=>n(r.V)!=null)||rows[0];
      return send(res,{serie,valor:n(x?.V),periodo:x?.D3N||x?.D2N||x?.D4N||null,fonte:'IBGE/SIDRA',tabela:6381,variavel:4099});
    }
    if(serie==='ipca12m'){
      const rows=await sidra('/t/1737/n1/all/v/2266/p/last%2013/d/v2266%2013?formato=json');
      const vals=rows.map(r=>({v:n(r.V),p:r.D3N||r.D2N||r.D4N||null})).filter(x=>x.v!=null);
      if(vals.length<13)throw new Error('periodos insuficientes');
      const first=vals[0],last=vals[vals.length-1];
      const value=(last.v/first.v-1)*100;
      return send(res,{serie,valor:value,periodo:last.p,fonte:'IBGE/SIDRA',tabela:1737,variavel:2266});
    }
    if(serie==='pib_trimestre'){
      const rows=await sidra('/t/1621/n1/all/v/584/p/last%202/c11255/90707/d/v584%202?formato=json');
      const vals=rows.map(r=>({v:n(r.V),p:r.D3N||r.D2N||r.D4N||null})).filter(x=>x.v!=null);
      if(vals.length<2)throw new Error('periodos insuficientes');
      const a=vals[vals.length-2],b=vals[vals.length-1];
      return send(res,{serie,valor:(b.v/a.v-1)*100,periodo:b.p,fonte:'IBGE/SIDRA',tabela:1621,variavel:584,nota:'PIB dessazonalizado, trimestre contra trimestre anterior'});
    }
    res.status(400).json({error:'serie invalida',allowed:['desemprego','ipca12m','pib_trimestre']});
  }catch(e){res.status(502).json({error:'IBGE indisponivel',detail:String(e)})}
}
function send(res,obj){if(obj.valor==null||!Number.isFinite(obj.valor)||!obj.periodo)return res.status(502).json({error:'Fonte temporariamente indisponível.'});obj.atualizado_em=new Date().toISOString();obj.territorio='Brasil';obj.unidade='%';obj.tipo_atualizacao='automatica';obj.url='https://sidra.ibge.gov.br/tabela/'+obj.tabela;res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');res.status(200).json(obj)}

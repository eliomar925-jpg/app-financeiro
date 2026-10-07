export default async function handler(req,res){
  const checks=[
    ['BCB','https://api.bcb.gov.br/dados/serie/bcdata.sgs.13762/dados/ultimos/1?formato=json'],
    ['IBGE Localidades','https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome'],
    ['IBGE SIDRA','https://apisidra.ibge.gov.br/values/t/6579/n1/all/v/all/p/last%201?formato=json'],
    ['Tesouro Siconfi','https://apidatalake.tesouro.gov.br/ords/siconfi/tt/entes?offset=0']
  ];
  const out={checkedAt:new Date().toISOString(),services:[]};
  await Promise.all(checks.map(async ([name,url])=>{
    const started=Date.now();
    try{
      const r=await fetch(url,{signal:AbortSignal.timeout(10000),headers:{'user-agent':'nem-direita-nem-esquerda/1.2'}});
      out.services.push({name,ok:r.ok,status:r.status,ms:Date.now()-started});
    }catch(e){out.services.push({name,ok:false,error:String(e),ms:Date.now()-started})}
  }));
  out.ok=out.services.every(x=>x.ok);
  res.setHeader('Cache-Control','s-maxage=300, stale-while-revalidate=900');
  res.status(out.ok?200:207).json(out);
}
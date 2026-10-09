const SERIES={divida:13762,selic:4189,cambio:1,reservas:13621,primario_pib:5793,nominal_pib:5727,juros_pib:5760,conta_corrente_pib:23079,primario_rs:4649,juros_rs:4616,nominal_rs:4583,dlsp_rs:4478};
export default async function handler(req,res){
  const key=String(req.query.serie||'');
  const code=Object.hasOwn(SERIES,key)?SERIES[key]:null;
  if(!code)return res.status(400).json({error:'serie invalida',allowed:Object.keys(SERIES)});
  try{
    const u='https://api.bcb.gov.br/dados/serie/bcdata.sgs.'+code+'/dados/ultimos/1?formato=json';
    const r=await fetch(u,{signal:AbortSignal.timeout(12000)}); if(!r.ok)throw new Error('BCB '+r.status);
    const j=await r.json();
    if(!Array.isArray(j)||!j.length||!/^[-+]?\d+(?:\.\d+)?$/.test(String(j[0].valor))||!/^\d{2}\/\d{2}\/\d{4}$/.test(j[0].data))throw new Error('Resposta invalida');
    res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
    const money=['primario_rs','juros_rs','nominal_rs','dlsp_rs'].includes(key);
    const fiscal=['primario_pib','nominal_pib','juros_pib','primario_rs','juros_rs','nominal_rs'].includes(key);
    const unidade=({selic:'% a.a.',cambio:'R$/US$',reservas:'US$ milhões'})[key]||(money?'R$ milhões':'% do PIB');
    const observacao=fiscal?'NFSP: déficit positivo; superávit negativo. '+(money?'Fluxo mensal.':'Fluxo acumulado em 12 meses.'):'Preserva a unidade original da série SGS.';
    res.status(200).json({serie:key,codigo:code,fonte:'Banco Central do Brasil',url:u,territorio:'Brasil',atualizado_em:new Date().toISOString(),tipo_atualizacao:'automatica',unidade,observacao,data:j[0].data,periodo:j[0].data,valor:Number(j[0].valor)});
  }catch{res.status(502).json({error:'Fonte temporariamente indisponível.'})}
}

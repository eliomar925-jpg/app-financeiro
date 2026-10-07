const SERIES={divida:13762,selic:4189,cambio:1,reservas:13621,primario_pib:5793,nominal_pib:5727,juros_pib:5760,conta_corrente_pib:23079};
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
    res.status(200).json({serie:key,codigo:code,fonte:'Banco Central do Brasil',url:u,territorio:'Brasil',atualizado_em:new Date().toISOString(),tipo_atualizacao:'automatica',unidade:({selic:'% a.a.',cambio:'R$/US$',reservas:'US$ milhões'})[key]||'% do PIB',observacao:['primario_pib','nominal_pib','juros_pib'].includes(key)?'NFSP: déficit positivo; superávit negativo. Fluxo acumulado em 12 meses.':'Preserva a unidade original da série SGS.',data:j[0]?.data,valor:j[0]?.valor});
  }catch(e){res.status(502).json({error:'fonte indisponivel',detail:String(e)})}
}
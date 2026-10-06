const SERIES={divida:13762,selic:4189};
export default async function handler(req,res){
  const key=String(req.query.serie||'');
  const code=SERIES[key];
  if(!code)return res.status(400).json({error:'serie invalida',allowed:Object.keys(SERIES)});
  try{
    const u='https://api.bcb.gov.br/dados/serie/bcdata.sgs.'+code+'/dados/ultimos/1?formato=json';
    const r=await fetch(u); if(!r.ok)throw new Error('BCB '+r.status);
    const j=await r.json();
    res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');
    res.status(200).json({serie:key,codigo:code,fonte:'Banco Central do Brasil',data:j[0]?.data,valor:j[0]?.valor});
  }catch(e){res.status(502).json({error:'fonte indisponivel',detail:String(e)})}
}
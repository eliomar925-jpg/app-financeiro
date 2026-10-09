function parseRows(j){return Array.isArray(j)?j.slice(1):[]}
function n(v){if(v==null||!/^[-+]?\d+(?:[.,]\d+)?$/.test(String(v).trim()))return null;const x=Number(String(v).replace(',','.'));return Number.isFinite(x)?x:null}
async function sidra(path){
  const r=await fetch('https://apisidra.ibge.gov.br/values'+path,{signal:AbortSignal.timeout(12000),headers:{'user-agent':'nem-direita-nem-esquerda/1.3'}});
  if(!r.ok)throw new Error('SIDRA '+r.status);
  return parseRows(await r.json());
}
export default async function handler(req,res){
  const serie=String(req.query.serie||'');
  const specs={ipca_mensal:[1737,63,'Mensal','%',1,''],pib_anual:[6784,9808,'Anual','R$',1000000,''],pib_per_capita:[6784,9812,'Anual','R$',1,''],pib_crescimento_anual:[6784,9810,'Anual','%',1,''],pib_4tri:[5932,6562,'Trimestral','%',1,'/c11255/90707'],rendimento:[6472,5933,'Trimestral','R$',1,''],desemprego_trimestral:[4099,4099,'Trimestral','%',1,''],ocupados:[6320,4090,'Trimestre móvel','pessoas',1000,'/c11913/96165']};
  const allowed=[...Object.keys(specs),'pib_anual_recente','desemprego','ipca12m','pib_trimestre'];
  if(!allowed.includes(serie))return res.status(400).json({error:'serie invalida',allowed});
  const lv=req.query.level||'br',id=String(req.query.id||'');
  if(!['br','uf','mun'].includes(lv)||lv==='uf'&&!/^\d{2}$/.test(id)||lv==='mun'&&!/^\d{7}$/.test(id))return res.status(400).json({error:'territorio invalido'});
  if(lv==='mun'||lv==='uf'&&!['rendimento','desemprego_trimestral'].includes(serie))return res.status(200).json({serie,valor:null,status:'nao_disponivel',observacao:'Não disponível para este nível territorial.'});
  try{
    if(serie==='pib_anual_recente'){
      const rows=await sidra('/t/1846/n1/all/v/585/p/last%208/c11255/90707?formato=json');
      const years=new Map();
      for(const row of rows){const code=String(row.D3C||'');if(!/^\d{6}$/.test(code)||n(row.V)==null)continue;const year=code.slice(0,4);if(!years.has(year))years.set(year,new Map());years.get(year).set(code.slice(4),n(row.V));}
      const year=[...years.keys()].sort().reverse().find(y=>['01','02','03','04'].every(q=>years.get(y).has(q)));
      if(!year)throw Error('Ano completo indisponivel');
      return send(res,{serie,valor:[...years.get(year).values()].reduce((a,b)=>a+b,0)*1e6,periodo:year,unidade:'R$',periodicidade:'Anual',fonte:'IBGE/SIDRA',tabela:1846,variavel:585,observacao:'Soma dos quatro trimestres a preços correntes do último ano completo. Contas trimestrais sujeitas a revisão.'});
    }
    if(Object.hasOwn(specs,serie)){
      const [table,variable,frequency,unit,factor,classification]=specs[serie];
      const history=req.query.historico==='1';
      const path='/t/'+table+'/'+(lv==='uf'?'n3/'+id:'n1/all')+'/v/'+variable+'/p/'+(history?'all':'last%201')+classification+'?formato=json';
      const rows=await sidra(path);
      const series=rows.filter(x=>n(x.V)!=null).sort((a,b)=>String(a.D3C).localeCompare(String(b.D3C))).map(x=>({valor:n(x.V)*factor,periodo:x.D3N,codigo_periodo:x.D3C}));
      const latest=series.at(-1);
      return send(res,{serie,...latest,unidade:unit,periodicidade:frequency,territorio:lv==='uf'?id:'Brasil',fonte:'IBGE/SIDRA',tabela:table,variavel:variable,observacao:'Unidade original: '+(rows[0]?.MN||unit)+'; fator de conversão: '+factor,...(history?{historico:series}:{})});
    }
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
function send(res,obj){if(obj.valor==null||!Number.isFinite(obj.valor)||!obj.periodo)return res.status(502).json({error:'Fonte temporariamente indisponível.'});obj.atualizado_em=new Date().toISOString();obj.territorio=obj.territorio||'Brasil';obj.unidade=obj.unidade||'%';obj.periodicidade=obj.periodicidade||({desemprego:'Trimestre móvel',ipca12m:'Mensal',pib_trimestre:'Trimestral'}[obj.serie]);obj.observacao=obj.observacao||obj.nota||'Última referência retornada pela fonte oficial.';obj.tipo_atualizacao='automatica';obj.url='https://sidra.ibge.gov.br/tabela/'+obj.tabela;res.setHeader('Cache-Control','s-maxage=900, stale-while-revalidate=3600');res.status(200).json(obj)}

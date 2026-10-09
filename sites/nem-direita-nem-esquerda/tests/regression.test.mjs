import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ibge from '../api/ibge.js';
import territory from '../api/territorio.js';
import bcb from '../api/bcb.js';
import siconfi from '../api/siconfi.js';
const originalFetch=global.fetch;
async function call(handler,query,fetcher){
 global.fetch=fetcher;const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this},json(b){this.body=b;return this}};
 try{await handler({query},res);return res}finally{global.fetch=originalFetch}
}
const response=rows=>({ok:true,json:async()=>rows});
test('SIDRA decimals and unavailable markers are preserved',async()=>{
 let r=await call(ibge,{serie:'desemprego'},async()=>response([{}, {V:'5.3',D3N:'jun-jul-ago 2026'}]));assert.equal(r.body.valor,5.3);
 r=await call(ibge,{serie:'desemprego'},async()=>response([{}, {V:'...',D3N:'jun-jul-ago 2026'}]));assert.equal(r.code,502);
});
test('IPCA compounds index ratio, rather than sums monthly rates',async()=>{
 const rows=Array.from({length:13},(_,i)=>({V:String(100*(1.01**i)),D3N:String(i)}));
 const r=await call(ibge,{serie:'ipca12m'},async()=>response([{},...rows]));assert.ok(Math.abs(r.body.valor-((1.01**12)-1)*100)<1e-9);
});
test('GDP quarter-on-quarter ratio',async()=>{
 const r=await call(ibge,{serie:'pib_trimestre'},async()=>response([{}, {V:'197.29',D3N:'1º trimestre 2026'},{V:'198.24',D3N:'2º trimestre 2026'}]));assert.ok(Math.abs(r.body.valor-0.481524659)<1e-8);
});
test('Municipal GDP converts thousands of reais and isolates failed sources',async()=>{
 const fetcher=async u=>{if(u.includes('/6579/'))throw Error('timeout');return response([{}, {V:'76698777',MN:'Mil Reais',D2N:'Produto Interno Bruto a preços correntes',D3N:'2023'}]);};
 const r=await call(territory,{level:'mun',id:'2927408'},fetcher);assert.equal(r.body.gdp.value,76698777000);assert.equal(r.body.gdp.period,'2023');assert.equal(r.body.population,null);assert.equal(r.body.partial,true);
});
test('Territorial invalid input is rejected before fetching',async()=>{
 for(const query of [{level:'x'},{level:'mun',id:'29'},{level:'uf',id:'2927408'}]){const r=await call(territory,query,()=>{throw Error('must not fetch')});assert.equal(r.code,400);}
});
test('BCB rejects prototype properties and non-numeric payloads',async()=>{
 let r=await call(bcb,{serie:'constructor'},()=>{throw Error('must not fetch')});assert.equal(r.code,400);
 r=await call(bcb,{serie:'selic'},async()=>response([{valor:'bad',data:'01/10/2026'}]));assert.equal(r.code,502);
});
test('Siconfi rejects unknown or injected parameters',async()=>{
 for(const query of [{url:'https://example.com'},{id_ente:'29<script>'},{an_exercicio:'NaN'}]){const r=await call(siconfi,query,()=>{throw Error('must not fetch')});assert.equal(r.code,400);}
});
test('HTML contains unique IDs, valid script, associated form labels and stable canonical',()=>{
 const html=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);assert.equal(ids.length,new Set(ids).size);
 const script=html.match(/<script>\n([\s\S]*?)<\/script>/)[1];new vm.Script(script);
 for(const id of ['q','tema','level','uf','mun'])assert.ok(html.includes(`for="${id}"`));
 assert.ok(html.includes('rel="canonical" href="https://nem-direita-nem-esquerda-brasil.vercel.app/"'));
});
test('Annual GDP only sums four quarters from a complete year',async()=>{
 const rows=[{},...['202501','202502','202503','202504','202601','202602'].map(D3C=>({D3C,D3N:D3C,V:'100'}))];
 const r=await call(ibge,{serie:'pib_anual_recente'},async()=>response(rows));assert.equal(r.body.periodo,'2025');assert.equal(r.body.valor,400000000);assert.equal(r.body.unidade,'R$');
});
test('State labor uses state geography and does not synthesize municipal observations',async()=>{
 let requested;
 const r=await call(ibge,{serie:'rendimento',level:'uf',id:'29'},async u=>{requested=u;return response([{}, {V:'2563',D3N:'2º trimestre 2026',D3C:'202602',MN:'Reais'}])});assert.ok(requested.includes('/n3/29/'));assert.equal(r.body.valor,2563);assert.equal(r.body.unidade,'R$');
 const m=await call(ibge,{serie:'rendimento',level:'mun',id:'2927408'},()=>{throw Error('must not fetch')});assert.equal(m.body.valor,null);assert.equal(m.body.status,'nao_disponivel');
});
test('Occupied population converts thousand people to people',async()=>{
 const r=await call(ibge,{serie:'ocupados'},async()=>response([{}, {V:'103477',D3N:'jun-jul-ago 2026',D3C:'202608',MN:'Mil pessoas'}]));assert.equal(r.body.valor,103477000);
});

test('Invalid series and malformed municipality are rejected before availability checks',async()=>{
 for(const query of [{serie:'constructor',level:'mun',id:'2927408'},{serie:'rendimento',level:'mun',id:'29'}]){const r=await call(ibge,query,()=>{throw Error('must not fetch')});assert.equal(r.code,400);}
});

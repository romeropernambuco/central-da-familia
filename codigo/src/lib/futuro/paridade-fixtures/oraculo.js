'use strict';
// Oráculo independente: não importa nenhuma função dos motores. Usa somente Decimal
// já instalado, em clone próprio de 70 dígitos, e fórmulas declaradas nos cenários.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const Decimal=require('../central/codigo/node_modules/decimal.js');
const D=Decimal.clone({precision:70,rounding:Decimal.ROUND_HALF_UP});
const base=__dirname, read=p=>JSON.parse(fs.readFileSync(p,'utf8').replace(/^\uFEFF/,''));
const month=(start,n)=>{const [y,m]=start.split('-').map(Number);return Array.from({length:n},(_,i)=>`${y+Math.floor((m-1+i)/12)}-${String((m-1+i)%12+1).padStart(2,'0')}`)};
const days=m=>{const[y,n]=m.split('-').map(Number);return new Date(Date.UTC(y,n,0)).getUTCDate()};
const round=x=>new D(x).toDecimalPlaces(0,D.ROUND_HALF_UP).toNumber();
function oracle(s){
 let b=new D(s.initial),expense=new D(s.expense),cumdays=0;const rows=[];
 for(const [i,m] of s.month_list.entries()){
  if(s.inflation && m.endsWith('-01'))expense=new D(round(expense.times(new D(1).plus(s.inflation))));
  let f=s.rate_basis==='monthly'?new D(s.monthly_rate):new D(1).plus(new D(s.annual_rate).times(new D(1).minus(s.ir))).pow(new D(days(m)).div(365)).minus(1);
  if(s.application && m>s.application.maturity.slice(0,7))f=new D(0);
  const sign=x=>x.kind==='income'||(x.kind==='uncertain'&&s.with_extras)?1:x.kind==='uncertain'?0:-1;
  const ev=s.events.filter(x=>x.month===m).reduce((v,x)=>v+x.value*sign(x),0);
  const r=round(D.max(0,b).times(f)),flow=new D(s.income).minus(expense).plus(ev);b=b.plus(r).plus(flow);
  let closed;
  if(s.rate_basis==='monthly'){
   const rate=new D(s.monthly_rate),factor=new D(1).plus(rate).pow(i+1);
   closed=rate.isZero()?new D(s.initial).plus(new D(s.income-s.expense).times(i+1)).plus(s.events.filter(x=>x.month<=m).reduce((v,x)=>v+x.value*sign(x),0)):new D(s.initial).times(factor).plus(new D(s.income-s.expense).times(factor.minus(1)).div(rate));
  }else if(s.inflation){closed=new D(s.initial);for(let k=0;k<=i;k++)closed=closed.minus(round(new D(s.expense).times(new D(1).plus(s.inflation).pow(s.month_list.slice(0,k+1).filter(v=>v.endsWith('-01')).length))))}
  else{
   cumdays+=(!s.application || m<=s.application.maturity.slice(0,7))?days(m):0;
   closed=s.initial<=0?new D(s.initial):new D(s.initial).times(new D(1).plus(new D(s.annual_rate).times(new D(1).minus(s.ir))).pow(new D(cumdays).div(365)));
  }
  let bound=new D(0);for(let k=0;k<=i;k++)bound=bound.plus(D.max(1,new D(1).plus(f)).pow(k).times(.5));
  assert(b.minus(closed).abs().lte(bound.plus('0.0000001')),s.id+' '+m+' fórmula fechada');
  rows.push({mes:m,saldo:b.toNumber(),rendimento:r,fluxo:flow.toNumber(),dias:days(m),fechado_sem_arredondamento:closed.toFixed(35),limite_arredondamento_centavos:bound.toFixed(20)});
 }return rows;
}
function generate(){
const cases=[
{id:'01-juros-1-mes',title:'R$ 1.000 a 1% mensal por 1 mês',months:1,monthly_rate:.01},
{id:'02-juros-12-meses',title:'R$ 1.000 a 1% mensal por 12 meses',months:12,monthly_rate:.01},
{id:'03-renda-gasto',title:'Renda 300, gasto 200, sem juros',months:12,income:30000,expense:20000},
{id:'04-ir',title:'12% bruto anual e desconto de IR de 25% na taxa anual',months:3,rate_basis:'annual_actual365',annual_rate:.12,ir:.25},
{id:'05-parcela-13',title:'Parcela única 200 e 13º pago 100 em dezembro',months:3,events:[{id:'parcela',month:'2026-11',kind:'parcel',value:20000},{id:'folha',month:'2026-12',kind:'13',value:10000}]},
{id:'06-envelope',title:'Envelope 300 contém parcela 100: desconta só 300',months:3,expense:30000,floor_months:2,api_probe:{parcel:10000}},
{id:'07-reajuste',title:'Dezembro a janeiro: teto 100 reajusta 10% em janeiro',start:'2026-12',months:2,expense:10000,rate_basis:'annual_actual365',inflation:.1},
{id:'08-vencimento',title:'Aplicação isenta 10% vence em novembro; caixa sem rendimento depois',months:3,rate_basis:'annual_actual365',annual_rate:.1,application:{maturity:'2026-11-30'}},
{id:'09-zero',title:'Saldo zero durante 27 meses',months:27,rate_basis:'annual_actual365',annual_rate:.1,initial:0},
{id:'10-negativo',title:'Saldo negativo sem custo de dívida por 3 meses',months:3,initial:-10000,rate_basis:'annual_actual365',annual_rate:.1},
{id:'11-calendario',title:'17 meses a 10% anual, meses com 28/29/30/31 dias',months:17,rate_basis:'annual_actual365',annual_rate:.1},
{id:'12-extras',title:'Com extras: receita incerta 500 em novembro',months:3,with_extras:true,events:[{id:'extra',month:'2026-11',kind:'uncertain',value:50000}]}
];
for(const x of cases){const s={start:'2026-10',initial:100000,rate_basis:'monthly',monthly_rate:0,annual_rate:0,ir:0,income:0,expense:0,events:[],...x};s.month_list=month(s.start,s.months);const rows=oracle(s);s.expected_final_centavos=rows.at(-1).saldo;
 fs.writeFileSync(path.join(base,'cenarios',s.id+'.json'),JSON.stringify(s,null,2)+'\n');
 let formula=s.rate_basis==='monthly'?'S(n)=S0(1+i)^n+(R−G)((1+i)^n−1)/i. Se i=0: S0+n(R−G)+Σeventos.':'S(n)=S0[1+a(1−IR)]^(Σdias/365), sem fluxos. IR é desconto na taxa anual: convenção explícita de projeção; não apuração tributária no resgate.';
 if(s.inflation)formula='S(n)=S0−Σ arred(G0(1+IPCA)^J(k)); J(k) é o número de janeiros desde hoje. Dezembro 100, janeiro 110.';
 if(s.application)formula+=' Depois do vencimento fator=0. O resgate transfere para caixa, não cria receita.';
 const lines=[`# ${s.title}`,'',`Valores inventados em centavos: S0=${s.initial}; renda=${s.income}; gasto=${s.expense}; início=${s.start}.`,'',formula,'','Passos: 1. Rendimento na abertura positiva. 2. Arredondar rendimento meio para cima ao centavo. 3. Entradas e saídas no fim. A solução fechada sem arredondamento é conferida separadamente com limite de propagação de meio centavo por mês, capitalizado.','',...rows.map(r=>`- ${r.mes}, ${r.dias} dias: rendimento ${r.rendimento} + fluxo ${r.fluxo}; saldo ${r.saldo} centavos. Fórmula fechada: ${r.fechado_sem_arredondamento} centavos.`),'',`Esperado final: **${rows.at(-1).saldo} centavos**.`];
 if(s.api_probe)lines.push('API em separado: parcela 100 já no envelope 300 não gera compromisso. Primeiro saldo 700; piso do motor direto 600.');
 if(s.id==='05-parcela-13')lines.push('Outubro 1.000; novembro 800; dezembro 700. Testa compromisso explícito fora do envelope. A API trata parcela dentro do envelope; a geração do 13º pela folha tem prova separada.');
 fs.writeFileSync(path.join(base,'cenarios',s.id+'.md'),lines.join('\n')+'\n');
}}
module.exports={oracle,generate,read};
if(require.main===module){generate();const out=Object.fromEntries(fs.readdirSync(path.join(base,'cenarios')).filter(f=>f.endsWith('.json')).sort().map(f=>{const s=read(path.join(base,'cenarios',f));return [s.id,{status:'ok',serie:oracle(s)}]}));
 for(const [id,value]of Object.entries({'01-juros-1-mes':101000,'02-juros-12-meses':112684,'03-renda-gasto':220000,'05-parcela-13':70000,'07-reajuste':79000}))assert.equal(out[id].serie.at(-1).saldo,value,id+' âncora manual');
 fs.writeFileSync(path.join(base,'resultados/oraculo.json'),JSON.stringify(out,null,2));}


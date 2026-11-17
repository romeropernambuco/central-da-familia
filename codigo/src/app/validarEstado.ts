const objeto = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v)
export function validarEstado(d: any) {
 const falha = (onde: string): never => { throw new Error('Cópia inválida ou incompleta: ' + onde) }
 const lista = (v: any, nome: string, campos: Record<string,string> = {}) => {
 if(!Array.isArray(v)) falha(nome)
 const ids=new Set<string>()
 for(const x of v){if(!objeto(x))falha(nome);for(const [k,t] of Object.entries(campos))if(typeof x[k]!==t || (t==='number'&&!Number.isFinite(x[k])))falha(nome+'.'+k);if('id' in x){if(typeof x.id!=='string'||!x.id||ids.has(x.id))falha(nome+'.id');ids.add(x.id)}}
 }
 const campos: Record<string,Record<string,string>>={lancamentos:{id:'string',valor:'number',envelope_id:'string',data:'string'},cartoes:{id:'string',nome:'string'},aplicacoes:{id:'string',nome:'string'},imoveis:{id:'string',apelido:'string',valor:'number'},receitas:{id:'string',descricao:'string',valor:'number'},desejos:{id:'string',nome:'string',valor:'number'},pessoas:{id:'string',nome:'string'},assessores:{id:'string',nome:'string'}}
 const seguro=(v:any,n=0):boolean=>n<60 && (v===null || typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v)||Array.isArray(v)&&v.every(x=>seguro(x,n+1))||objeto(v)&&Object.entries(v).every(([k,x])=>!['__proto__','constructor','prototype'].includes(k)&&seguro(x,n+1)))
 if(!objeto(d)||!seguro(d))falha('dados')
 for(const [k,c] of Object.entries(campos))lista(d[k],k,c)
 if(!objeto(d.config)||!objeto(d.parametros))falha('configurações ou parâmetros')
 if(!d.estado)return
 if(!Array.isArray(d.chavesLancamentos)||!d.chavesLancamentos.every((x:any)=>Array.isArray(x)&&x.length===2&&typeof x[0]==='string'&&objeto(x[1])&&d.lancamentos.some((l:any)=>JSON.stringify(l)===JSON.stringify(x[1]))))falha('chaves de lançamento')
 if(new Set(d.chavesLancamentos.map((x:any)=>x[0])).size!==d.chavesLancamentos.length)falha('chaves repetidas')
 lista(d.nomesAvulsos,'nomes avulsos',{id:'string',nome:'string'})
 const e=d.estado,z=d.estado2
 if(!objeto(e)||!objeto(z))falha('estado')
 const arrays: Record<string,Record<string,string>>={envs:{id:'string',nome:'string',regra:'string',limite_mes:'number',colchao:'number',casa:'boolean'},lanc:campos.lancamentos,cartoes:campos.cartoes,imoveis:campos.imoveis,recebimentos:campos.receitas,desejos:campos.desejos,ajustes:{id:'string',mes:'string',de:'string',para:'string',valor:'number'},convites:{id:'string',nome:'string',papel:'string'},comprasEquipe:{id:'string',data:'string',nome:'string',tipo:'string',nota:'boolean',por:'string'},imprevistos:{id:'string',mes:'string',envelope:'string',valor:'number'},reajusteVotos:{mes:'string',membro_id:'string',teto:'number',ipca:'string',votou_em:'string'}}
 for(const [k,c] of Object.entries(arrays))lista(e[k],k,c)
 if(typeof e.hoje!=='string'||!objeto(e.config)||!objeto(e.objetivo)||!objeto(e.reajusteBase)||!Array.isArray(e.objetivo.historico))falha('estado da família')
 for(const [k,v] of Object.entries(e.config)){if(['rendas','metas','entradas','casa_prestadores','casa_lista'].includes(k))lista(v,k);if(['casa_folha','casa_gas','casa_presenca','fontes_receita'].includes(k)&&!objeto(v))falha(k)}
 if(e.config.casa_folha){lista(e.config.casa_folha.pessoas,'Assessores',{id:'string',nome:'string'});if(!objeto(e.config.casa_folha.daePaga))falha('DAE')}
 const cfg=e.config
 const schemas:Record<string,Record<string,string>>={rendas:{id:'string',nome:'string',valor:'number'},metas:{id:'string',nome:'string',valor:'number',guardado:'number'},entradas:{id:'string',data:'string',valor:'number'},casa_prestadores:{id:'string',nome:'string',servico:'string',dia:'number',valor:'number'},casa_lista:{id:'string',nome:'string',ok:'boolean'}}
 for(const [k,campos] of Object.entries(schemas))if(k in cfg)lista(cfg[k],k,campos)
 if(cfg.metas_pessoais){if(!objeto(cfg.metas_pessoais))falha('metas pessoais');for(const m of Object.values(cfg.metas_pessoais) as any[]){if(!objeto(m)||typeof m.nome!=='string'||typeof m.valor!=='number')falha('meta pessoal');if(m.anotacoes)lista(m.anotacoes,'anotações',{id:'string',valor:'number',data:'string'})}}
 if(cfg.casa_presenca)for(const v of Object.values(cfg.casa_presenca))if(!Array.isArray(v)||!v.every(x=>typeof x==='string'))falha('presença')
 if(e.objetivo.parametros!==null&&!objeto(e.objetivo.parametros))falha('parâmetros')
 for(const v of Object.values(e.reajusteBase))if(typeof v!=='number')falha('reajuste')
 if(e.config.casa_gas&&!Array.isArray(e.config.casa_gas.trocas))falha('gás')
 for(const k of ['apps','lembretes','diario','fatBanco','feiras','itens','contagens','chaves'])if(!Array.isArray(z[k]))falha('Guardado.'+k)
 for(const k of ['desde','semFeira','pedidoEquipe','decididos'])if(!objeto(z[k]))falha('Guardado.'+k)
 if(typeof z.n!=='number'||!Number.isInteger(z.n)||z.n<0)falha('contador')
 lista(z.apps,'aplicações',campos.aplicacoes)
 for(const a of z.apps)lista(a.movimentos,'movimentos',{tipo:'string',data:'string',valor:'number'})
 if(!z.chaves.every((x:any)=>typeof x==='string'))falha('chaves')
 const schemas2:Record<string,Record<string,string>>={lembretes:{id:'string',titulo:'string',quando:'string',para:'string',funcionario:'string'},diario:{id:'string',ref:'string',funcionario:'string',assunto:'string',pergunta:'string',quando:'string'},fatBanco:{cartao_id:'string',mes:'string'},feiras:{id:'string',semana:'string',data:'string',valor:'number',tem_nota:'boolean'},itens:{id:'string',nome:'string',categoria:'string',ativo:'boolean'},contagens:{id:'string',semana:'string',data:'string',contado_por:'string'}}
 for(const [k,c] of Object.entries(schemas2))lista(z[k],k,c)
 for(const c of z.contagens)lista(c.itens,'contagem',{item_id:'string',estado:'string'})
 const completos:Record<string,Record<string,string>>={imoveis:{dono_membro:'string',uso:'string',aluguel:'number',custos:'number',vacancia:'string',tem_contrato:'boolean',venda_contrato:'boolean'},recebimentos:{dono_membro:'string',mes_previsto:'string',tipo:'string',certo:'boolean'},desejos:{dono_membro:'string',mes:'string',volta_de:'string',volta:'number',volta_certa:'boolean',situacao:'string'}}
 for(const [k,c] of Object.entries(completos))lista(e[k],k,c)
 function parametros(p:any){if(p===null)return;if(!objeto(p))falha('parâmetros');lista([p],'parâmetros',{renda_certa_2029:'number',margem:'string',taxa_real_trabalho:'string',aliq_proj:'string',mes_reajuste:'number',travado_focus:'boolean'});for(const k of ['taxa_bruta_ano','ipca_ano'])if(!objeto(p[k])||!Object.values(p[k]).every(v=>typeof v==='string'))falha(k);for(const k of ['gasto_2029_hoje','piso_meses'])if(p[k]!==null&&typeof p[k]!=='number')falha(k)}
 parametros(e.objetivo.parametros)
 for(const h of e.objetivo.historico){if(!objeto(h)||typeof h.quando!=='string')falha('histórico');parametros(h.antes);parametros(h.depois)}
 for(const [k,t] of [['desde','string'],['semFeira','boolean'],['pedidoEquipe','boolean']] as const)if(!Object.values(z[k]).every(v=>typeof v===t))falha(k)
 for(const a of z.apps)if(typeof a.pct_cdi!=='number'||typeof a.tipo!=='string'||typeof a.liquidez!=='string')falha('aplicação')
 const envs=new Set(e.envs.map((x:any)=>x.id)),pessoas=new Set(d.pessoas.map((x:any)=>x.id)),cartoes=new Set(e.cartoes.map((x:any)=>x.id))
 for(const l of e.lanc){if(!envs.has(l.envelope_id)||l.cartao_id&&!cartoes.has(l.cartao_id)||l.pago_por&&!pessoas.has(l.pago_por))falha('referência de lançamento')}
 const itens=new Set(z.itens.map((x:any)=>x.id))
 for(const c of z.contagens)for(const i of c.itens)if(!itens.has(i.item_id))falha('item de contagem')
 for(const f of z.fatBanco)if(!cartoes.has(f.cartao_id))falha('cartão de fatura')
 for(const a of z.apps)if(a.titular&&!pessoas.has(a.titular))falha('titular da aplicação')
 for(const c of e.cartoes)if(c.titular_id&&!pessoas.has(c.titular_id))falha('titular do cartão')
 for(const a of e.ajustes)if(!envs.has(a.para)||a.de!=='reserva-mes-ruim'&&!envs.has(a.de))falha('referência de ajuste')
 for(const i of e.imprevistos)if(!envs.has(i.envelope))falha('referência de imprevisto')
 for(const v of e.reajusteVotos)if(!pessoas.has(v.membro_id))falha('autor do voto')
 for(const p of d.pessoas)if(p.envelope&&!envs.has(p.envelope))falha('envelope da pessoa')
 for(const k of ['imoveis','recebimentos','desejos'])for(const x of e[k])if(x.dono_membro&&!pessoas.has(x.dono_membro))falha('dono de '+k)
 for(const [a,b] of [['lancamentos','lanc'],['cartoes','cartoes'],['imoveis','imoveis'],['receitas','recebimentos'],['desejos','desejos'],['config','config'],['parametros','objetivo']])if(JSON.stringify(d[a])!==JSON.stringify(e[b]))falha('dados inconsistentes: '+a)
 if(JSON.stringify(d.aplicacoes)!==JSON.stringify(z.apps))falha('aplicações inconsistentes')
}

// C2 (14/11): lista única da equipe. O app (telas/escritorio/equipe.ts) e a página publicada (paineis/escritorio3d) têm
// os mesmos funcionários; quem não tem dado no banco aparece com "ainda sem dado" e nenhum número.
import { describe, expect, it } from 'vitest'
// @ts-ignore: o projeto não tem os tipos do Node; o Vitest roda em Node (a pasta de trabalho é codigo/)
import { readFileSync } from 'node:fs'
// @ts-ignore: idem
import { createHash } from 'node:crypto'
import { EQUIPE, POR_ID } from './telas/escritorio/equipe'
import { completarEquipe } from './telas/escritorio/useEquipe'
import { FAZ } from './telas/escritorio/Ficha'
import type { FuncionarioEsc } from './api/tipos'

// impressão digital (sha256, 16 letras) de cada nome em minúsculas e sem acento: a mesma lista do portão 6b
const NOMES_REAIS = new Set(['ea796cd69664e39e', 'f3d8f6ef539025ac', 'bbe47010dd7d075f'])
const impressao = (nome: string): string => createHash('sha256').update(nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()).digest('hex').slice(0, 16)
const pagina = readFileSync('../paineis/escritorio3d/index.html', 'utf8')
const bloco = pagina.slice(pagina.indexOf('var EQUIPE=['), pagina.indexOf('var POR_ID={};'))
const daPagina = [...bloco.matchAll(/\{id:'([a-z]+)',nome:'([^']+)',curto:'([^']+)',ini:'[A-Z]+',sala:'([a-z]+)',slot:(-?\d)/g)].map(m => ({ id: m[1], nome: m[2], curto: m[3], sala: m[4], mesa: Number(m[5]) }))
const DO_BANCO: FuncionarioEsc[] = [
  { id: 'contador', nome: 'Contador', sala: 'Caixa', estado: 'entregue', frase: 'x' }, { id: 'colchao', nome: 'Guardião da Reserva', sala: 'Caixa', estado: 'entregue', frase: 'x' },
  { id: 'cartao', nome: 'Analista de Cartão', sala: 'Cartões', estado: 'entregue', frase: 'x' }, { id: 'folha', nome: 'Folha da Casa', sala: 'Casa', estado: 'entregue', frase: 'x' },
  { id: 'comprador', nome: 'Comprador', sala: 'Casa', estado: 'entregue', frase: 'x' }, { id: 'fiscal', nome: 'Fiscal da Feira', sala: 'Casa', estado: 'precisa_de_voce', frase: 'x' },
  { id: 'guardado', nome: 'Gestor do Guardado', sala: 'Patrimônio', estado: 'entregue', frase: 'x' }, { id: 'secretaria', nome: 'Secretária', sala: 'Recepção', estado: 'entregue', frase: 'x' },
]

describe('C2: lista única da equipe', () => {
  it('19 funcionários, preservando os originais e cobrindo as abas, com papel, dado e mesa', () => {
    expect(EQUIPE).toHaveLength(19)
    for (const id of ['auditor', 'assistente', 'tesoureiro', 'usina', 'presenca']) expect(POR_ID[id], id).toBeTruthy()
    expect(POR_ID.auditor.nome).toBe('Ajudante de Estoque'); expect(POR_ID.tesoureiro.nome).toBe('Tesoureiro de Receitas')
    expect(POR_ID.usina.nome).toBe('Gerente da Usina'); expect(POR_ID.presenca.nome).toBe('Ajudante de Presença')
    for (const m of EQUIPE) { expect(m.papel.length, m.id).toBeGreaterThan(10); expect(m.dado.length, m.id).toBeGreaterThan(5); expect(m.faz).toHaveLength(3); expect(FAZ[m.id]).toEqual(m.faz) }
  })
  it('nenhuma sala com 2 pessoas na mesma mesa nem mais de 3 mesas', () => {
    const por: Record<string, number[]> = {}
    for (const m of EQUIPE) (por[m.sala] ||= []).push(m.mesa)
    for (const [s, ms] of Object.entries(por)) { expect(new Set(ms).size, s).toBe(ms.length); expect(ms.length, s).toBeLessThanOrEqual(3) }
  })
  it('nada de nome real de pessoa no código: Assistente do Orçamento', () => {
    expect(POR_ID.assistente.nome).toBe('Assistente do Orçamento')
    const tudo = JSON.stringify(EQUIPE) + bloco
    // E14 (P1): nenhum nome real em texto aqui também; compara pela impressão digital, igual ao portão 6b (scripts/portoes.mjs)
    const achados = (tudo.match(/[A-Za-zÀ-ÿ]+/g) || []).filter(p => NOMES_REAIS.has(impressao(p)))
    expect(achados).toHaveLength(0)
  })
  it('preserva os 13 personagens do protótipo publicado sem exigir publicação dos novos', () => {
    expect(daPagina).toHaveLength(13)
    expect(daPagina.map(x => x.id)).toEqual(EQUIPE.slice(0, 13).map(m => m.id))
    for (const p of daPagina) { const m = POR_ID[p.id]; expect([p.nome.replace('Fiscal da Feira', 'Ajudante da Feira').replace('Controlador de Presença', 'Ajudante de Presença').replace('Auditor de Estoque', 'Ajudante de Estoque').replace('Assistente de quem cuida da casa', 'Assistente do Orçamento'), p.curto === 'Fiscal' ? 'Ajudante' : p.curto, p.sala, p.mesa], p.id).toEqual([m.nome, m.curto, m.sala, m.mesa]) }
  })
  it('na página, quem não tem dado no banco não tem número (semDado, sem num)', () => {
    for (const id of ['assistente', 'usina']) { const linha = bloco.slice(bloco.indexOf(`{id:'${id}'`), bloco.indexOf('cor:', bloco.indexOf(`{id:'${id}'`))); expect(linha).toContain('semDado:true'); expect(linha).not.toMatch(/num:/) }
  })
  it('o app completa os 8 do banco com os 5, na ordem da lista; sem dado = "ainda sem dado" e nenhum R$', () => {
    const r = completarEquipe(DO_BANCO, { rec: null, est: null, avisos: [], pres: {} }, '2026-11-18')
    expect(r.map(f => f.id)).toEqual(EQUIPE.map(m => m.id))
    const sem = r.filter(f => f.semDado).map(f => f.id).sort()
    expect(sem).toEqual(['analista', 'anfitriao', 'assistente', 'auditor', 'imoveis', 'protetora', 'sonhadora', 'tesoureiro', 'usina', 'zelador'])
    for (const f of r.filter(f => f.semDado)) {
      expect(f.frase).toBe(`Ainda sem dado. ${POR_ID[f.id].papel}`)
      // O ano no título do objetivo é metadado, não um saldo inventado.
      expect(f.frase.replace('Rumo a 2029', '')).not.toMatch(/R\$|\d/)
    }
    expect(r.find(f => f.id === 'fiscal')!.estado).toBe('precisa_de_voce') // o que veio do banco fica como veio
  })
  it('com dado no banco: Tesoureiro diz o próximo recebimento, Auditor a última contagem, Presença quem veio', () => {
    const r = completarEquipe(DO_BANCO, {
      rec: [{ id: 'r1', dono_membro: 'm', dono_nome: null, descricao: 'Contrato (exemplo)', valor: 50000, mes_previsto: '2027-03', mes_novo: null, tipo: 'contrato', certo: true, recebido_em: null, valor_recebido: null, meu: true },
        { id: 'r2', dono_membro: 'm', dono_nome: null, descricao: 'Já entrou', valor: 10, mes_previsto: '2026-10', mes_novo: null, tipo: 'outro', certo: true, recebido_em: '2026-10-05', valor_recebido: 10, meu: true }],
      est: { itens: [], contagens: [{ id: 'c1', semana: '2026-11-09', data: '2026-11-10', contado_por: null, itens: [{ item_id: 'a', estado: 'acabou' }, { item_id: 'b', estado: 'pouco' }, { item_id: 'c', estado: 'tem' }] }] },
      avisos: [{ tipo: 'casa_presenca', data: '2026-11-18', nome: 'Carla' }], pres: {},
    }, '2026-11-18')
    const f = (id: string) => r.find(x => x.id === id)!
    expect(f('tesoureiro').frase.replace(/\u00a0/g, ' ')).toBe('1 recebimento com data pra entrar. O próximo: Contrato (exemplo), R$ 50.000 em 03/2027.')
    expect(f('auditor').frase).toBe('Última contagem do estoque: 10/11. 1 item acabou, 1 com pouco.')
    expect(f('presenca').frase).toBe('Hoje marcou presença: Carla.')
    expect(r.filter(x => x.semDado).map(x => x.id).sort()).toEqual(['analista', 'anfitriao', 'assistente', 'imoveis', 'protetora', 'sonhadora', 'usina', 'zelador'])
  })
})

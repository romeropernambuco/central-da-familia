import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  ChevronRight,
  CircleHelp,
  Clock,
  CreditCard,
  Eye,
  EyeOff,
  House,
  Landmark,
  ListChecks,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  ShoppingBasket,
  Sparkles,
  Target,
  TriangleAlert,
  Undo2,
  Users,
  Wallet,
  X,
  Download,
  Mail,
  Gauge,
  Calculator,
  FileText,
  Coins,
  Bell,
} from 'lucide-react'
import type { LucideIcon, LucideProps } from 'lucide-react'
import { BellRing, HeartHandshake, Sun, UserCheck, PackageSearch, UserRound, ClipboardCheck } from 'lucide-react'

/** Vocabulário visual único. Importações explícitas preservam o tree shaking. */
const iconesDeInterface = {
  inicio: House,
  lancamentos: ListChecks,
  orcamento: Wallet,
  casa: ShoppingBasket,
  desejos: Sparkles,
  guardado: Landmark,
  cartoes: CreditCard,
  planejamento: Target,
  escritorio: Building2,
  ajustes: Settings2,
  privacidade: ShieldCheck,
  painel: Gauge,
  lancar: Plus,
  entrada: ArrowDownLeft,
  gasto: ArrowUpRight,
  guardar: Landmark,
  imovel: Building2,
  cartao: CreditCard,
  desejo: Sparkles,
  plano2029: Target,
  backup: Download,
  desfazer: Undo2,
  olho: Eye,
  olhoFechado: EyeOff,
  assessor: Users,
  ajuda: CircleHelp,
  salvo: Check,
  erro: TriangleAlert,
  pendente: Clock,
  mais: Menu,
  abrir: ChevronRight,
  fechar: X,
  email: Mail,
} satisfies Record<string, LucideIcon>

const iconesDeFuncionario = {
  cartao: CreditCard,
  guardado: Landmark,
  assessor: Users,
  contador: Calculator,
  colchao: ShieldCheck,
  tesoureiro: Coins,
  folha: FileText,
  comprador: ShoppingBasket,
  fiscal: ClipboardCheck,
  gerente: CreditCard,
  investidor: Landmark,
  corretor: Building2,
  planejador: Target,
  recepcao: Bell,
  assistente: HeartHandshake,
  secretaria: BellRing,
  anfitriao: House,
  sonhadora: Sparkles,
  analista: CreditCard,
  zelador: ShoppingBasket,
  protetora: ShieldCheck,
  imoveis: Building2,
  usina: Sun,
  presenca: UserCheck,
  auditor: PackageSearch,
  pessoa: UserRound,
} satisfies Record<string, LucideIcon>
// A galeria de propostas ainda consulta o vocabulário completo.
export const icones = { ...iconesDeInterface, ...iconesDeFuncionario }
export type NomeIcone = keyof typeof icones

export function desenhoFuncionario(id: string): LucideIcon {
  return Object.prototype.hasOwnProperty.call(iconesDeFuncionario, id)
    ? iconesDeFuncionario[id as keyof typeof iconesDeFuncionario]
    : UserRound
}

type Props = LucideProps & ({ nome: NomeIcone; desenho?: never } | { desenho: LucideIcon; nome?: never })
/** Ícones junto de texto são decorativos; rotulo é reservado ao ícone que informa sozinho. */
export function Icone({
  nome,
  desenho,
  size = 20,
  strokeWidth = 1.75,
  rotulo,
  className = '',
  ...props
}: Props & { rotulo?: string }) {
  const Desenho =
    desenho ??
    (nome! in iconesDeInterface
      ? iconesDeInterface[nome as keyof typeof iconesDeInterface]
      : iconesDeFuncionario[nome as keyof typeof iconesDeFuncionario])
  return (
    <Desenho
      {...props}
      size={size}
      strokeWidth={strokeWidth}
      className={`ico ${className}`}
      focusable="false"
      aria-hidden={rotulo ? undefined : true}
      role={rotulo ? 'img' : undefined}
      aria-label={rotulo}
    />
  )
}

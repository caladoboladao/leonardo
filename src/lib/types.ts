export type StatusOption = {
  id: string;
  nome: string;
  cor: string;
  ordem: number;
  isConcluido: boolean;
};

export type OrgaoOption = { id: string; nome: string };
export type TipoAtoOption = { id: string; nome: string };

export type EmpresaVinculada = { id: string; nome: string };
export type ProtocoloVinculado = { id: string; numero: string };

export type EmpresaOption = { id: string; razaoSocial: string; cnpj: string | null };

export type Empresa = EmpresaOption & {
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EmpresaListItem = Empresa & {
  _count: { protocolos: number };
};

export type LancamentoResumo = {
  tipo: TipoLancamento;
  situacao: SituacaoLancamento;
  total: number;
};

export type EmpresaDetail = Empresa & {
  protocolos: ProtocoloListItem[];
  lancamentosResumo: LancamentoResumo[];
};

export type ProtocoloListItem = {
  id: string;
  empresa: string;
  empresaId: string;
  numeroProtocolo: string | null;
  cnpj: string | null;
  orgaoId: string | null;
  orgao: OrgaoOption | null;
  tipoAtoId: string | null;
  tipoAto: TipoAtoOption | null;
  statusId: string;
  status: StatusOption;
  dataInicio: string;
  prazoDias: number | null;
  dataVencimento: string | null;
  dataConclusao: string | null;
  clienteResponsavel: string | null;
  observacoes: string | null;
  empresasVinculadas: EmpresaVinculada[];
  protocolosVinculados: ProtocoloVinculado[];
  _count: { lembretes: number };
  createdAt: string;
  updatedAt: string;
};

export type OrigemLembrete =
  | "MANUAL"
  | "PRAZO_EXIGENCIA"
  | "PRAZO_ORGAO"
  | "PARADO_SEM_MOVIMENTACAO";

export type StatusLembrete = "PENDENTE" | "RESOLVIDO";

export type Lembrete = {
  id: string;
  protocoloId: string;
  dataHora: string;
  nota: string;
  origem: OrigemLembrete;
  status: StatusLembrete;
  createdAt: string;
  updatedAt: string;
};

export type LembreteComProtocolo = Lembrete & {
  protocolo: {
    id: string;
    empresa: string;
    numeroProtocolo: string | null;
    status: { nome: string; cor: string };
  };
};

export type StatusHistoricoItem = {
  id: string;
  changedAt: string;
  statusAnterior: StatusOption | null;
  statusNovo: StatusOption;
};

export type TipoLancamento = "TAXA" | "HONORARIO";

export type SituacaoLancamento = "A_PAGAR" | "PAGO" | "A_FATURAR" | "FATURADO" | "RECEBIDO";

export type Lancamento = {
  id: string;
  protocoloId: string;
  tipo: TipoLancamento;
  descricao: string;
  valor: number;
  vencimento: string | null;
  dataPagamento: string | null;
  situacao: SituacaoLancamento;
  createdAt: string;
  updatedAt: string;
};

export const SITUACAO_LANCAMENTO_LABEL: Record<SituacaoLancamento, string> = {
  A_PAGAR: "A pagar",
  PAGO: "Pago",
  A_FATURAR: "A faturar",
  FATURADO: "Faturado",
  RECEBIDO: "Recebido",
};

export type ProtocoloDetail = ProtocoloListItem & {
  lembretes: Lembrete[];
  historicoStatus: StatusHistoricoItem[];
  tarefas: Tarefa[];
  exigencias: Exigencia[];
  lancamentos: Lancamento[];
};

export type Settings = {
  id: string;
  userId: string;
  diasAlertaPrazo: number;
  diasParado: number;
  statusEmExigenciaId: string | null;
  updatedAt: string;
};

export type StatusExigencia = "ABERTA" | "CUMPRIDA";

export type Exigencia = {
  id: string;
  protocoloId: string;
  dataRecebimento: string;
  descricao: string;
  prazoCumprimento: number;
  dataCumprimento: string | null;
  numeroReprotocolo: string | null;
  status: StatusExigencia;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  geradoEm: string;
  periodoLabel: string;
  totalAtivos: number;
  vencendoEstaSemana: number;
  vencidos: number;
  paradosSemMovimentacao: number;
  abertosNoPeriodo: number;
  concluidosNoPeriodo: number;
  tempoMedioConclusaoDias: number | null;
  porStatus: { statusId: string; nome: string; cor: string; total: number }[];
  porOrgao: { nome: string; total: number }[];
  totalTaxasNoPeriodo: number;
  totalTaxasPagasNoPeriodo: number;
  totalHonorariosNoPeriodo: number;
  totalHonorariosRecebidosNoPeriodo: number;
};

export type OrigemTarefa = "MANUAL" | "MODELO";

export type Tarefa = {
  id: string;
  userId: string;
  titulo: string;
  descricao: string | null;
  prazo: string | null;
  concluida: boolean;
  dataConclusao: string | null;
  protocoloId: string | null;
  protocolo: { id: string; empresa: string; numeroProtocolo: string | null } | null;
  empresaId: string | null;
  empresa: { id: string; razaoSocial: string } | null;
  ordem: number;
  origem: OrigemTarefa;
  createdAt: string;
  updatedAt: string;
};

export type GatilhoModeloTarefa = "CRIACAO" | "CONCLUSAO";

export type ModeloTarefa = {
  id: string;
  userId: string;
  tipoAtoId: string;
  titulo: string;
  descricao: string | null;
  prazoDiasRelativo: number | null;
  gatilho: GatilhoModeloTarefa;
  ordem: number;
  createdAt: string;
  updatedAt: string;
};

export type ExigenciaComProtocolo = Exigencia & {
  protocolo: { id: string; empresa: string; numeroProtocolo: string | null };
};

export type HojeSummary = {
  geradoEm: string;
  tarefasVencidas: Tarefa[];
  tarefasHoje: Tarefa[];
  protocolosVencidos: ProtocoloListItem[];
  protocolosHoje: ProtocoloListItem[];
  lembretesPendentes: LembreteComProtocolo[];
  exigenciasVencidas: ExigenciaComProtocolo[];
  exigenciasHoje: ExigenciaComProtocolo[];
};

export const ORIGEM_LABEL: Record<OrigemLembrete, string> = {
  MANUAL: "Manual",
  PRAZO_EXIGENCIA: "Prazo de exigência",
  PRAZO_ORGAO: "Prazo do órgão",
  PARADO_SEM_MOVIMENTACAO: "Sem movimentação",
};

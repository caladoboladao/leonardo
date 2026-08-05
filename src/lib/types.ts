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

export type ProtocoloListItem = {
  id: string;
  empresa: string;
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

export type ProtocoloDetail = ProtocoloListItem & {
  lembretes: Lembrete[];
  historicoStatus: StatusHistoricoItem[];
};

export type Settings = {
  id: string;
  userId: string;
  diasAlertaPrazo: number;
  diasParado: number;
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
};

export const ORIGEM_LABEL: Record<OrigemLembrete, string> = {
  MANUAL: "Manual",
  PRAZO_EXIGENCIA: "Prazo de exigência",
  PRAZO_ORGAO: "Prazo do órgão",
  PARADO_SEM_MOVIMENTACAO: "Sem movimentação",
};

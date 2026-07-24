import { ProtocolosView } from "@/components/protocolos/ProtocolosView";

export default function HistoricoPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">
        Histórico de protocolos concluídos
      </h1>
      <ProtocolosView arquivados={true} />
    </div>
  );
}

import { ProtocolosView } from "@/components/protocolos/ProtocolosView";

export default function ConcluidosPage() {
  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Concluídos</h1>
      <ProtocolosView arquivados={true} />
    </div>
  );
}

import { EmpresaDetailView } from "@/components/empresas/EmpresaDetailView";

export default async function EmpresaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <EmpresaDetailView empresaId={id} />;
}

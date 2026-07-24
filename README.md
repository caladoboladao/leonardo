# Protocolos Societários

Plataforma pessoal, estilo Notion, para acompanhar protocolos do setor societário
(Juntas Comerciais, Prefeituras e outros órgãos): visão em planilha, lembretes
manuais e automáticos por prazo/inatividade, histórico de status e alertas por
e-mail.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth (Auth.js) — login por e-mail/senha, uso individual
- Resend — envio de e-mail dos lembretes automáticos
- Cron (Vercel Cron ou qualquer agendador) — roda a checagem diária de prazos

## Desenvolvimento local

1. Tenha um PostgreSQL rodando localmente (ou use Docker: `docker run -d -e POSTGRES_PASSWORD=leonardo -e POSTGRES_DB=leonardo -p 5432:5432 postgres:16-alpine`).
2. Copie `.env.example` para `.env` e ajuste `DATABASE_URL`, `AUTH_SECRET`, `SEED_USER_EMAIL`/`SEED_USER_PASSWORD` (seu login) e `CRON_SECRET`.
3. Instale as dependências e prepare o banco:

```bash
npm install
npx prisma migrate dev
npm run db:seed
```

O seed cria seu usuário, os status padrão (Em elaboração, Protocolado, Em
exigência, Deferido, Indeferido, Aguardando pagamento, Concluído), alguns
órgãos comuns (JUCEAL, JUCEC, Prefeitura de Maceió, SEFAZ/AL, Receita
Federal) e tipos de ato — tudo editável depois pela tela de Configurações.

4. Suba o servidor:

```bash
npm run dev
```

Acesse `http://localhost:3000` e entre com o e-mail/senha definidos em `.env`.

## Deploy (Vercel + Postgres gerenciado)

1. Crie um banco Postgres (Neon, Supabase ou Railway funcionam bem) e pegue a
   `DATABASE_URL`.
2. Crie o projeto na Vercel apontando para este repositório.
3. Configure as variáveis de ambiente do projeto na Vercel com os mesmos
   nomes de `.env.example` (`DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL` com
   a URL pública do deploy, `RESEND_API_KEY`, `EMAIL_FROM`, `EMAIL_TO`,
   `CRON_SECRET`).
4. Não precisa rodar migração/seed manualmente: o `package.json` define um
   script `vercel-build` (`prisma migrate deploy && prisma db seed && next
   build`) que a Vercel detecta e executa automaticamente a cada deploy — ele
   aplica as migrações pendentes e (re)cria seu usuário/listas padrão via
   upsert, então é seguro rodar em todo deploy.
5. O arquivo `vercel.json` já configura um Vercel Cron diário
   (`/api/cron/check-prazos`, 11h UTC ≈ 8h em Maceió) que gera os lembretes
   automáticos de prazo/inatividade e dispara o e-mail de resumo. A Vercel
   autentica automaticamente essa chamada usando o valor de `CRON_SECRET`.
6. Crie uma conta no [Resend](https://resend.com), gere uma API key e
   preencha `RESEND_API_KEY`/`EMAIL_FROM` para os e-mails de lembrete
   funcionarem (sem isso o app funciona normalmente, só não envia e-mail).

## Funcionalidades

- **Protocolos** (`/`): visão em planilha dos protocolos ativos, com edição
  direto nas células (empresa, nº protocolo, órgão, tipo de ato, status,
  datas, prazo, responsável), filtro por texto/status/órgão, ordenação por
  coluna, e destaque visual para vencimento próximo/estourado.
- **Painel lateral**: ao clicar numa empresa, abre um card com todos os
  detalhes, histórico de mudanças de status e lista de lembretes daquele
  protocolo.
- **Lembretes** (`/lembretes`): visão consolidada de todos os lembretes
  pendentes (ou resolvidos) de todos os protocolos.
- **Histórico** (`/historico`): protocolos com status marcado como
  "conclui protocolo", continuam pesquisáveis mas saem da visão principal.
- **Configurações** (`/configuracoes`): dias de antecedência do alerta de
  prazo, dias de inatividade para o alerta de "sem movimentação", e as
  listas editáveis de status (com cor), órgãos e tipos de ato.

## Automação de lembretes

Um job diário (`/api/cron/check-prazos`) verifica, para cada protocolo ativo:

- **Prazo**: se a data de vencimento está a N dias ou menos (configurável em
  Configurações), gera um lembrete de origem "Prazo do órgão" — inclusive se
  já estiver vencido, sinalizando a necessidade de reprotocolar.
- **Inatividade**: se o status não muda há N dias (configurável), gera um
  lembrete de origem "Sem movimentação".

Cada protocolo só recebe um lembrete automático por ciclo (o alerta não se
repete a cada execução do cron); um novo ciclo começa quando o prazo/data de
início é editado ou quando o status muda.

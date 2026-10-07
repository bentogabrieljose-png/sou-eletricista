# Sou Eletricista

Plataforma de formação profissional a distância do Centro de Formação Técnico Profissional Sou Eletricista.

## Stack

- React 19 + Vite + Tailwind CSS 4
- Express + tRPC 11
- Drizzle ORM + MySQL/TiDB
- Vitest
- PDF nativo com `pdf-lib`
- Cache offline limitado a conteúdos públicos

## Desenvolvimento

```bash
pnpm install
pnpm dev
```

Verificações:

```bash
pnpm check
pnpm test
pnpm build
```

## Deploy no Railway

O ficheiro `railway.json` já define a instalação, o build, o arranque e o health check em `/api/health`. No Railway, crie um projeto a partir deste repositório GitHub e adicione o serviço oficial **MySQL** ao mesmo projeto. Copie a variável `DATABASE_URL` disponibilizada pelo MySQL para o serviço da aplicação e configure as restantes variáveis listadas em `.env.example` no painel **Variables**. Depois do primeiro deploy, execute `pnpm db:push` através do shell do serviço para gerar e aplicar o esquema da base de dados.

O Railway deve fornecer a variável `PORT` automaticamente. O comando de produção é `pnpm start`; não use `pnpm dev` no serviço publicado. Os comprovativos, vídeos, imagens e PDFs continuam a precisar de um armazenamento S3/R2 compatível configurado através das variáveis do ambiente.

## Variáveis de ambiente

Configure-as no ambiente de execução; não as coloque no GitHub:

- `DATABASE_URL`
- `JWT_SECRET`
- `VITE_APP_ID`
- `OAUTH_SERVER_URL`
- `VITE_OAUTH_PORTAL_URL`
- `OWNER_OPEN_ID`
- `OWNER_NAME`
- `BUILT_IN_FORGE_API_URL`
- `BUILT_IN_FORGE_API_KEY`
- `VITE_FRONTEND_FORGE_API_URL`
- `VITE_FRONTEND_FORGE_API_KEY`

## Assets e armazenamento

As imagens, vídeos, comprovativos e ficheiros de certificados são geridos pelo armazenamento da plataforma (`/manus-storage/`) e pelas APIs do servidor. O repositório contém o código e as referências desses assets, mas não expõe ficheiros privados ou credenciais.

## Segurança

- O cache offline nunca guarda códigos de acesso, sessões, mensagens, comprovativos ou certificados privados.
- O repositório GitHub é privado.
- Ficheiros `.env`, chaves e saídas de build estão excluídos por `.gitignore`.

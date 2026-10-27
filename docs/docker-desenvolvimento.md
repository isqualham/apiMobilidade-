> Atualização: o Compose atual inicia somente a API. Seeds são exclusivamente manuais com `npm run seed:dev` e as proteções de ambiente descritas em [seed de desenvolvimento](seed-desenvolvimento.md). O inicializador legado executa apenas migrations e geração do Client; VIAU_AUTO_SEED não habilita seeds. As seções abaixo registram a configuração anterior da Tarefa 12.1, não a inicialização atual.

# Inicialização do Docker de desenvolvimento — Tarefa 12.1

## Fluxo

O Compose mantém os serviços `api`/`db`, nomes dos containers existentes, rede externa `my-network` e volume `postgres_data`. Adiciona `init`, de execução única, com `restart: no`.

1. `db` inicia e passa no healthcheck `pg_isready`.
2. `init` exige ambiente de desenvolvimento, confirmação e conexão local `db:5432`.
3. Executa `prisma migrate deploy --config prisma7.config.ts`.
4. Executa `prisma generate --config prisma7.config.ts`.
5. Com seed habilitada, cria documentos fictícios de desenvolvimento somente se não houver termos/política ativos, e executa a seed da Tarefa 12.
6. Somente após `init` terminar com código zero, o Compose inicia a API com o comando de desenvolvimento já existente.

Falha de migration, documentos ou seed impede a primeira inicialização da API. Um serviço de API que já estava executando não é automaticamente parado quando alguém executa `init` separadamente. Para reaplicar a preparação e validar o bloqueio num ambiente já ligado, parar a API antes.

O Dockerfile instala dependências com `npm ci`; não executa migrations ou seed no build. `.dockerignore` exclui segredos, caches e dependências da máquina. Os volumes novos `node_modules` e `next_cache` evitam misturar binários/cache do host com Linux. Não removem nem substituem `postgres_data`.

## Comandos

Na primeira utilização desta configuração, reconstruir a imagem:

```sh
docker compose up -d --build
```

Uso habitual:

```sh
docker compose up -d
```

A rede externa `my-network` e o `.env` de desenvolvimento continuam sendo pré-requisitos da estrutura existente. O `.env` precisa apontar para `db:5432/mobilidade_db`. A rede já utilizada pelo projeto não foi substituída. Não utilizar este Compose em produção.

Acompanhar:

```sh
docker compose ps -a
docker compose logs init
docker compose logs api
```

`init` aparecer como `Exited (0)` é sucesso, não falha. `docker compose restart api` reinicia somente a API e não reaplica dependências; não é substituto para `up` após alterações. Para repetir obrigatoriamente a preparação:

```sh
docker compose stop api
docker compose up -d --force-recreate init api
```

Não usar `down -v`, `migrate reset` ou `db push`. Migrations já confirmadas permanecem confirmadas se a seed falhar; corrigir a causa e repetir `up`. A seed em si é transacional e idempotente.

## Desabilitar seed automática

Definir no `.env`:

```dotenv
VIAU_AUTO_SEED=false
```

Ou para uma execução:

```sh
VIAU_AUTO_SEED=false docker compose up -d
```

Isso mantém migrations e geração do client, mas não executa seed nem cria documentos fictícios. Outros valores além de `true`/`false` são rejeitados. Padrão: `true`.

Execução manual da seed, com API disponível:

```sh
docker compose exec -e NODE_ENV=development -e VIAU_ENVIRONMENT=development -e VIAU_SEED_CONFIRM=desenvolvimento api npm run seed:dev
```

Se a seed foi desabilitada e o banco não possui termos/política ativos, cadastrá-los normalmente ou executar explicitamente o preparador fictício de desenvolvimento antes:

```sh
docker compose exec -e NODE_ENV=development -e VIAU_ENVIRONMENT=development -e VIAU_SEED_CONFIRM=desenvolvimento api node node_modules/vite-node/vite-node.mjs --config vitest.config.ts scripts/seed/documentos-dev.ts
```

## Segurança e documentos

`NODE_ENV` e `VIAU_ENVIRONMENT` devem ser `development`; valores de produção são preservados pelo Compose e bloqueados pelo inicializador antes das migrations. `VIAU_SEED_CONFIRM=desenvolvimento` é obrigatório inclusive com seed desligada. As proteções originais de `scripts/seed/ambiente.ts` permanecem intactas.

Os documentos criados usam versão `dev-seed-v1`, UUIDs reservados e texto explícito `DOCUMENTO FICTÍCIO — SOMENTE DESENVOLVIMENTO`. Não são documentos legais. Se já houver versão ativa, não há escrita. Se o ID/versão reservado existir inativo, a preparação falha; não reativa nem sobrescreve. Esta criação foi autorizada para permitir teste a partir de banco vazio.

Nenhuma conta, senha, veículo ou corrida existente é redefinida. Tarifas existentes são preservadas por padrão; atualização exige autorização manual por snapshot, nunca uma flag genérica. A Tarefa 13 prepara quatro categorias e padroniza aliases conhecidos preservando IDs; novas Conforto e Executivo permanecem inativas. Consulte [seed de desenvolvimento](seed-desenvolvimento.md) para valores, critérios e procedimento explícito de atualização. Conflitos são reportados e bloqueiam a preparação. A seed mantém `teste1234` apenas como senha de contas sintéticas, não a imprime e não cria administrador. Configuração de OSRM continua separada.

Se dependências mudarem, reconstruir a imagem e atualizar o volume de dependências com `docker compose run --rm --no-deps init npm ci`, antes de repetir a inicialização. Esse comando não aplica migrations/seed. Não apagar volumes do banco.

## Validação isolada

Os testes de Compose usam uma cópia temporária do código, nome de projeto, credenciais, volumes, rede e portas exclusivos. O Compose principal não foi iniciado para esta validação. Foram incluídos testes unitários de sequência, falha, seed desligada, produção e preservação dos documentos.

Resultados da validação desta tarefa: Compose válido; TypeScript e ESLint aprovados; 215 testes unitários e 65 de integração aprovados. No Compose isolado: migrations aplicadas, dois documentos fictícios criados, seed concluída, API pronta e login HTTP 200. Reexecução preservou integralmente registros/datas em nove tabelas. Seed desligada manteve migrations/client e liberou API. Produção e falha deliberada de seed terminaram init com código 1 e mantiveram API sem iniciar. O ambiente de teste foi parado sem apagar volumes; nenhuma preparação foi aplicada ao Compose principal.

## Separação obrigatória de produção

Seed e documentos fictícios exigem **simultaneamente** `NODE_ENV=development`, `VIAU_ENVIRONMENT=development`, confirmação `desenvolvimento` e conexão na lista local permitida. Valores ausentes, `test`, `demo` ou `production` são rejeitados antes de acessar o banco. `VIAU_AUTO_SEED=true` nunca contorna essas verificações. Os testes isolados fornecem explicitamente o perfil development à função, usando seu próprio PostgreSQL descartável.

O Compose e Dockerfile deste repositório são de desenvolvimento; NÃO constituem uma implantação de produção. Produção precisa de banco/instância, credenciais, volumes e rede próprios, sem montar a pasta local, o `.env` de desenvolvimento, `postgres_data` ou a rede `my-network`. Não copiar dados sintéticos para produção. A identidade de desenvolvimento deve ser impedida por firewall/regras de rede e permissões PostgreSQL de acessar produção, e vice-versa. Usar credencial de migration separada da credencial da API.

Migrations de produção continuam disponíveis por um comando separado, que nunca chama seed, documentos fictícios ou init-dev, mesmo se VIAU_AUTO_SEED estiver habilitada:

```sh
# Em um job de deploy autorizado, com DATABASE_URL de produção injetada pelo gestor de segredos:
NODE_ENV=production VIAU_ENVIRONMENT=production npm run migrate:production
```

O comando não carrega `.env` de desenvolvimento: exige DATABASE_URL no ambiente, rejeita os bancos `mobilidade_db`/`viau_test` e os hosts locais reservados ao desenvolvimento. Usa exclusivamente `prisma migrate deploy --config prisma7.config.ts`. Não foi executado contra produção nesta tarefa.

A imagem/job de migration de produção deve conter apenas Prisma, configuração e migrations; a imagem final da API deve excluir `scripts/seed*`, `scripts/init-dev.mjs`, fixtures e ferramentas de teste. Nenhum serviço de produção deve herdar o Compose de desenvolvimento. A construção dessa implantação não foi feita aqui.

Variáveis e nomes de host são verificações adicionais, não prova da identidade física do banco. Uma pessoa com acesso para substituir todas as variáveis, montar scripts e fornecer credenciais privilegiadas pode contornar controles no código. Por isso alterar apenas NODE_ENV/VIAU_ENVIRONMENT não é considerado separação suficiente: isolamento de rede, credenciais, volumes e artefatos é obrigatório e precisa ser aplicado pela infraestrutura de produção.

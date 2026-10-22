# ViaU — Backend

Backend do **ViaU**, uma plataforma de mobilidade urbana desenvolvida para conectar clientes e prestadores de serviços, começando por Cáceres — MT, com possibilidade de expansão para outras regiões do Brasil.

A API utiliza Next.js e TypeScript, PostgreSQL com suporte a recursos geoespaciais por meio do PostGIS e Prisma ORM para acesso aos dados. O ambiente de desenvolvimento utiliza Docker e Docker Compose.

## Tecnologias

- **Next.js 16** — framework para aplicação e API REST.
- **TypeScript** — tipagem estática.
- **PostgreSQL 17** — banco de dados relacional.
- **PostGIS** — extensão para recursos geoespaciais.
- **Prisma ORM 7** — acesso ao banco de dados e gerenciamento de migrations.
- **PrismaPg** — adaptador de conexão entre Prisma e PostgreSQL.
- **Docker** — ambiente de desenvolvimento isolado.
- **Docker Compose** — orquestração dos serviços locais.
- **Zod** — validação e transformação dos dados de entrada.
- **bcryptjs** — geração e verificação de hashes de senhas.
- **jose** — geração e validação de tokens JWT.
- **Twilio Verify** — gerenciamento e validação de códigos de verificação de telefone por SMS.
- **Swagger UI** — documentação interativa da API.
- **swagger-jsdoc** — geração da especificação OpenAPI a partir de anotações.

## Funcionalidades implementadas

- Cadastro de usuários.
- Validação dos dados de cadastro com Zod.
- Validação do CPF.
- Normalização do e-mail para letras minúsculas.
- Validação de telefone brasileiro no formato internacional, com `+55`, DDD e número.
- Proteção das senhas com hash usando bcrypt.
- Verificação de e-mail previamente cadastrado.
- Restrição de unicidade do e-mail no banco de dados.
- Persistência de usuários no PostgreSQL por meio do Prisma.
- Login integrado ao backend.
- Geração e validação de tokens JWT.
- Autenticação de requisições protegidas por token.
- Envio de códigos de verificação por SMS utilizando Twilio Verify.
- Validação dos códigos de verificação por meio do Twilio Verify.
- Atualização do status de telefone verificado no PostgreSQL.
- Armazenamento do status de verificação do telefone, sem persistir o código SMS no banco de dados.
- Registro do aceite dos Termos de Uso ativos durante o cadastro.
- Tratamento de erros e respostas HTTP apropriadas.
- Separação entre rotas HTTP, casos de uso e repositórios.
- Documentação interativa com Swagger para consultar e testar endpoints.

## Funcionalidades planejadas

- Bloqueio de solicitações de corridas para usuários com telefone não verificado.
- Recuperação e redefinição de senha.
- Gerenciamento de sessões, expiração e renovação de tokens, conforme a estratégia de autenticação.
- Autorização e controle de acesso por perfil.
- Gerenciamento completo de clientes e prestadores.
- Solicitação, envio de documentos e aprovação de cadastro de prestadores.
- Consultas e atualizações de usuários.
- Solicitação e gerenciamento de corridas.
- Recursos geográficos para funcionalidades de mobilidade urbana.
- Integração progressiva com o aplicativo mobile ViaU.

As funcionalidades serão implementadas gradualmente, com testes a cada etapa.

## Modelo inicial de dados

### Usuário (`Usuario`)

Representa uma pessoa cadastrada na plataforma.

Principais campos:

- `id` — identificador UUID.
- `nome` — nome do usuário.
- `cpf` — CPF do usuário.
- `email` — endereço de e-mail único.
- `telefone` — telefone obrigatório, armazenado no formato internacional E.164, incluindo o código do Brasil (`+55`).
- `telefoneVerificado` — indica se o telefone foi verificado com sucesso.
- `senhaHash` — hash da senha.
- `ativo` — indica se o usuário está ativo.
- `administrador` — indica se o usuário possui privilégios administrativos.
- `createdAt` — data de criação.
- `updatedAt` — data da última atualização.

### Prestador (`Prestador`)

Representa o registro complementar de um usuário que solicita acesso ao perfil de prestador.

Principais campos:

- `id` — identificador UUID.
- `usuarioId` — referência única ao usuário.
- `statusAprovacao` — situação da solicitação: `PENDENTE`, `APROVADO` ou `REJEITADO`.
- `dataSolicitacao` — data da solicitação.
- `createdAt` e `updatedAt` — datas de criação e atualização.

O relacionamento entre `Usuario` e `Prestador` é de um para um. O usuário pode utilizar a plataforma como cliente e solicitar um perfil de prestador, sujeito às regras de aprovação.

### Termos de Uso

Os modelos `TermoUso` e `AceiteTermoUso` permitem registrar os termos disponibilizados pela plataforma e o aceite realizado pelo usuário durante o cadastro.

## Verificação de telefone

O ViaU utiliza o Twilio Verify para gerenciar a verificação do telefone por SMS.

O fluxo funciona da seguinte forma:

1. O usuário solicita o envio do código.
2. O backend solicita o envio ao Twilio Verify.
3. O usuário informa o código recebido.
4. O backend solicita a validação ao Twilio Verify.
5. Após a aprovação, o campo `telefoneVerificado` é atualizado para `true` no PostgreSQL.

O código de verificação é gerenciado pelo Twilio Verify e não é armazenado no banco de dados da aplicação.

O telefone deve estar no formato internacional E.164. Para números brasileiros, utiliza-se `+55`, seguido do DDD e do número.

**Regra de negócio:** a intenção é permitir o acesso ao aplicativo sem verificação prévia do telefone, exigindo a verificação antes de solicitar uma corrida.

## Autenticação

A autenticação utiliza tokens JWT para identificar o usuário nas requisições protegidas.

O fluxo de login valida as credenciais e gera um token assinado. As rotas protegidas verificam esse token para identificar o usuário autenticado.

A chave utilizada para assinar os tokens é configurada por variável de ambiente. Segredos e credenciais não devem ser incluídos no repositório.

## Arquitetura

O projeto segue uma organização modular inspirada em **DDD (Domain-Driven Design)** e **Clean Architecture**, separando responsabilidades para facilitar manutenção, testes e evolução.

Estrutura conceitual do módulo de usuários e recursos compartilhados:

```text
src/
├── app/
│   └── api/
│       ├── usuarios/
│       │   └── route.ts
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts
│       │   └── codigo/
│       │       ├── enviar/
│       │       │   └── route.ts
│       │       └── verificar/
│       │           └── route.ts
│       └── openapi/
│           └── route.ts
├── docs/
│   └── swagger/
├── lib/
│   ├── prisma.ts
│   └── swagger.ts
└── modules/
    ├── auth/
    │   └── TokenService.ts
    └── usuario/
        ├── application/
        │   ├── dtos/
        │   └── use-cases/
        ├── domain/
        │   └── repositories/
        └── infrastructure/
            └── repositories/
```

A estrutura acima representa a organização dos módulos e rotas descritos; os diretórios e arquivos específicos podem evoluir conforme a implementação.

- **API Routes:** recebem requisições HTTP e retornam respostas.
- **Application:** contém casos de uso e DTOs de entrada.
- **Domain:** define contratos e conceitos centrais dos módulos.
- **Infrastructure:** implementa o acesso aos dados e integrações técnicas.
- **Lib:** centraliza recursos compartilhados, como a conexão Prisma e a configuração do Swagger.
- **Docs:** reúne as anotações usadas na documentação da API.

A estrutura será evoluída conforme surgirem novas funcionalidades, evitando abstrações desnecessárias.

## Documentação da API

A documentação interativa utiliza Swagger UI e OpenAPI.

Com o servidor de desenvolvimento em execução:

- **Swagger UI:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Especificação OpenAPI:** [http://localhost:3000/api/openapi](http://localhost:3000/api/openapi)

A documentação permite consultar os endpoints registrados, visualizar os formatos das requisições, conferir os parâmetros obrigatórios e testar as operações disponíveis.

> A documentação está acessível neste estágio de desenvolvimento. Antes da publicação em produção, devem ser avaliados o acesso à documentação e a exposição de informações sensíveis.

## Ambiente de desenvolvimento

O ambiente utiliza Docker e Docker Compose para executar os serviços necessários, incluindo PostgreSQL com PostGIS.

A aplicação Next.js utiliza variáveis de ambiente para configurar a conexão com o banco de dados, a assinatura de tokens e a integração com o Twilio Verify.

Principais variáveis de ambiente utilizadas:

- `DATABASE_URL` — conexão com o PostgreSQL.
- `JWT_SECRET` — chave secreta para assinatura e validação de tokens JWT.
- `TWILIO_ACCOUNT_SID` — identificador da conta Twilio.
- `TWILIO_AUTH_TOKEN` — credencial de autenticação da API Twilio.
- `TWILIO_VERIFY_SERVICE_SID` — identificador do serviço Twilio Verify.

Os valores reais devem permanecer em arquivos de ambiente locais ou em um gerenciador de segredos. Não devem ser publicados no GitHub.

Os comandos de instalação, migração, inicialização e testes devem corresponder aos scripts e às configurações efetivamente presentes no projeto.

## Projeto relacionado

O backend será integrado ao aplicativo mobile **ViaU**, desenvolvido com Expo, React Native e TypeScript.

A plataforma foi concebida para evoluir gradualmente, começando pela mobilidade urbana e podendo incorporar serviços como mototáxi, táxi e entregas.

## Status do projeto

**Em desenvolvimento.**

O backend já possui cadastro e login integrados, autenticação JWT, verificação de telefone por SMS com Twilio Verify, persistência de usuários com Prisma e documentação interativa com Swagger.

As próximas etapas incluem reforçar as regras de negócio, concluir o bloqueio de solicitações de corrida para telefones não verificados e ampliar a integração com o aplicativo mobile.

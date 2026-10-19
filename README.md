# ViaU — Backend

Backend do **ViaU**, uma plataforma de mobilidade urbana desenvolvida para conectar clientes e prestadores de serviços, começando por Cáceres — MT, com possibilidade de expansão para outras regiões.

A API é desenvolvida com Next.js e TypeScript, utiliza PostgreSQL com PostGIS para persistência e recursos geoespaciais, e Prisma ORM para acesso aos dados. O ambiente de desenvolvimento utiliza Docker.

## Tecnologias

- **Next.js 16** — framework para a aplicação e API REST.
- **TypeScript** — tipagem estática.
- **PostgreSQL 17** — banco de dados relacional.
- **PostGIS** — extensão para recursos geoespaciais.
- **Prisma ORM 7** — acesso ao banco de dados e gerenciamento de migrations.
- **PrismaPg** — adaptador de conexão entre Prisma e PostgreSQL.
- **Docker** — ambiente de desenvolvimento isolado.
- **Docker Compose** — orquestração dos serviços locais.
- **Zod** — validação e transformação dos dados de entrada.
- **bcryptjs** — geração de hash para proteção das senhas.
- **Swagger UI** — documentação interativa da API.
- **swagger-jsdoc** — geração da especificação OpenAPI a partir de anotações nas rotas.

## Funcionalidades implementadas

- Cadastro de usuários.
- Validação dos dados de cadastro com Zod.
- Normalização do e-mail.
- Proteção das senhas com hash usando bcrypt.
- Verificação de e-mail previamente cadastrado.
- Restrição de unicidade do e-mail no banco de dados.
- Tratamento de erros de cadastro e respostas HTTP apropriadas.
- Persistência de usuários no PostgreSQL por meio do Prisma.
- Separação entre rota HTTP, caso de uso e repositório.
- Documentação interativa com Swagger para consultar e testar endpoints.

## Funcionalidades planejadas

- Login e autenticação de usuários.
- Gerenciamento de sessões ou tokens de autenticação.
- Autorização e controle de acesso.
- Gerenciamento de perfis de clientes e prestadores.
- Solicitação e aprovação de cadastro de prestadores.
- Consultas e atualizações de usuários.
- Recursos geográficos para funcionalidades de mobilidade urbana.
- Integração com o aplicativo mobile ViaU.

As funcionalidades serão implementadas gradualmente, com testes a cada etapa.

## Modelo inicial de dados

### Usuário (`Usuario`)

Representa uma pessoa cadastrada na plataforma.

Principais campos:

- `id` — identificador UUID.
- `nome` — nome do usuário.
- `email` — endereço de e-mail único.
- `telefone` — telefone opcional.
- `senhaHash` — hash da senha.
- `ativo` — indica se o usuário está ativo.
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

O relacionamento entre `Usuario` e `Prestador` é de um para um. O registro de prestador possui status de aprovação, permitindo implementar o fluxo de análise de solicitações.

## Arquitetura

O projeto segue uma organização modular inspirada em **DDD (Domain-Driven Design)** e **Clean Architecture**, separando responsabilidades para facilitar manutenção, testes e evolução.

Estrutura do módulo de usuários:

```text
src/
├── app/
│   └── api/
│       ├── usuarios/
│       │   └── route.ts
│       └── openapi/
│           └── route.ts
├── lib/
│   ├── prisma.ts
│   └── swagger.ts
└── modules/
    └── usuario/
        ├── application/
        │   ├── dtos/
        │   └── use-cases/
        ├── domain/
        │   └── repositories/
        └── infrastructure/
            └── repositories/
```

- **API Routes:** recebem requisições HTTP e retornam respostas.
- **Application:** contém os casos de uso e os DTOs de entrada.
- **Domain:** define contratos e conceitos centrais do módulo.
- **Infrastructure:** implementa o acesso aos dados e integrações técnicas.
- **Lib:** centraliza recursos compartilhados, como a conexão Prisma e a configuração do Swagger.

A estrutura será evoluída conforme surgirem novas funcionalidades, evitando abstrações desnecessárias.

## Documentação da API

A documentação interativa utiliza Swagger UI e OpenAPI.

Com o servidor de desenvolvimento em execução, os endereços locais são:

- **Swagger UI:** `http://localhost:3000/api-docs`
- **Especificação OpenAPI:** `http://localhost:3000/api/openapi`

A documentação permite consultar os endpoints registrados, visualizar os formatos das requisições e testar as operações disponíveis.

> A documentação está pública neste estágio de desenvolvimento. Antes da publicação em produção, devem ser avaliados o acesso à documentação e a exposição de informações sensíveis.

## Ambiente de desenvolvimento

O ambiente utiliza Docker e Docker Compose para executar os serviços necessários, incluindo PostgreSQL com PostGIS.

A aplicação Next.js utiliza variáveis de ambiente para configurar a conexão com o banco de dados.

Os comandos de instalação, migração, inicialização e testes deverão corresponder aos scripts e às configurações efetivamente presentes no projeto.

## Projeto relacionado

O backend será integrado ao aplicativo mobile **ViaU**, desenvolvido com Expo, React Native e TypeScript.

## Status do projeto

**Em desenvolvimento.**

A base do banco de dados, o módulo inicial de usuários, o cadastro e a documentação interativa já foram implementados. As próximas etapas incluem autenticação, autorização, gerenciamento de prestadores e integração com o aplicativo mobile.

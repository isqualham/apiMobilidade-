# ViaU — Backend

Backend do **ViaU**, uma plataforma de mobilidade urbana desenvolvida para conectar clientes e prestadores de serviços, começando por Cáceres — MT, com possibilidade de expansão para outras regiões.

O projeto utiliza Next.js para desenvolver a API, PostgreSQL para persistência dos dados e PostGIS para recursos geoespaciais. O ambiente de desenvolvimento será executado com Docker.

## Tecnologias

- **Next.js** — framework para a aplicação e API REST.
- **TypeScript** — tipagem estática e segurança no desenvolvimento.
- **PostgreSQL** — banco de dados relacional.
- **PostGIS** — extensão para consultas e operações geográficas.
- **Prisma ORM** — acesso ao banco de dados e gerenciamento de migrations.
- **Docker** — ambiente de desenvolvimento isolado e reproduzível.
- **Docker Compose** — orquestração dos serviços do ambiente local.

## Funcionalidades planejadas

- Cadastro e consulta de usuários.
- Gerenciamento de perfis de clientes e prestadores.
- Solicitação e aprovação de cadastro de prestadores.
- Autenticação e autorização de usuários.
- Integração com o aplicativo mobile ViaU.
- Recursos geográficos para funcionalidades de mobilidade urbana.

As funcionalidades serão desenvolvidas gradualmente, com testes a cada etapa.

## Modelo inicial de dados

O modelo inicial prevê duas entidades principais:

- **Usuário:** representa toda pessoa cadastrada na plataforma. Todo usuário começa com acesso ao perfil de cliente.
- **Prestador:** registro complementar vinculado a um usuário que solicita acesso ao perfil de prestador, sujeito às regras de aprovação da plataforma.

## Arquitetura

O projeto será organizado de forma modular, buscando separar as regras de negócio, o acesso aos dados e os mecanismos de comunicação da API.

A arquitetura será evoluída incrementalmente, aplicando princípios de Clean Architecture quando forem úteis à manutenção, aos testes e à evolução do produto.

## Ambiente de desenvolvimento

O ambiente local será configurado com Docker e Docker Compose, incluindo os serviços necessários para executar a aplicação e o banco de dados PostgreSQL com PostGIS.

As instruções de instalação, configuração das variáveis de ambiente e execução serão documentadas conforme a implementação do projeto.

## Status

**Em desenvolvimento.**

O desenvolvimento começará pelo cadastro e pela consulta de usuários, evoluindo gradualmente para as demais funcionalidades do ViaU.

## Projeto relacionado

O backend será integrado ao aplicativo mobile ViaU, desenvolvido com Expo, React Native e TypeScript.

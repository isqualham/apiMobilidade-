# Integração OSRM no backend ViaU

## Configuração

O endereço é lido exclusivamente de `OSRM_BASE_URL`. Não há URL padrão no código.
Sem configuração, a solicitação retorna 503 sem criar corrida. Exemplo versionado:
[`osrm.env.example`](./osrm.env.example).

```dotenv
VIAU_ENVIRONMENT=development
OSRM_BASE_URL=https://router.project-osrm.org
OSRM_PROVIDER_KIND=public-demo
OSRM_TIMEOUT_MS=5000
OSRM_MIN_INTERVAL_MS=1000
OSRM_PROFILE=driving
OSRM_USER_AGENT=ViaU/1.0
```

Para uma demonstração controlada com `next build` / `next start`, use
`VIAU_ENVIRONMENT=demo`. `NODE_ENV=production` descreve a execução otimizada do
Next.js; `VIAU_ENVIRONMENT=production` descreve operação comercial. Configuração
`development` com servidor público é rejeitada em `NODE_ENV=production`, para
evitar reutilizar acidentalmente o arquivo local no deploy.

Se omitido, `VIAU_ENVIRONMENT` é `development` somente quando
`NODE_ENV=development`; nos demais casos é `production`. Valores desconhecidos
falham com 503. Não defina `demo` em uma operação comercial.

| Variável | Regra |
| --- | --- |
| `OSRM_BASE_URL` | Base HTTP(S), incluindo eventual prefixo; sem credenciais, query ou fragmento. HTTP somente para `self-hosted`. |
| `OSRM_PROVIDER_KIND` | Obrigatória: `public-demo`, `self-hosted` ou `authorized`. |
| `OSRM_TIMEOUT_MS` | 100 a 30000 ms; padrão 5000. Inclui recebimento do corpo. |
| `OSRM_MIN_INTERVAL_MS` | 0 a 60000 ms; padrão 1000. Público exige pelo menos 1000. |
| `OSRM_PROFILE` | Padrão `driving`; deve corresponder ao perfil preparado no servidor. |
| `OSRM_USER_AGENT` | Identificação real do aplicativo; padrão `ViaU/1.0`. Pode incluir contato do operador. |

O domínio público e seu alias `routing.openstreetmap.de` são reconhecidos somente
para aplicar restrições. Declarar esses hosts como `authorized` ou `self-hosted`
não libera seu uso comercial. Redirecionamentos HTTP não são seguidos.

## Condições para desenvolvimento e demonstração pública

A [página oficial do servidor](https://github.com/Project-OSRM/osrm-backend/wiki/Demo-server)
restringe o uso a casos razoáveis e não comerciais, com máximo de uma requisição
por segundo e sem garantias de disponibilidade. Consulte também as
[condições atuais do operador](https://www.fossgis.de/arbeitsgruppen/osm-server/nutzungsbedingungen/)
e a [política de uso](https://github.com/Project-OSRM/osrm-backend/wiki/Api-usage-policy).
O modo `demo` é uma restrição técnica; não concede autorização para usos que os
termos do operador não permitam.

O adaptador identifica ViaU, não repete chamadas automaticamente, permite apenas
uma chamada em voo por serviço e aguarda no mínimo um segundo entre chamadas
públicas. Novas solicitações durante esse período recebem 429 sem consulta externa.
HTTP 429/503 externo gera pausa de acordo com `Retry-After` (segundos ou data);
sem um valor válido, pausa de 60 segundos. Não há fallback de distância.

**O limitador é compartilhado dentro de um processo, não entre réplicas.**
O modo público deve ser utilizado somente com UMA instância persistente do backend,
sem cluster, autoscaling ou funções serverless. Antes de ampliar, use instância
própria/provedor autorizado ou implemente controle distribuído. O aplicativo deve
parar de consultar diretamente o mesmo servidor público durante a demonstração:
as chamadas dele não são controladas pelo backend. Considere também outros
consumidores no mesmo IP e evite testes de carga contra o servidor público.

A interface do aplicativo deve exibir atribuição aos dados OpenStreetMap/ODbL e
ao roteamento OSRM. Este backend não altera a interface móvel. As coordenadas são
enviadas ao provedor configurado; não são registrados URLs/erros externos contendo
o trajeto nos logs do adaptador.

## Distância e preço

`POST /api/corrida` aceita origem, destino e categoria. Campos de distância ou
preço fornecidos pelo cliente continuam rejeitados. O adaptador solicita
`route/v1/{profile}/{longitude},{latitude};{longitude},{latitude}`, sem geometria,
instruções ou alternativas. Valida código `Ok`, lista de rotas, distância positiva
finita e duração não negativa. Limita a resposta a 64 KiB e arredonda metros
fracionários ao metro mais próximo para persistência em `Decimal(10,3)` km.

O caso de uso aplica a tarifa cadastrada com `Prisma.Decimal`, tarifa mínima,
partida e limite monetário. A chamada HTTP ocorre antes da transação de criação.
A proteção `Serializable` contra corridas simultâneas permanece inalterada.

O perfil configurado é único para esta instância do backend. O serviço público
`driving` não oferece validação de regras específicas para motocicletas ou outras
categorias. As demonstrações devem usar categorias compatíveis com esse perfil;
perfis por categoria exigirão extensão da configuração/adaptador.

| HTTP ViaU | Condição |
| --- | --- |
| 422 | `NoRoute`, `NoSegment` ou distância que arredonda para zero. |
| 429 | Limitação local de chamadas, incluindo pausa após `Retry-After`. |
| 502 | Resposta inválida, JSON inválido, corpo excessivo ou outro erro HTTP do provedor. |
| 503 | Configuração ausente/inválida, uso não autorizado pelo ambiente, rede indisponível ou 429/503 externo. |
| 504 | Timeout da consulta, incluindo leitura do corpo. |

Não cria corrida nem inventa preço quando a consulta falha. Não recalcula nem
saneia automaticamente corridas antigas cuja distância veio do cliente.

## Trocar provedor sem alterar código

Para um servidor **compatível com OSRM Route v1**, altere as variáveis e reinicie
o processo/reimplante:

```dotenv
VIAU_ENVIRONMENT=production
OSRM_PROVIDER_KIND=self-hosted
OSRM_BASE_URL=http://osrm-interno:5000
OSRM_PROFILE=driving
OSRM_TIMEOUT_MS=5000
OSRM_MIN_INTERVAL_MS=1000
```

Para serviço autorizado use `OSRM_PROVIDER_KIND=authorized` e a base HTTPS
fornecida pelo operador. A declaração pressupõe autorização efetiva; o código
não comprova contratos. Provedores que exijam autenticação podem ser expostos por
um gateway privado autorizado com a mesma API; o adaptador atual não envia API keys.

Troca para API incompatível (por exemplo, formato proprietário) não é resolvida
somente trocando a URL: exige um gateway compatível ou outro adaptador de
`RotasService`. DTO, repositório, cálculo monetário e schema permanecem separados
do protocolo externo.

## Testes

`npm test` testa configuração, protocolo, validação, timeout, erros, bloqueio de
produção, frequência e integração do adaptador ao cálculo. Todas as chamadas HTTP
nessa suíte são simuladas: ela não consome o servidor público.

`npm run test:integration`, com `TEST_DATABASE_URL` apontando para PostgreSQL de
testes, mantém a suíte real de concorrência. Para uma verificação manual externa,
faça uma única solicitação autenticada com dados de teste, sem distância no corpo,
respeitando os limites; uma resposta de sucesso cria uma corrida no banco utilizado.

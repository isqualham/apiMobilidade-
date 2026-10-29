# Sessão única: bloquear novo login

A política atual preserva a primeira sessão válida. Novo login com credenciais corretas
retorna HTTP 409, Cache-Control: no-store, sem tokens:
```json
{"codigo":"SESSAO_ATIVA_EXISTENTE","erro":"Esta conta já está conectada em outro dispositivo. Saia do dispositivo atual para entrar aqui."}
```

A conta é identificada por usuario_id, independentemente de e-mail ou telefone. Não há
identificação confiável de dispositivo: repetir login no mesmo dispositivo também é
bloqueado. Reabrir o App deve reutilizar a sessão/refresh. O App deve mostrar a mensagem
de 409 sem apagar a sessão atual nem tentar login ou refresh em loop.

O lock da conta serializa logins. Dentro da transação, somente sessões expiradas e ainda
não revogadas são revogadas com motivo EXPIRADA. Uma sessão com expiraEm > agora e
revogadaEm nulo causa conflito e rollback completo. O índice parcial existente continua
garantindo unicidade. Não é necessária alteração de schema, SQL ou migration.

O UPDATE condicional de sessões expiradas reavalia o predicado após esperar um refresh
concorrente no PostgreSQL. Renovação válida estende a sessão; não é invalidada por uma
decisão de expiração tomada antes do lock. Refresh de sessão revogada não a reativa.
A validade relevante é a sessão (sete dias renováveis), não o JWT de uma hora.

Login bloqueado não cria sessão, não retorna tokens, não altera corridas nem disponibilidade.
Logout atual mantém seu comportamento de revogar sessão e deixar prestador Offline,
preservando corridas. Após logout, novo login é permitido. Sessões revogadas por razões
anteriores (inclusive OUTRO_LOGIN) continuam inválidas; a mensagem antiga permanece
compatível para esses registros históricos.

Sem acesso ao dispositivo anterior, é necessário aguardar expiração ou definir futuramente
um fluxo autorizado de recuperação. Esta tarefa não adiciona encerramento forçado.

Testes PostgreSQL foram ajustados, mas não executados: o harness aplica migrations.
A política depende de implantar o código atualizado em todas as instâncias; a migration
de unicidade já existente não determina sozinha se o segundo login substitui ou é bloqueado.

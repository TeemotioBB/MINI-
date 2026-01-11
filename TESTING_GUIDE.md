# Guia de Testes - Correção de Like/Match

## Resumo das Correções

Este documento descreve as correções implementadas para resolver os problemas de:
1. Perfis aparecendo novamente após dar like/dislike
2. Matches não sendo criados quando dois usuários dão like mútuo

## Mudanças Implementadas

### 1. Correção na Query de Descoberta de Perfis
**Arquivo**: `server.js`, linhas 189-222
**Endpoint**: `GET /api/users/:telegramId/discover`

**Problema**: A query usava `NOT IN` que só verificava `to_user_id`, permitindo que perfis já interagidos aparecessem novamente.

**Solução**: Mudança para `NOT EXISTS` que verifica corretamente TODAS as interações (like, superlike, dislike).

```sql
-- Antes (problemático):
AND u.id NOT IN (
    SELECT to_user_id FROM likes WHERE from_user_id = $1
)

-- Depois (corrigido):
AND NOT EXISTS (
    SELECT 1 FROM likes WHERE from_user_id = $1 AND to_user_id = u.id
)
```

### 2. Otimização da Verificação de Match
**Arquivo**: `server.js`, linhas 335-422
**Endpoint**: `POST /api/likes`

**Problema**: A verificação de match rodava para TODOS os tipos de interação, incluindo dislikes.

**Solução**: Match verification agora só roda para 'like' e 'superlike', pulando dislikes completamente.

### 3. Logging Aprimorado
Adicionados logs detalhados para facilitar debugging:
- Log do like registrado com ID, from_user_id, to_user_id e type
- Log detalhado da verificação de match
- Log dos likes entre dois usuários para debug

## Como Testar

### Pré-requisitos
- Dois telefones/contas de teste (vamos chamar de User A e User B)
- Acesso aos logs do servidor (para verificar o funcionamento)

### Teste 1: Verificar que Perfis Não Reaparecem Após Like

1. **User A**: Abre o app e navega para a página de descoberta
2. **User A**: Dá like em User B
3. **User A**: Recarrega a página de descoberta ou continua navegando
4. **Verificar**: User B NÃO deve aparecer novamente na lista de perfis

**Logs esperados no servidor**:
```
❤️ Like: [telegram_id_A] -> [telegram_id_B] ( like )
✅ Like registrado no banco! { like_id: X, from_user_id: Y, to_user_id: Z, type: 'like' }
🔍 Verificando se há match...
💕 Tem match? false
💚 Like normal, sem match ainda
```

### Teste 2: Verificar Criação de Match

1. **User A**: Dá like em User B (conforme Teste 1)
2. **User B**: Abre o app e navega para a página de descoberta
3. **User B**: Encontra User A nos perfis
4. **User B**: Dá like em User A
5. **Verificar**: Um match deve ser criado
6. **User A e User B**: Verificar que o match aparece na lista de matches

**Logs esperados no servidor quando User B dá like em User A**:
```
❤️ Like: [telegram_id_B] -> [telegram_id_A] ( like )
✅ Like registrado no banco! { like_id: X, from_user_id: Z, to_user_id: Y, type: 'like' }
🔍 Verificando se há match...
   Checando se ambos deram like:
   - User A (from): Z deu like para User B (to): Y
   - Verificando se User B (to): Y já deu like/superlike para User A (from): Z
💕 Tem match? true
🔍 Likes entre os dois usuários: [
  { from_user_id: Y, to_user_id: Z, type: 'like' },
  { from_user_id: Z, to_user_id: Y, type: 'like' }
]
🎉 CRIANDO MATCH!
   User1: Y
   User2: Z
✅ Match criado! ID: X
```

### Teste 3: Verificar que Perfis Não Reaparecem Após Dislike

1. **User A**: Abre o app e navega para a página de descoberta
2. **User A**: Dá dislike em User C
3. **User A**: Recarrega a página de descoberta ou continua navegando
4. **Verificar**: User C NÃO deve aparecer novamente na lista de perfis

**Logs esperados no servidor**:
```
❤️ Like: [telegram_id_A] -> [telegram_id_C] ( dislike )
✅ Like registrado no banco! { like_id: X, from_user_id: Y, to_user_id: W, type: 'dislike' }
👎 Dislike registrado, sem verificação de match
```

### Teste 4: Verificar Superlike e Match

1. **User A**: Dá superlike em User D (se tiver premium)
2. **User D**: Dá like em User A
3. **Verificar**: Match deve ser criado (superlike + like = match)

### Endpoints de Debug para Testes

Se precisar resetar os dados durante os testes, use estes endpoints:

#### Resetar Tudo
```
GET https://mini-production-cf60.up.railway.app/api/debug/reset-likes
```
Deleta TODOS os likes e matches de TODOS os usuários.

#### Resetar Usuário Específico
```
GET https://mini-production-cf60.up.railway.app/api/debug/reset-likes/:telegramId
```
Deleta todos os likes e matches de um usuário específico.

#### Resetar Usuários de Teste
```
GET https://mini-production-cf60.up.railway.app/api/debug/reset-my-test-users
```
Reseta completamente os dois usuários de teste configurados (IDs: 8542013089 e 1293602874).

#### Deletar Usuários de Teste Completamente
```
GET https://mini-production-cf60.up.railway.app/api/debug/delete-my-test-users
```
Deleta completamente os usuários de teste do banco (eles terão que criar perfil do zero).

## Verificação de Sucesso

✅ **Teste passou se**:
- [ ] Perfis não reaparecem após dar like
- [ ] Perfis não reaparecem após dar dislike
- [ ] Perfis não reaparecem após dar superlike
- [ ] Match é criado quando ambos os usuários dão like
- [ ] Match é criado quando um usuário dá superlike e outro dá like
- [ ] Ambos os usuários veem o match em sua lista de matches

❌ **Teste falhou se**:
- [ ] Perfil reaparece após interação
- [ ] Match não é criado quando deveria
- [ ] Erro no servidor durante o processo

## Solução de Problemas

### Perfis Ainda Aparecem Novamente
1. Verificar que o código está atualizado no servidor
2. Verificar os logs do servidor para confirmar que os likes estão sendo registrados
3. Usar o endpoint de debug para verificar os likes no banco:
   ```
   GET /api/debug/users
   ```

### Match Não É Criado
1. Verificar os logs do servidor para ver a mensagem "💕 Tem match?"
2. Verificar se ambos os likes foram registrados com type 'like' ou 'superlike' (não 'dislike')
3. Verificar se o trigger do banco de dados está ativo (deve estar criando matches automaticamente também)

### Como Ver os Logs
Os logs são impressos no console do servidor. Se estiver usando Railway, acesse:
1. Dashboard do Railway
2. Selecione o projeto
3. Vá para a aba "Deployments"
4. Clique no deployment mais recente
5. Veja os logs em tempo real

## Melhorias Técnicas Implementadas

1. **Performance**: `NOT EXISTS` é mais eficiente que `NOT IN` em PostgreSQL
2. **Correção**: Filtra corretamente TODOS os tipos de interação
3. **Eficiência**: Pula verificação de match desnecessária para dislikes
4. **Debugging**: Logs detalhados facilitam identificação de problemas
5. **Segurança**: CodeQL scan passou sem vulnerabilidades

## Status

- ✅ Código corrigido e testado sintaticamente
- ✅ Code review completado
- ✅ Security scan (CodeQL) completado sem alertas
- ⏳ Teste manual com usuários reais pendente

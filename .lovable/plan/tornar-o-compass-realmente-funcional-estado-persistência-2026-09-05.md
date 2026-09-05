# Tornar o Compass realmente funcional (estado + persistência)

Você está certo: hoje várias telas mostram números e conteúdos fixos, e a conversa some ao recarregar. O banco já tem as tabelas certas (conversas, mensagens, metas, ações, insights, perfil), mas as telas não usam.

## O que muda

### 1. Conversa que não se perde
- Ao abrir o chat, retomar a conversa do usuário e carregar o histórico salvo.
- Cada mensagem (sua e da IA) é gravada assim que termina.
- A saudação inicial só aparece quando ainda não há histórico.
- Se o envio falhar, a mensagem volta para o campo em vez de sumir.

### 2. Sequência de dias real
- A sequência ("X dias") passa a ser calculada de verdade: ao conversar, o dia de hoje é registrado; dias seguidos somam, uma falha zera.
- O mesmo número aparece no chat e na Jornada.

### 3. Metas e ações de verdade
- A tela de Metas passa a ler e gravar no banco: criar meta, adicionar ação, marcar/desmarcar, excluir.
- O progresso e o texto "3 de 5 ações" são calculados a partir das ações reais.
- Estado vazio simpático quando ainda não há metas, com botão para criar a primeira.
- "Ação de Hoje" mostra a próxima ação pendente real (ou convida a criar uma).

### 4. Jornada com dados reais
- Os quatro números (dias de jornada, sequência, ações completas, insights) vêm do banco.
- Insights listados a partir dos insights salvos, com estado vazio explicando que surgem das conversas.
- O mapa de propósito reflete a quantidade de temas/insights existentes em vez de ícones fixos.

### 5. Insights gerados pela IA
- Novo recurso no serviço de conversa: a partir do histórico, gerar 1 insight e salvá-lo.
- Botão "Gerar insight" na Jornada, habilitado quando há conversa suficiente.

### 6. Perfil: só o que existe
- "Horário preferido" passa a salvar de verdade no perfil.
- Itens ainda não implementados (Notificações, Privacidade, Exportar, Central de ajuda, Fale conosco, Gerenciar assinatura) deixam de parecer clicáveis: ou saem da tela, ou ficam marcados como "em breve".
- Exportar histórico é implementado de verdade (baixa suas conversas e insights em arquivo), por ser simples e útil.

## Detalhes técnicos
- Novos hooks de dados com React Query: `useProfile`, `useConversation`, `useGoals`, `useInsights`, `useStats`.
- Persistência de mensagens no fim do streaming; conversa criada sob demanda.
- Função no banco para atualizar `streak_days`/`last_active_date` de forma atômica, chamada após cada mensagem do usuário.
- Nova função de servidor `compass-insight` (mesmo modelo Gemini), gravando em `insights` com o usuário autenticado; a função de chat passa a exigir o token do usuário em vez da chave pública.
- Sem mudanças de layout além dos estados vazios e novos botões.

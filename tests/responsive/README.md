# Testes visuais e de responsividade

Verifica que as telas autenticadas (Conversa, Metas, Perfil) não têm overflow
horizontal em telas estreitas e gera screenshots para revisão visual.

```bash
npm run test:responsive              # 360px (padrão)
python3 tests/responsive/check_overflow.py --width 320
python3 tests/responsive/check_overflow.py --width 414
```

O que é checado por tela:
- `document.scrollWidth <= clientWidth` (sem barra horizontal)
- nenhum elemento visível ultrapassando as bordas do viewport
- no chat, uma mensagem longa com URL gigante é enviada para testar quebra de texto

Screenshots ficam em `tests/responsive/screenshots/`.

O login é simulado escrevendo uma sessão sintética no `localStorage`, então as
chamadas de dados falham de propósito: o teste avalia layout, não dados.

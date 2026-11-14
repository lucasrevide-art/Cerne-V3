# Meu Workspace

Gestor pessoal de projetos, tarefas, notas, calendário e clientes. Web app simples, sem dependências (Node 22+ com SQLite embutido).

## Rodar

```bash
npm start        # http://localhost:3000
```

Variáveis: `PORT` (padrão 3000) e `DB` (caminho do arquivo SQLite, padrão `data.db`).

## Recursos

- **Início**: resumo, atalhos, próximos eventos, atrasos e notas fixadas
- **Projetos**: cliente, status, prazo, tarefas e notas de cada um
- **Tarefas**: quadro kanban (arrastar) ou lista, com filtros
- **Notas**: editor com salvamento automático, vínculo com projeto/cliente, fixar
- **Calendário**: mês com tarefas, prazos de projetos e eventos
- **Prazos**, **Clientes** e **Busca** global
- **Personalizar**: nome, cor e tema claro/escuro

Próximos passos: acesso de clientes (login/somente leitura), etiquetas, tarefas recorrentes.

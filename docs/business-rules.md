# Regras de negócio

Documento de regras de negócio. Distingue regras **já implementadas** de regras
**transversais obrigatórias** a seguir nas próximas fases.

## Implementado

- **Sessão (mock):** sessão tem tempo de expiração (8h); sessão expirada é
  descartada ao restaurar. Contas e credenciais são sintéticas (ver ADR 0002).
- **Autorização por papel (UX):** rotas internas exigem sessão; rotas da equipe
  docente e da área do aluno são separadas por papel.
- **Rota inicial por papel:** administrador/professor → `/dashboard`; aluno →
  `/aluno/inicio`.
- **Importação de alunos:** mapeamento de colunas, com criação automática de
  turmas conforme implementado em `alunos/`.
- **Instituição e período letivo (RF-002):** dados básicos da instituição e fuso
  horário; períodos com nome, datas e status. Um **único período ativo**
  (ativar outro encerra o anterior). Datas inválidas e **sobreposição** entre
  períodos são bloqueadas. Etapas (bimestre/trimestre/semestre/etapa) devem
  ficar dentro do período e não se sobrepor. Períodos `ativo`/`encerrado` não
  podem ser excluídos — preservação de histórico. Alterações críticas geram
  **auditoria** (ator, ação, entidade, referência, timestamp).

## Transversais (obrigatórias nas próximas fases)

1. **Separação de conceitos:** nota acadêmica, frequência, XP, nível, moedas,
   ponto de equipe, ponto extra, conquista e recompensa são distintos. Nunca
   reutilizar o mesmo campo/serviço para conceitos diferentes.
2. **Contexto obrigatório:** operações acadêmicas incluem turma, período e (quando
   aplicável) disciplina; validar no backend.
3. **Histórico:** mudanças de turma, professor, matrícula, nota e frequência não
   apagam o passado (arquivamento/vigência).
4. **Datas e fusos:** timestamps de auditoria em UTC; datas de aula como datas
   locais, sem deslocamento inesperado.
5. **Cálculos centralizados:** médias, frequência, níveis e elegibilidade em
   funções/serviços testáveis; relatórios mostram a fórmula usada.
6. **Regras configuráveis:** média mínima, frequência mínima, escala de nota,
   fórmula de média, arredondamento, faltas justificadas, curva de níveis e
   visibilidade de ranking **não** são números mágicos.
7. **XP não altera notas.** Gamificação não cria/altera registro acadêmico.
8. **Moedas:** saldo interno, histórico auditável, sem saldo negativo sem regra
   explícita.
9. **Privacidade por padrão:** dados individuais e observações privadas não
   aparecem em ranking/projeção/mural/exportação coletiva sem permissão.
10. **Consistência transacional:** resgates/debêntos de moedas e lançamentos
    críticos devem ser atômicos no backend.
11. **Exclusão:** preferir arquivamento/inativação; exclusão definitiva é
    excepcional, autorizada e auditada.

## Pendências de decisão (spec §19)

Backend definitivo, provedor de autenticação, fórmula de média e escala,
tratamento de faltas justificadas, política de edição após fechamento de
período, política de ranking, regras de XP/moedas e tipos de recompensa. Adotar
provisoriamente a alternativa mais segura e reversível, registrando em ADR.

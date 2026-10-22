import {
  descreverAcaoAuditoria,
  formatarDataHoraAuditoria,
  rotuloEntidadeAuditoria,
} from './auditoria.model';

describe('auditoria.model', () => {
  describe('descreverAcaoAuditoria', () => {
    it('descreve códigos de ação conhecidos', () => {
      const descricao = descreverAcaoAuditoria('periodo.ativado');

      expect(descricao.rotulo).toBe('Período ativado');
      expect(descricao.classe).toBe('badge-success');
      expect(descricao.icone).toBe('play_arrow');
    });

    it('mantém visíveis códigos ainda não mapeados', () => {
      const descricao = descreverAcaoAuditoria('turma.zerada');

      expect(descricao.codigo).toBe('turma.zerada');
      expect(descricao.rotulo).toBe('turma.zerada');
      expect(descricao.classe).toBe('badge-neutral');
    });

    it('descreve ações de importação e do mural', () => {
      expect(descreverAcaoAuditoria('aluno.importado').rotulo).toBe('Alunos importados');
      expect(descreverAcaoAuditoria('publicacao.criada').rotulo).toBe('Publicação criada');
    });
  });

  describe('rotuloEntidadeAuditoria', () => {
    it('traduz entidades conhecidas', () => {
      expect(rotuloEntidadeAuditoria('PeriodoLetivo')).toBe('Período letivo');
      expect(rotuloEntidadeAuditoria('Avaliacao')).toBe('Avaliação');
    });

    it('mantém entidades desconhecidas como estão', () => {
      expect(rotuloEntidadeAuditoria('Turma')).toBe('Turma');
    });
  });

  describe('formatarDataHoraAuditoria', () => {
    it('formata data ISO válida no padrão brasileiro', () => {
      expect(formatarDataHoraAuditoria('2026-03-10T15:00:00.000Z')).toContain('10/03/2026');
    });

    it('devolve o valor original quando a data é inválida', () => {
      expect(formatarDataHoraAuditoria('data-invalida')).toBe('data-invalida');
    });
  });
});

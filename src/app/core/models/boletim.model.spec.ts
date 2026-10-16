import { calcularSituacao, classeSituacao, rotuloSituacao } from './boletim.model';

describe('boletim.model', () => {
  it('marca sem dados quando não há média nem frequência', () => {
    const resultado = calcularSituacao(null, null, 6, 75);
    expect(resultado.situacao).toBe('sem_dados');
    expect(resultado.motivo).toContain('Sem notas');
  });

  it('reprova por frequência abaixo do mínimo mesmo com média alta', () => {
    const resultado = calcularSituacao(9, 50, 6, 75);
    expect(resultado.situacao).toBe('reprovado');
    expect(resultado.motivo).toContain('Frequência');
  });

  it('coloca em recuperação quando a média fica abaixo da mínima', () => {
    const resultado = calcularSituacao(4, 90, 6, 75);
    expect(resultado.situacao).toBe('recuperacao');
    expect(resultado.motivo).toContain('Média');
  });

  it('aprova quando média e frequência atingem os mínimos', () => {
    const resultado = calcularSituacao(7, 75, 6, 75);
    expect(resultado.situacao).toBe('aprovado');
    expect(resultado.motivo).toBeNull();
  });

  it('traduz o rótulo e a classe de cada situação', () => {
    expect(rotuloSituacao('aprovado')).toBe('Aprovado');
    expect(classeSituacao('reprovado')).toBe('badge-danger');
    expect(rotuloSituacao('sem_dados')).toBe('Sem dados');
    expect(classeSituacao('recuperacao')).toBe('badge-warning');
  });
});

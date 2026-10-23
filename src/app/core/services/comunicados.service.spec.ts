import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosComunicado } from '../models/comunicado.model';
import { Usuario } from '../models/usuario.model';
import { ComunicadosService } from './comunicados.service';

const autor: Usuario = {
  id: 'user-prof-1',
  nome: 'Bruno Professor',
  email: 'bruno@turmalina.com',
  papel: 'professor',
  ativo: true,
  institutionId: 'instituicao-padrao',
  precisaTrocarSenha: false,
};

function dados(sobrescrever: Partial<DadosComunicado> = {}): DadosComunicado {
  return {
    tipo: 'recado',
    alunoId: 'aluno-1',
    titulo: 'Parabéns',
    conteudo: 'Ótimo desempenho na última avaliação.',
    ...sobrescrever,
  };
}

describe('ComunicadosService', () => {
  let service: ComunicadosService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.comunicados');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(ComunicadosService);
  });

  it('cria um recado vinculado ao autor', async () => {
    const comunicado = await service.criar(dados(), autor);
    expect(comunicado.tipo).toBe('recado');
    expect(comunicado.autorNome).toBe('Bruno Professor');
    expect(service.porAluno('aluno-1').length).toBe(1);
  });

  it('exige aluno, título e conteúdo', async () => {
    await expectAsync(service.criar(dados({ alunoId: '' }), autor)).toBeRejected();
    await expectAsync(service.criar(dados({ titulo: '' }), autor)).toBeRejected();
    await expectAsync(service.criar(dados({ conteudo: '  ' }), autor)).toBeRejected();
  });

  it('oculta observações privadas dos recados visíveis ao aluno', async () => {
    await service.criar(dados({ tipo: 'recado' }), autor);
    await service.criar(dados({ tipo: 'observacao', titulo: 'Anotação interna' }), autor);

    const recados = service.recadosDoAluno('aluno-1');
    expect(recados.length).toBe(1);
    expect(recados[0].tipo).toBe('recado');
  });

  it('remove um comunicado', async () => {
    const comunicado = await service.criar(dados(), autor);
    await service.remover(comunicado.id);
    expect(service.porAluno('aluno-1').length).toBe(0);
  });
});

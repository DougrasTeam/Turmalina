import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosPublicacao } from '../models/publicacao.model';
import { Usuario } from '../models/usuario.model';
import { PublicacoesService } from './publicacoes.service';

const autor: Usuario = {
  id: 'user-prof-1',
  nome: 'Bruno Professor',
  email: 'bruno@turmalina.com',
  papel: 'professor',
  ativo: true,
  precisaTrocarSenha: false,
};

function dados(sobrescrever: Partial<DadosPublicacao> = {}): DadosPublicacao {
  return {
    titulo: 'Feira de ciências',
    conteudo: 'A feira ocorrerá na próxima semana.',
    turmaId: 'turma-1',
    publicadaEm: '2026-03-01T10:00:00.000Z',
    expiraEm: null,
    ...sobrescrever,
  };
}

describe('PublicacoesService', () => {
  let service: PublicacoesService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.publicacoes');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(PublicacoesService);
  });

  it('cria uma publicação vinculada ao autor', async () => {
    const publicacao = await service.criar(dados(), autor);
    expect(publicacao.status).toBe('publicada');
    expect(publicacao.autorId).toBe('user-prof-1');
    expect(publicacao.autorNome).toBe('Bruno Professor');
    expect(service.total()).toBe(1);
  });

  it('recusa publicação sem título ou conteúdo', async () => {
    await expectAsync(service.criar(dados({ titulo: '   ' }), autor)).toBeRejected();
    await expectAsync(service.criar(dados({ conteudo: '' }), autor)).toBeRejected();
  });

  it('recusa expiração anterior à publicação', async () => {
    await expectAsync(
      service.criar(
        dados({ publicadaEm: '2026-03-10T10:00:00.000Z', expiraEm: '2026-03-01' }),
        autor,
      ),
    ).toBeRejected();
  });

  it('arquiva e republica mantendo a autoria', async () => {
    const publicacao = await service.criar(dados(), autor);
    await service.arquivar(publicacao.id);
    expect(service.publicacoes().find((item) => item.id === publicacao.id)?.status).toBe(
      'arquivada',
    );
    await service.restaurar(publicacao.id);
    expect(service.publicacoes().find((item) => item.id === publicacao.id)?.status).toBe(
      'publicada',
    );
  });

  it('retorna apenas publicações vigentes da turma, incluindo as institucionais', async () => {
    const daTurma = await service.criar(dados({ turmaId: 'turma-1' }), autor);
    const institucional = await service.criar(
      dados({ turmaId: null, titulo: 'Aviso geral' }),
      autor,
    );
    await service.criar(dados({ turmaId: 'turma-2', titulo: 'Outra turma' }), autor);
    const expirada = await service.criar(
      dados({
        turmaId: 'turma-1',
        titulo: 'Antiga',
        publicadaEm: '2019-12-01T10:00:00.000Z',
        expiraEm: '2020-01-01',
      }),
      autor,
    );

    const vigentes = service.vigentesParaTurma('turma-1');
    const ids = vigentes.map((item) => item.id);

    expect(ids).toContain(daTurma.id);
    expect(ids).toContain(institucional.id);
    expect(ids).not.toContain(expirada.id);
    expect(vigentes.length).toBe(2);
  });

  it('remove uma publicação', async () => {
    const publicacao = await service.criar(dados(), autor);
    await service.remover(publicacao.id);
    expect(service.total()).toBe(0);
  });
});

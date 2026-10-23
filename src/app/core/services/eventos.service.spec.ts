import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthRepository } from '../auth/data-access/auth.repository';
import { MockAuthRepository } from '../auth/data-access/mock-auth.repository';
import { DadosEvento } from '../models/evento.model';
import { Usuario } from '../models/usuario.model';
import { EventosService } from './eventos.service';

const autor: Usuario = {
  id: 'user-prof-1',
  nome: 'Ana Professora',
  email: 'ana@turmalina.com',
  papel: 'professor',
  ativo: true,
  institutionId: 'instituicao-padrao',
  precisaTrocarSenha: false,
};

function dados(sobrescrever: Partial<DadosEvento> = {}): DadosEvento {
  return {
    titulo: 'Prova de matemática',
    descricao: 'Conteúdo dos capítulos 1 a 3.',
    tipo: 'avaliacao',
    inicioEm: '2026-03-10T13:00:00.000Z',
    turmaId: 'turma-1',
    ...sobrescrever,
  };
}

describe('EventosService', () => {
  let service: EventosService;

  beforeEach(() => {
    localStorage.removeItem('turmalina.eventos');
    localStorage.removeItem('turmalina.auditoria');
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    });
    service = TestBed.inject(EventosService);
  });

  it('cria um evento vinculado ao autor', async () => {
    const evento = await service.criar(dados(), autor);
    expect(evento.autorId).toBe('user-prof-1');
    expect(evento.autorNome).toBe('Ana Professora');
    expect(evento.turmaId).toBe('turma-1');
    expect(service.total()).toBe(1);
  });

  it('normaliza data e hora para ISO 8601 preservando o instante', async () => {
    const evento = await service.criar(dados({ inicioEm: '2026-03-10T13:00' }), autor);
    expect(evento.inicioEm).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(new Date(evento.inicioEm).getTime()).toBe(new Date('2026-03-10T13:00').getTime());
  });

  it('recusa evento sem título ou com horário inválido', async () => {
    await expectAsync(service.criar(dados({ titulo: '   ' }), autor)).toBeRejected();
    await expectAsync(service.criar(dados({ inicioEm: '' }), autor)).toBeRejected();
  });

  it('recusa duplicidade acidental', async () => {
    await service.criar(dados(), autor);
    await expectAsync(service.criar(dados({ descricao: 'Outra descrição' }), autor)).toBeRejected();
  });

  it('permite o mesmo título em outra turma', async () => {
    await service.criar(dados({ turmaId: 'turma-1' }), autor);
    const outro = await service.criar(dados({ turmaId: 'turma-2' }), autor);
    expect(service.total()).toBe(2);
    expect(outro.turmaId).toBe('turma-2');
  });

  it('retorna apenas os próximos eventos em ordem cronológica', async () => {
    await service.criar(dados({ titulo: 'Antigo', inicioEm: '2026-03-01T10:00:00.000Z' }), autor);
    await service.criar(dados({ titulo: 'Depois', inicioEm: '2026-03-20T10:00:00.000Z' }), autor);
    await service.criar(dados({ titulo: 'Antes', inicioEm: '2026-03-12T10:00:00.000Z' }), autor);

    const proximos = service.proximos(new Date('2026-03-10T00:00:00.000Z'));
    expect(proximos.map((evento) => evento.titulo)).toEqual(['Antes', 'Depois']);
  });

  it('retorna os eventos da turma incluindo os institucionais', async () => {
    const daTurma = await service.criar(dados({ turmaId: 'turma-1' }), autor);
    const institucional = await service.criar(
      dados({ turmaId: null, titulo: 'Reunião geral', inicioEm: '2026-03-11T10:00:00.000Z' }),
      autor,
    );
    await service.criar(
      dados({ turmaId: 'turma-2', titulo: 'Outra turma', inicioEm: '2026-03-12T10:00:00.000Z' }),
      autor,
    );

    const ids = service.eventosParaTurma('turma-1').map((evento) => evento.id);
    expect(ids).toContain(daTurma.id);
    expect(ids).toContain(institucional.id);
    expect(ids.length).toBe(2);
  });

  it('atualiza um evento sem considerá-lo duplicado de si mesmo', async () => {
    const evento = await service.criar(dados(), autor);
    const atualizado = await service.atualizar(evento.id, dados({ descricao: 'Nova descrição' }));
    expect(atualizado.descricao).toBe('Nova descrição');
    expect(service.total()).toBe(1);
  });

  it('remove um evento', async () => {
    const evento = await service.criar(dados(), autor);
    await service.remover(evento.id);
    expect(service.total()).toBe(0);
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AlunosService } from '../../../core/services/alunos.service';
import { AuthService } from '../../../core/services/auth.service';
import { ConquistasService } from '../../../core/services/conquistas.service';
import { AlbumAlunoComponent } from './album-aluno.component';

const CHAVES = [
  'turmalina.conquistas',
  'turmalina.conquistas-aluno',
  'turmalina.conquistas.inicializado',
  'turmalina.acoes-gamificacao',
  'turmalina.eventos-xp',
  'turmalina.alunos',
  'turmalina.auditoria',
  'turmalina.sessao',
];

describe('AlbumAlunoComponent', () => {
  let alunos: AlunosService;
  let auth: AuthService;
  let conquistas: ConquistasService;

  beforeEach(async () => {
    for (const chave of CHAVES) {
      localStorage.removeItem(chave);
    }

    await TestBed.configureTestingModule({
      imports: [AlbumAlunoComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
      ],
    }).compileComponents();

    alunos = TestBed.inject(AlunosService);
    auth = TestBed.inject(AuthService);
    conquistas = TestBed.inject(ConquistasService);

    await alunos.load();
    await conquistas.load();
    await alunos.create({
      nome: 'Carla Aluna',
      email: 'aluno@turmalina.com',
      matricula: '2026-1',
      turmaId: 'turma-1',
    });
    await auth.entrar({ email: 'aluno@turmalina.com', senha: 'turmalina' });
  });

  function render(): ComponentFixture<AlbumAlunoComponent> {
    const fixture = TestBed.createComponent(AlbumAlunoComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('mostra o resumo do álbum com o progresso pessoal', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Meu álbum');
    expect(texto).toContain('Carla Aluna');
    expect(texto).toContain('0% do álbum completo');
  });

  it('lista as conquistas ativas com o estado "Ainda não"', () => {
    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(conquistas.conquistasAtivas().length).toBeGreaterThan(0);
    expect(texto).toContain('Ainda não');
  });

  it('mostra a conquista como "Conquistada" quando o aluno a desbloqueou', async () => {
    const aluno = alunos.alunos().find((item) => item.email === 'aluno@turmalina.com')!;
    const conquista = conquistas.conquistasAtivas()[0];
    await conquistas.desbloquear(conquista.id, [aluno.id], {
      id: 'usuario-admin',
      nome: 'Ana Administradora',
      email: 'adm@turmalina.com',
      papel: 'administrador',
      ativo: true,
      precisaTrocarSenha: false,
    });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Conquistada');
  });

  it('exibe mensagem quando a conta de aluno não é localizada', async () => {
    await auth.sair();
    await auth.entrar({ email: 'professor@turmalina.com', senha: 'turmalina' });

    const fixture = render();
    const texto = fixture.nativeElement.textContent as string;

    expect(texto).toContain('Conta de aluno não localizada');
  });
});

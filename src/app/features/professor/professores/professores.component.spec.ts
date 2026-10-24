import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthRepository } from '../../../core/auth/data-access/auth.repository';
import { MockAuthRepository } from '../../../core/auth/data-access/mock-auth.repository';
import { AuthService } from '../../../core/services/auth.service';
import { DadosService } from '../../../core/services/dados.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { ExportacaoService } from '../../../core/services/exportacao.service';
import { GestaoUsuariosService } from '../../../core/services/gestao-usuarios.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { ProfessoresComponent } from './professores.component';

const CHAVE_PROFESSORES = 'turmalina.professores';

const gestao = {
  disponivel: true,
  redefinirSenha: jasmine.createSpy('redefinirSenha'),
  criarContaProfessor: jasmine.createSpy('criarContaProfessor'),
};

const toast = { mostrar: jasmine.createSpy('mostrar') };

const dados = {
  confirmacao: () => ({ titulo: 't', mensagem: 'm', detalhes: [], rotuloConfirmar: 'c' }),
  excluir: jasmine.createSpy('excluir'),
};

const exportacao = { exportarCsv: jasmine.createSpy('exportarCsv') };

const auditoria = { registrar: jasmine.createSpy('registrar') };

const auth = { temPapel: (papel: string) => papel === 'administrador' };

function botaoPorTexto(
  fixture: ComponentFixture<ProfessoresComponent>,
  texto: string,
): HTMLButtonElement | undefined {
  const botoes = Array.from(
    fixture.nativeElement.querySelectorAll('button'),
  ) as HTMLButtonElement[];
  return botoes.find((botao) => botao.textContent?.includes(texto));
}

describe('ProfessoresComponent', () => {
  let professores: ProfessoresService;

  beforeEach(async () => {
    localStorage.removeItem(CHAVE_PROFESSORES);
    gestao.redefinirSenha.calls.reset();
    gestao.redefinirSenha.and.resolveTo({
      userId: 'usuario-1',
      email: 'ana@escola.com',
      senha: 'nova-senha',
    });
    gestao.criarContaProfessor.calls.reset();
    gestao.criarContaProfessor.and.resolveTo({
      userId: 'usuario-existente',
      email: 'ana@escola.com',
      contaExistente: true,
    });
    toast.mostrar.calls.reset();
    exportacao.exportarCsv.calls.reset();
    auditoria.registrar.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ProfessoresComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuthRepository, useClass: MockAuthRepository },
        { provide: AuthService, useValue: auth },
        { provide: GestaoUsuariosService, useValue: gestao },
        { provide: ToastService, useValue: toast },
        { provide: DadosService, useValue: dados },
        { provide: ExportacaoService, useValue: exportacao },
        { provide: AuditoriaService, useValue: auditoria },
      ],
    }).compileComponents();

    professores = TestBed.inject(ProfessoresService);
  });

  it('redefine a senha do professor em edição quando há conta vinculada', async () => {
    await professores.create({
      nome: 'Ana Professora',
      email: 'ana@escola.com',
      userId: 'usuario-1',
    });
    const fixture = TestBed.createComponent(ProfessoresComponent);
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Editar')!.click();
    fixture.detectChanges();

    const botaoRedefinir = botaoPorTexto(fixture, 'Redefinir senha');
    expect(botaoRedefinir).toBeTruthy();

    botaoRedefinir!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gestao.redefinirSenha).toHaveBeenCalledWith('usuario-1');
  });

  it('avisa quando o professor em edição ainda não tem conta de acesso', async () => {
    await professores.create({ nome: 'Sem Conta', email: 'sem@escola.com' });
    const fixture = TestBed.createComponent(ProfessoresComponent);
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Editar')!.click();
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Redefinir senha')!.click();
    await fixture.whenStable();

    expect(gestao.redefinirSenha).not.toHaveBeenCalled();
    expect(toast.mostrar).toHaveBeenCalledWith(
      'Este professor ainda não tem uma conta de acesso.',
      'warning',
    );
  });

  it('vincula uma conta existente sem exibir ou redefinir a senha', async () => {
    const fixture = TestBed.createComponent(ProfessoresComponent);
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Novo professor')!.click();
    fixture.detectChanges();

    const campoNome = fixture.nativeElement.querySelector('#prof-nome') as HTMLInputElement;
    campoNome.value = 'Ana Professora';
    campoNome.dispatchEvent(new Event('input', { bubbles: true }));

    const campoEmail = fixture.nativeElement.querySelector('#prof-email') as HTMLInputElement;
    campoEmail.value = 'ana@escola.com';
    campoEmail.dispatchEvent(new Event('input', { bubbles: true }));

    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(gestao.criarContaProfessor).toHaveBeenCalled();
    expect(toast.mostrar).toHaveBeenCalledWith(
      'Conta existente vinculada a esta escola. O professor deverá usar a senha que já possui.',
      'info',
    );
    expect(fixture.nativeElement.querySelector('.credenciais__campo')).toBeNull();
  });

  it('exporta os professores filtrados em CSV e registra auditoria', async () => {
    await professores.create({
      nome: 'Ana Professora',
      email: 'ana@escola.com',
      telefone: '11999999999',
      disciplinas: ['Matemática'],
      ativo: true,
    });
    const fixture = TestBed.createComponent(ProfessoresComponent);
    fixture.detectChanges();

    botaoPorTexto(fixture, 'Exportar CSV')!.click();
    await fixture.whenStable();

    expect(exportacao.exportarCsv).toHaveBeenCalled();
    const [nomeArquivo, cabecalhos, linhas] = exportacao.exportarCsv.calls.mostRecent().args;
    expect(nomeArquivo).toBe('professores');
    expect(cabecalhos).toContain('Nome');
    expect(linhas[0]).toEqual([
      'Ana Professora',
      'ana@escola.com',
      '11999999999',
      'Matemática',
      'Ativo',
    ]);
    expect(auditoria.registrar).toHaveBeenCalledWith(
      'professor.exportado',
      'Professor',
      null,
      '1 professor(es)',
    );
  });
});

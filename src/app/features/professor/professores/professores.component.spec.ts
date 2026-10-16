import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DadosService } from '../../../core/services/dados.service';
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
    toast.mostrar.calls.reset();

    await TestBed.configureTestingModule({
      imports: [ProfessoresComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: GestaoUsuariosService, useValue: gestao },
        { provide: ToastService, useValue: toast },
        { provide: DadosService, useValue: dados },
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
});

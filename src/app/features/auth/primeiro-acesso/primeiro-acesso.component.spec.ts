import { provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { PrimeiroAcessoComponent } from './primeiro-acesso.component';
import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/models/usuario.model';

const USUARIO: Usuario = {
  id: 'user-1',
  nome: 'Bruno Professor',
  email: 'bruno@turmalina.com',
  papel: 'professor',
  ativo: true,
  precisaTrocarSenha: true,
};

describe('PrimeiroAcessoComponent', () => {
  let fixture: ComponentFixture<PrimeiroAcessoComponent>;
  let alterarSenha: jasmine.Spy;
  let navigateByUrl: jasmine.Spy;

  beforeEach(async () => {
    alterarSenha = jasmine.createSpy('alterarSenhaPrimeiroAcesso').and.resolveTo();
    navigateByUrl = jasmine.createSpy('navigateByUrl').and.resolveTo(true);

    await TestBed.configureTestingModule({
      imports: [PrimeiroAcessoComponent],
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: AuthService,
          useValue: {
            usuario: signal<Usuario | null>(USUARIO),
            papel: signal<Usuario['papel'] | null>('professor'),
            precisaTrocarSenha: signal(true),
            alterarSenhaPrimeiroAcesso: alterarSenha,
          },
        },
        { provide: Router, useValue: { navigateByUrl } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrimeiroAcessoComponent);
    fixture.detectChanges();
  });

  function definirValor(seletor: string, valor: string): void {
    const campo = fixture.nativeElement.querySelector(seletor) as HTMLInputElement;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function enviar(): void {
    const formulario = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    formulario.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('exibe nome e e-mail do usuário autenticado', () => {
    const texto = (fixture.nativeElement as HTMLElement).textContent ?? '';

    expect(texto).toContain('Bruno Professor');
    expect(texto).toContain('bruno@turmalina.com');
  });

  it('não chama o serviço quando a senha é muito curta', () => {
    definirValor('#primeiro-acesso-senha', 'curta');
    definirValor('#primeiro-acesso-confirmar', 'curta');
    enviar();

    expect(alterarSenha).not.toHaveBeenCalled();
  });

  it('avisa quando as senhas não coincidem', async () => {
    definirValor('#primeiro-acesso-senha', 'senha-valida-1');
    definirValor('#primeiro-acesso-confirmar', 'senha-valida-2');
    enviar();
    await fixture.whenStable();

    expect(alterarSenha).not.toHaveBeenCalled();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('As senhas não coincidem');
  });

  it('altera a senha e navega para a rota inicial do papel', async () => {
    definirValor('#primeiro-acesso-senha', 'senha-valida-1');
    definirValor('#primeiro-acesso-confirmar', 'senha-valida-1');
    enviar();
    await fixture.whenStable();

    expect(alterarSenha).toHaveBeenCalledWith('senha-valida-1');
    expect(navigateByUrl).toHaveBeenCalledWith('/dashboard');
  });
});

import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { App } from './app';
import { AuthService } from './core/services/auth.service';
import { Usuario } from './core/models/usuario.model';

const USUARIO_AUTENTICADO: Usuario = {
  id: 'usuario-teste',
  nome: 'Ana Teste',
  email: 'ana@turmalina.demo',
  papel: 'administrador',
  ativo: true,
  precisaTrocarSenha: false,
};

const authAutenticado = {
  carregando: () => false,
  autenticado: () => true,
  papel: () => USUARIO_AUTENTICADO.papel,
  usuario: () => USUARIO_AUTENTICADO,
  temPapel: () => true,
  garantirSessaoCarregada: () => Promise.resolve(),
  sair: () => Promise.resolve(),
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideZonelessChangeDetection(),
        provideRouter([]),
        { provide: AuthService, useValue: authAutenticado },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the brand when authenticated', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.tl-brand__name')?.textContent).toContain('Turmalina');
  });
});

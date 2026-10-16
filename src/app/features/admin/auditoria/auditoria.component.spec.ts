import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuditoriaService } from '../../../core/services/auditoria.service';
import { EventoAuditoria } from '../../../core/models/auditoria.model';
import { AuditoriaComponent } from './auditoria.component';

function criarEvento(parcial: Partial<EventoAuditoria>): EventoAuditoria {
  const agora = '2026-03-10T15:00:00.000Z';
  return {
    id: `evento-${Math.random()}`,
    institutionId: 'instituicao-padrao',
    criadoEm: agora,
    atualizadoEm: agora,
    atorId: null,
    atorNome: null,
    acao: '',
    entidade: '',
    referencia: null,
    detalhes: null,
    ...parcial,
  };
}

describe('AuditoriaComponent', () => {
  let eventos: EventoAuditoria[];

  beforeEach(async () => {
    eventos = [];
    await TestBed.configureTestingModule({
      imports: [AuditoriaComponent],
      providers: [
        provideZonelessChangeDetection(),
        { provide: AuditoriaService, useValue: { eventos: () => eventos } },
      ],
    }).compileComponents();
  });

  function linhas(fixture: { nativeElement: HTMLElement }): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll('tbody tr')).map(
      (linha) => linha.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );
  }

  function digitar(fixture: { nativeElement: HTMLElement; detectChanges: () => void }, texto: string): void {
    const campo = fixture.nativeElement.querySelector('input[type="search"]') as HTMLInputElement;
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selecionarEntidade(
    fixture: { nativeElement: HTMLElement; detectChanges: () => void },
    entidade: string,
  ): void {
    const seletor = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    seletor.value = entidade;
    seletor.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('mostra estado vazio quando não há registros', () => {
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.empty-state')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });

  it('lista os registros com ator, ação e entidade', () => {
    eventos = [
      criarEvento({ acao: 'periodo.ativado', entidade: 'PeriodoLetivo', referencia: 'periodo-1', detalhes: '2026' }),
      criarEvento({
        acao: 'avaliacao.notas-lancadas',
        entidade: 'Avaliacao',
        atorNome: 'Ana Administradora',
        detalhes: '10/10',
      }),
    ];
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    const linhasVisiveis = linhas(fixture);
    expect(linhasVisiveis.length).toBe(2);
    expect(linhasVisiveis[0]).toContain('Período ativado');
    expect(linhasVisiveis[0]).toContain('Período letivo');
    expect(linhasVisiveis[1]).toContain('Notas lançadas');
    expect(linhasVisiveis[1]).toContain('Ana Administradora');
    expect(fixture.nativeElement.querySelector('.badge-success')).toBeTruthy();
  });

  it('exibe "Sistema" quando o registro não tem ator', () => {
    eventos = [criarEvento({ acao: 'disciplina.criada', entidade: 'Disciplina' })];
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    expect(linhas(fixture)[0]).toContain('Sistema');
  });

  it('filtra os registros pelo termo de busca', () => {
    eventos = [
      criarEvento({ acao: 'periodo.ativado', entidade: 'PeriodoLetivo' }),
      criarEvento({ acao: 'avaliacao.notas-lancadas', entidade: 'Avaliacao' }),
    ];
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    digitar(fixture, 'notas');

    const linhasVisiveis = linhas(fixture);
    expect(linhasVisiveis.length).toBe(1);
    expect(linhasVisiveis[0]).toContain('Notas lançadas');
  });

  it('filtra os registros pela entidade selecionada', () => {
    eventos = [
      criarEvento({ acao: 'periodo.ativado', entidade: 'PeriodoLetivo' }),
      criarEvento({ acao: 'frequencia.salva', entidade: 'Frequencia' }),
    ];
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    selecionarEntidade(fixture, 'Frequencia');

    const linhasVisiveis = linhas(fixture);
    expect(linhasVisiveis.length).toBe(1);
    expect(linhasVisiveis[0]).toContain('Chamada salva');
  });

  it('informa quando nenhum registro corresponde à busca', () => {
    eventos = [criarEvento({ acao: 'periodo.ativado', entidade: 'PeriodoLetivo' })];
    const fixture = TestBed.createComponent(AuditoriaComponent);
    fixture.detectChanges();

    digitar(fixture, 'inexistente');

    expect(fixture.nativeElement.textContent).toContain('Nenhum registro encontrado para "inexistente"');
    expect(fixture.nativeElement.querySelector('tbody')).toBeNull();
  });
});

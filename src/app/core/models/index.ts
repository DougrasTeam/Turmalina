export type Turno = 'manha' | 'tarde' | 'noite' | 'integral';

export interface BaseEntity {
  id: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Turma extends BaseEntity {
  nome: string;
  serie: string;
  turno: Turno;
  anoLetivo: number;
  codigo: string;
  descricao: string;
  professorIds: string[];
  ativa: boolean;
}

export interface Professor extends BaseEntity {
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  ativo: boolean;
}

export interface Aluno extends BaseEntity {
  nome: string;
  email: string;
  matricula: string;
  turmaId: string;
  dataNascimento: string;
  responsavel: string;
  telefoneResponsavel: string;
  ativo: boolean;
  xp: number;
  moedas: number;
}

export interface TurnoOpcao {
  value: Turno;
  label: string;
}

export const TURNOS: TurnoOpcao[] = [
  { value: 'manha', label: 'Manhã' },
  { value: 'tarde', label: 'Tarde' },
  { value: 'noite', label: 'Noite' },
  { value: 'integral', label: 'Integral' },
];

export const DISCIPLINAS_SUGERIDAS: string[] = [
  'Matemática',
  'Português',
  'Ciências',
  'História',
  'Geografia',
  'Inglês',
  'Arte',
  'Educação Física',
];

const ALFABETO_ID = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function gerarCodigoTurma(tamanho = 6): string {
  let codigo = '';
  for (let i = 0; i < tamanho; i++) {
    codigo += ALFABETO_ID[Math.floor(Math.random() * ALFABETO_ID.length)];
  }
  return codigo;
}

export function labelTurno(turno: Turno): string {
  return TURNOS.find((t) => t.value === turno)?.label ?? turno;
}

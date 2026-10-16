export type Turno = 'manha' | 'tarde' | 'noite' | 'integral';

export interface BaseEntity {
  id: string;
  institutionId: string;
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
  disciplinaIds: string[];
  ativa: boolean;
}

export interface Professor extends BaseEntity {
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  ativo: boolean;
  /** Id da conta de acesso vinculada no Supabase Auth; ausente quando ainda não há conta. */
  userId?: string | null;
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

export * from './auditoria.model';
export * from './avaliacao.model';
export * from './boletim.model';
export * from './conta-usuario.model';
export * from './disciplina.model';
export * from './etapa-avaliacao.model';
export * from './frequencia.model';
export * from './instituicao.model';
export * from './matricula.model';
export * from './papel.model';
export * from './perfil.model';
export * from './periodo-letivo.model';
export * from './relatorio.model';
export * from './usuario.model';
export * from './vinculo-docente.model';

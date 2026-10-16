import { BaseEntity } from './index';

export interface VinculoDocente extends BaseEntity {
  professorId: string;
  turmaId: string;
  disciplinaId: string;
  ativo: boolean;
}

export interface DadosVinculoDocente {
  professorId: string;
  turmaId: string;
  disciplinaId: string;
}

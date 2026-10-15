import { Papel } from '../models/papel.model';

export function rotaInicialPorPapel(papel: Papel): string {
  return papel === 'aluno' ? '/aluno/inicio' : '/dashboard';
}

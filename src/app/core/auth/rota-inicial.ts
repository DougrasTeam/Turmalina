import { Papel } from '../models/papel.model';

export function rotaInicialPorPapel(papel: Papel): string {
  if (papel === 'super_admin') {
    return '/admin/escolas';
  }
  return papel === 'aluno' ? '/aluno/inicio' : '/dashboard';
}

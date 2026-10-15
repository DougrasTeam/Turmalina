export type Papel = 'administrador' | 'professor' | 'aluno';

export const PAPEIS: readonly Papel[] = ['administrador', 'professor', 'aluno'];

const ROTULOS_PAPEL: Record<Papel, string> = {
  administrador: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

export function rotuloPapel(papel: Papel): string {
  return ROTULOS_PAPEL[papel];
}

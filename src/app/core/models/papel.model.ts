export type Papel = 'super_admin' | 'administrador' | 'professor' | 'aluno';

export const PAPEIS: readonly Papel[] = ['super_admin', 'administrador', 'professor', 'aluno'];

const ROTULOS_PAPEL: Record<Papel, string> = {
  super_admin: 'Administrador do SaaS',
  administrador: 'Administrador',
  professor: 'Professor',
  aluno: 'Aluno',
};

export function rotuloPapel(papel: Papel): string {
  return ROTULOS_PAPEL[papel];
}

/** Indica se o papel é o administrador global do SaaS (não vinculado a escola). */
export function ehSuperAdmin(papel: Papel | null): boolean {
  return papel === 'super_admin';
}

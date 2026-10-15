export type TipoEtapa = 'bimestre' | 'trimestre' | 'semestre' | 'etapa';

export interface EtapaAvaliacao {
  id: string;
  nome: string;
  tipo: TipoEtapa;
  dataInicio: string;
  dataFim: string;
}

export interface TipoEtapaOpcao {
  value: TipoEtapa;
  label: string;
}

export const TIPOS_ETAPA: readonly TipoEtapaOpcao[] = [
  { value: 'bimestre', label: 'Bimestre' },
  { value: 'trimestre', label: 'Trimestre' },
  { value: 'semestre', label: 'Semestre' },
  { value: 'etapa', label: 'Etapa' },
];

export function rotuloTipoEtapa(tipo: TipoEtapa): string {
  return TIPOS_ETAPA.find((opcao) => opcao.value === tipo)?.label ?? tipo;
}

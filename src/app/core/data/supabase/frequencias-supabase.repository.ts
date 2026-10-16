import { Frequencia, RegistroPresenca, StatusPresenca } from '../../models/frequencia.model';
import { createId } from '../../models';
import { SupabaseService } from '../../services/supabase.service';
import { TenantService } from '../../services/tenant.service';
import { SupabaseRepository } from '../supabase.repository';

/**
 * Repositório de frequências (chamadas). As presenças ficam normalizadas na
 * tabela `presencas` (uma linha por aluno/chamada) para permitir RLS por papel;
 * por isso são carregadas e persistidas aqui, e não como coluna de `frequencias`.
 */
export class FrequenciasSupabaseRepository extends SupabaseRepository<Frequencia> {
  constructor(supabase: SupabaseService, tenant: TenantService, defaults: () => Partial<Frequencia>) {
    super(supabase, tenant, defaults, {
      tabela: 'frequencias',
      ordenacao: 'data',
      relacionadas: ['registros'],
      nulaveis: ['periodo_letivo_id', 'disciplina_id', 'observacao'],
    });
  }

  protected override async carregarRelacionamentos(itens: Frequencia[]): Promise<Frequencia[]> {
    if (!itens.length) return itens;

    const cliente = await this.cliente();
    const ids = itens.map((item) => item.id);
    const { data, error } = await cliente
      .from('presencas')
      .select('*')
      .in('frequencia_id', ids)
      .order('aluno_id', { ascending: true });
    if (error) throw new Error(error.message);

    const porFrequencia = new Map<string, RegistroPresenca[]>();
    for (const linha of data ?? []) {
      const registro: RegistroPresenca = {
        alunoId: String(linha.aluno_id),
        status: linha.status as StatusPresenca,
        justificativa: linha.justificativa === null || linha.justificativa === undefined
          ? null
          : String(linha.justificativa),
      };
      const frequenciaId = String(linha.frequencia_id);
      const lista = porFrequencia.get(frequenciaId) ?? [];
      lista.push(registro);
      porFrequencia.set(frequenciaId, lista);
    }

    return itens.map((item) => ({ ...item, registros: porFrequencia.get(item.id) ?? [] }));
  }

  protected override async salvarRelacionamentos(item: Partial<Frequencia>): Promise<void> {
    if (!item.id || item.registros === undefined) return;

    const cliente = await this.cliente();
    const { error: erroRemocao } = await cliente.from('presencas').delete().eq('frequencia_id', item.id);
    if (erroRemocao) throw new Error(erroRemocao.message);

    const registros = item.registros ?? [];
    if (!registros.length) return;

    const institutionId = item.institutionId ?? this.tenant.atual();
    const linhas = registros.map((registro) => ({
      id: createId(),
      institution_id: institutionId,
      frequencia_id: item.id,
      aluno_id: registro.alunoId,
      status: registro.status,
      justificativa: registro.justificativa,
    }));
    const { error } = await cliente.from('presencas').insert(linhas);
    if (error) throw new Error(error.message);
  }
}

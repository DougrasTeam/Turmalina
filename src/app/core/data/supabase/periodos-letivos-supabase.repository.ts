import { PeriodoLetivo } from '../../models/periodo-letivo.model';
import { EtapaAvaliacao, TipoEtapa } from '../../models/etapa-avaliacao.model';
import { SupabaseService } from '../../services/supabase.service';
import { TenantService } from '../../services/tenant.service';
import { SupabaseRepository } from '../supabase.repository';

/**
 * Repositório de períodos letivos. As etapas de avaliação ficam normalizadas na
 * tabela `etapas_avaliacao`, então são carregadas e persistidas aqui.
 */
export class PeriodosLetivosSupabaseRepository extends SupabaseRepository<PeriodoLetivo> {
  constructor(supabase: SupabaseService, tenant: TenantService, defaults: () => Partial<PeriodoLetivo>) {
    super(supabase, tenant, defaults, {
      tabela: 'periodos_letivos',
      ordenacao: 'data_inicio',
      relacionadas: ['etapas'],
    });
  }

  protected override async carregarRelacionamentos(itens: PeriodoLetivo[]): Promise<PeriodoLetivo[]> {
    if (!itens.length) return itens;

    const cliente = await this.cliente();
    const ids = itens.map((item) => item.id);
    const { data, error } = await cliente
      .from('etapas_avaliacao')
      .select('*')
      .in('periodo_letivo_id', ids)
      .order('data_inicio', { ascending: true });
    if (error) throw new Error(error.message);

    const porPeriodo = new Map<string, EtapaAvaliacao[]>();
    for (const linha of data ?? []) {
      const etapa: EtapaAvaliacao = {
        id: String(linha.id),
        nome: String(linha.nome),
        tipo: linha.tipo as TipoEtapa,
        dataInicio: String(linha.data_inicio),
        dataFim: String(linha.data_fim),
      };
      const periodoId = String(linha.periodo_letivo_id);
      const lista = porPeriodo.get(periodoId) ?? [];
      lista.push(etapa);
      porPeriodo.set(periodoId, lista);
    }

    return itens.map((item) => ({ ...item, etapas: porPeriodo.get(item.id) ?? [] }));
  }

  protected override async salvarRelacionamentos(item: Partial<PeriodoLetivo>): Promise<void> {
    if (!item.id || item.etapas === undefined) return;

    const cliente = await this.cliente();
    const etapas = item.etapas ?? [];
    const idsManter = new Set(etapas.map((etapa) => etapa.id));

    const { data: existentes, error: erroLeitura } = await cliente
      .from('etapas_avaliacao')
      .select('id')
      .eq('periodo_letivo_id', item.id);
    if (erroLeitura) throw new Error(erroLeitura.message);

    const idsRemover = (existentes ?? [])
      .map((linha) => String(linha.id))
      .filter((id) => !idsManter.has(id));
    if (idsRemover.length) {
      const { error } = await cliente.from('etapas_avaliacao').delete().in('id', idsRemover);
      if (error) throw new Error(error.message);
    }

    if (!etapas.length) return;

    const institutionId = item.institutionId ?? this.tenant.atual();
    const linhas = etapas.map((etapa) => ({
      id: etapa.id,
      institution_id: institutionId,
      periodo_letivo_id: item.id,
      nome: etapa.nome,
      tipo: etapa.tipo,
      data_inicio: etapa.dataInicio,
      data_fim: etapa.dataFim,
    }));
    const { error } = await cliente.from('etapas_avaliacao').upsert(linhas, { onConflict: 'id' });
    if (error) throw new Error(error.message);
  }
}

import { Avaliacao, RegistroNota } from '../../models/avaliacao.model';
import { createId } from '../../models';
import { SupabaseService } from '../../services/supabase.service';
import { TenantService } from '../../services/tenant.service';
import { SupabaseRepository } from '../supabase.repository';

/**
 * Repositório de avaliações. As notas ficam normalizadas na tabela `notas`
 * (uma linha por aluno/avaliação) para permitir RLS por papel; por isso são
 * carregadas e persistidas aqui, e não como coluna de `avaliacoes`.
 */
export class AvaliacoesSupabaseRepository extends SupabaseRepository<Avaliacao> {
  constructor(supabase: SupabaseService, tenant: TenantService, defaults: () => Partial<Avaliacao>) {
    super(supabase, tenant, defaults, {
      tabela: 'avaliacoes',
      ordenacao: 'data',
      relacionadas: ['notas'],
      nulaveis: ['etapa_id', 'data', 'descricao'],
    });
  }

  protected override async carregarRelacionamentos(itens: Avaliacao[]): Promise<Avaliacao[]> {
    if (!itens.length) return itens;

    const cliente = await this.cliente();
    const ids = itens.map((item) => item.id);
    const { data, error } = await cliente
      .from('notas')
      .select('*')
      .in('avaliacao_id', ids)
      .order('aluno_id', { ascending: true });
    if (error) throw new Error(error.message);

    const porAvaliacao = new Map<string, RegistroNota[]>();
    for (const linha of data ?? []) {
      const nota: RegistroNota = {
        alunoId: String(linha.aluno_id),
        valor: linha.valor === null || linha.valor === undefined ? null : Number(linha.valor),
        atualizadoEm: String(linha.atualizado_em),
      };
      const avaliacaoId = String(linha.avaliacao_id);
      const lista = porAvaliacao.get(avaliacaoId) ?? [];
      lista.push(nota);
      porAvaliacao.set(avaliacaoId, lista);
    }

    return itens.map((item) => ({ ...item, notas: porAvaliacao.get(item.id) ?? [] }));
  }

  protected override async salvarRelacionamentos(item: Partial<Avaliacao>): Promise<void> {
    if (!item.id || item.notas === undefined) return;

    const cliente = await this.cliente();
    const { error: erroRemocao } = await cliente.from('notas').delete().eq('avaliacao_id', item.id);
    if (erroRemocao) throw new Error(erroRemocao.message);

    const notas = item.notas ?? [];
    if (!notas.length) return;

    const institutionId = item.institutionId ?? this.tenant.atual();
    const agora = new Date().toISOString();
    const linhas = notas.map((nota) => ({
      id: createId(),
      institution_id: institutionId,
      avaliacao_id: item.id,
      aluno_id: nota.alunoId,
      valor: nota.valor,
      atualizado_em: nota.atualizadoEm || agora,
    }));
    const { error } = await cliente.from('notas').insert(linhas);
    if (error) throw new Error(error.message);
  }
}

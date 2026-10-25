import { Component, computed, inject, signal } from '@angular/core';

import { ModalComponent } from '../../../shared/modal/modal.component';
import { ConfirmarTextoComponent } from '../../../shared/confirmar-texto/confirmar-texto.component';
import { CredenciaisAcessoComponent } from '../../../shared/credenciais-acesso/credenciais-acesso.component';
import { DadosService } from '../../../core/services/dados.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { AuthService } from '../../../core/services/auth.service';
import { ExportacaoService, nomeArquivoCsv } from '../../../core/services/exportacao.service';
import { GestaoUsuariosService } from '../../../core/services/gestao-usuarios.service';
import { ProfessoresService } from '../../../core/services/professores.service';
import { ToastService } from '../../../core/services/toast.service';
import { CredenciaisContaUsuario, Professor } from '../../../core/models';
import { DISCIPLINAS_PADRAO } from '../../../core/models/disciplina.model';

interface ProfessorForm {
  nome: string;
  email: string;
  telefone: string;
  disciplinas: string[];
  ativo: boolean;
}

@Component({
  selector: 'app-professores',
  imports: [ModalComponent, ConfirmarTextoComponent, CredenciaisAcessoComponent],
  templateUrl: './professores.component.html',
  styleUrl: './professores.component.scss',
})
export class ProfessoresComponent {
  protected readonly professores = inject(ProfessoresService);
  protected readonly auth = inject(AuthService);
  private readonly dados = inject(DadosService);
  private readonly toast = inject(ToastService);
  private readonly gestao = inject(GestaoUsuariosService);
  private readonly exportacao = inject(ExportacaoService);
  private readonly auditoria = inject(AuditoriaService);

  /** O professor apenas consulta; criar, editar e excluir são do administrador. */
  protected readonly somenteLeitura = computed(() => !this.auth.temPapel('administrador'));

  protected readonly sugestoes = DISCIPLINAS_PADRAO.map(
    (disciplinaPadrao) => disciplinaPadrao.nome,
  );
  protected readonly busca = signal('');
  protected readonly novaDisciplina = signal('');
  protected readonly modalAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly excluindo = signal<Professor | null>(null);
  protected readonly excluirTudoAberto = signal(false);
  protected readonly confirmacaoTudo = computed(() => this.dados.confirmacao('professores'));
  protected readonly form = signal<ProfessorForm>(this.formVazio());

  protected readonly credenciais = signal<CredenciaisContaUsuario | null>(null);
  protected readonly tituloCredenciais = signal('Conta de acesso do professor');
  protected readonly regenerando = signal(false);
  protected readonly criandoConta = signal(false);
  /** Id da conta de acesso do professor em edição; permite redefinir a senha. */
  protected readonly editandoUsuarioId = signal<string | null>(null);
  protected readonly podeGerenciarAcesso = this.gestao.disponivel;

  readonly filtrados = computed(() => {
    const termo = this.busca().trim().toLowerCase();
    const lista = this.professores.professores();
    if (!termo) return lista;
    return lista.filter((p) =>
      [p.nome, p.email, p.disciplinas.join(' ')].some((campo) => campo.toLowerCase().includes(termo)),
    );
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }

  protected exportarCsv(): void {
    const professores = this.filtrados();
    if (professores.length === 0) return;
    const cabecalhos = ['Nome', 'E-mail', 'Telefone', 'Disciplinas', 'Status'];
    const linhas = professores.map((professor) => [
      professor.nome,
      professor.email,
      professor.telefone,
      professor.disciplinas.join(', '),
      professor.ativo ? 'Ativo' : 'Inativo',
    ]);
    this.exportacao.exportarCsv(nomeArquivoCsv('professores'), cabecalhos, linhas);
    this.auditoria.registrar(
      'professor.exportado',
      'Professor',
      null,
      `${professores.length} professor(es)`,
    );
  }

  protected marcado(evento: Event): boolean {
    return (evento.target as HTMLInputElement).checked;
  }

  protected patch<K extends keyof ProfessorForm>(campo: K, valorCampo: ProfessorForm[K]): void {
    this.form.update((atual) => ({ ...atual, [campo]: valorCampo }));
  }

  protected adicionarDisciplina(evento?: Event): void {
    evento?.preventDefault();
    this.adicionarSugestao(this.novaDisciplina());
  }

  protected adicionarSugestao(disciplina: string): void {
    const limpo = disciplina.trim();
    if (!limpo) return;
    this.form.update((atual) =>
      atual.disciplinas.includes(limpo)
        ? atual
        : { ...atual, disciplinas: [...atual.disciplinas, limpo] },
    );
    this.novaDisciplina.set('');
  }

  protected removerDisciplina(disciplina: string): void {
    this.form.update((atual) => ({
      ...atual,
      disciplinas: atual.disciplinas.filter((d) => d !== disciplina),
    }));
  }

  protected abrirNovo(): void {
    this.editandoId.set(null);
    this.editandoUsuarioId.set(null);
    this.form.set(this.formVazio());
    this.modalAberto.set(true);
  }

  protected abrirEdicao(professor: Professor): void {
    this.editandoId.set(professor.id);
    this.editandoUsuarioId.set(professor.userId ?? null);
    this.form.set({
      nome: professor.nome,
      email: professor.email,
      telefone: professor.telefone,
      disciplinas: [...professor.disciplinas],
      ativo: professor.ativo,
    });
    this.modalAberto.set(true);
  }

  protected fechar(): void {
    this.modalAberto.set(false);
  }

  protected async salvar(evento: Event): Promise<void> {
    evento.preventDefault();
    const dados = this.form();
    if (!dados.nome.trim()) {
      this.toast.mostrar('Informe o nome do professor.', 'warning');
      return;
    }

    const id = this.editandoId();
    if (id) {
      await this.professores.update(id, dados);
      this.toast.mostrar('Professor atualizado com sucesso!');
      this.fechar();
      return;
    }

    const professor = await this.professores.create(dados);
    this.toast.mostrar('Professor cadastrado com sucesso!');
    this.fechar();
    await this.provisionarAcesso(professor, dados);
  }

  /** Redefine a senha do professor em edição e exibe as credenciais atualizadas. */
  protected async redefinirSenhaDoProfessor(): Promise<void> {
    const usuarioId = this.editandoUsuarioId();
    if (!usuarioId) {
      this.toast.mostrar('Este professor ainda não tem uma conta de acesso.', 'warning');
      return;
    }

    await this.gerarSenha(usuarioId, 'Nova senha do professor');
  }

  /** Regenera a senha da conta atualmente exibida no modal de credenciais. */
  protected async gerarNovaSenha(): Promise<void> {
    const atual = this.credenciais();
    if (!atual) return;

    await this.gerarSenha(atual.userId, this.tituloCredenciais());
  }

  private async gerarSenha(usuarioId: string, titulo: string): Promise<void> {
    this.regenerando.set(true);
    try {
      const credenciais = await this.gestao.redefinirSenha(usuarioId);
      this.tituloCredenciais.set(titulo);
      this.credenciais.set(credenciais);
      this.toast.mostrar('Nova senha gerada.', 'info');
    } catch (erro) {
      this.toast.mostrar(mensagemDeErro(erro, 'Não foi possível gerar uma nova senha.'), 'danger');
    } finally {
      this.regenerando.set(false);
    }
  }

  protected fecharCredenciais(): void {
    this.credenciais.set(null);
  }

  private async provisionarAcesso(professor: Professor, dados: ProfessorForm): Promise<void> {
    const email = dados.email.trim();
    if (!this.gestao.disponivel) return;

    if (!email) {
      this.toast.mostrar('Professor sem e-mail: a conta de acesso não foi criada.', 'warning');
      return;
    }

    this.criandoConta.set(true);
    try {
      const credenciais = await this.gestao.criarContaProfessor(professor.id, email, dados.nome);
      if ('contaExistente' in credenciais) {
        this.toast.mostrar(
          'Conta existente vinculada a esta escola. O professor deverá usar a senha que já possui.',
          'info',
        );
        return;
      }

      this.tituloCredenciais.set('Conta de acesso do professor');
      this.credenciais.set(credenciais);
    } catch (erro) {
      this.toast.mostrar(
        mensagemDeErro(erro, 'Professor cadastrado, mas a conta de acesso não foi criada.'),
        'warning',
      );
    } finally {
      this.criandoConta.set(false);
    }
  }

  protected pedirExclusao(professor: Professor): void {
    this.excluindo.set(professor);
  }

  protected cancelarExclusao(): void {
    this.excluindo.set(null);
  }

  protected async confirmarExclusao(): Promise<void> {
    const professor = this.excluindo();
    if (!professor) return;
    await this.professores.remove(professor.id);
    this.toast.mostrar('Professor excluído.', 'info');
    this.excluindo.set(null);
  }

  protected abrirExclusaoTodos(): void {
    this.excluirTudoAberto.set(true);
  }

  protected fecharExclusaoTodos(): void {
    this.excluirTudoAberto.set(false);
  }

  protected async excluirTodos(): Promise<void> {
    await this.dados.excluir('professores');
    this.toast.mostrar('Todos os professores foram excluídos.', 'info');
    this.excluirTudoAberto.set(false);
  }

  private formVazio(): ProfessorForm {
    return { nome: '', email: '', telefone: '', disciplinas: [], ativo: true };
  }
}

function mensagemDeErro(erro: unknown, padrao: string): string {
  return erro instanceof Error && erro.message ? erro.message : padrao;
}

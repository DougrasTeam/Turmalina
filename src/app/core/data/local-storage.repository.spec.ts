import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { BaseEntity } from '../models';
import { StorageService } from '../services/storage.service';
import { TenantService } from '../services/tenant.service';
import { LocalStorageRepository } from './local-storage.repository';

interface ItemTeste extends BaseEntity {
  nome: string;
}

describe('LocalStorageRepository (tenancy)', () => {
  const chave = 'turmalina.teste-tenancy';
  let storage: StorageService;
  let tenant: TenantService;

  function criar(): LocalStorageRepository<ItemTeste> {
    return new LocalStorageRepository<ItemTeste>(
      storage,
      chave,
      () => ({ nome: '' }),
      () => tenant.atual(),
    );
  }

  beforeEach(() => {
    localStorage.removeItem(chave);
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    storage = TestBed.inject(StorageService);
    tenant = TestBed.inject(TenantService);
    tenant.definir('instituicao-padrao');
  });

  it('grava com o institutionId do tenant ativo', async () => {
    const item = await criar().create({ nome: 'A' });
    expect(item.institutionId).toBe('instituicao-padrao');
  });

  it('isola registros entre instituições', async () => {
    await criar().create({ nome: 'Escola A' });

    tenant.definir('outra-instituicao');
    const outroRepo = criar();
    expect(await outroRepo.list()).toEqual([]);
    await outroRepo.create({ nome: 'Escola B' });

    tenant.definir('instituicao-padrao');
    const lista = await criar().list();
    expect(lista.map((item) => item.nome)).toEqual(['Escola A']);
  });

  it('migra dados legados (sem institutionId) para o tenant ativo', async () => {
    storage.write(chave, [{ id: 'x', nome: 'Legado', criadoEm: '', atualizadoEm: '' }]);

    const lista = await criar().list();

    expect(lista.length).toBe(1);
    expect(lista[0].institutionId).toBe('instituicao-padrao');
  });

  it('cria vários registros em lote com o tenant ativo', async () => {
    const repo = criar();

    const criados = await repo.createMany([{ nome: 'A' }, { nome: 'B' }]);

    expect(criados.map((item) => item.nome)).toEqual(['A', 'B']);
    expect(criados.every((item) => item.institutionId === 'instituicao-padrao')).toBeTrue();
    expect((await repo.list()).map((item) => item.nome)).toEqual(['A', 'B']);
  });

  it('remove vários registros do tenant ativo sem afetar os demais', async () => {
    const repo = criar();
    const [primeiro, segundo] = await repo.createMany([{ nome: 'A' }, { nome: 'B' }]);
    await repo.create({ nome: 'C' });

    tenant.definir('outra-instituicao');
    await criar().create({ nome: 'D' });
    tenant.definir('instituicao-padrao');

    await repo.removeMany([primeiro.id, segundo.id]);

    expect((await repo.list()).map((item) => item.nome)).toEqual(['C']);
    tenant.definir('outra-instituicao');
    expect((await criar().list()).map((item) => item.nome)).toEqual(['D']);
  });
});

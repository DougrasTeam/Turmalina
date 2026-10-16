import {
  IMAGEM_PUBLICACAO_TAMANHO_MAX,
  imagemPublicacaoValida,
  validarImagemPublicacao,
} from './publicacao.model';

describe('validarImagemPublicacao', () => {
  it('aceita imagens dentro do tipo e do tamanho permitidos', () => {
    expect(validarImagemPublicacao({ type: 'image/jpeg', size: 1024 })).toBeNull();
    expect(validarImagemPublicacao({ type: 'image/png', size: 1024 })).toBeNull();
  });

  it('recusa formatos não suportados', () => {
    expect(validarImagemPublicacao({ type: 'application/pdf', size: 1024 })).not.toBeNull();
  });

  it('recusa imagens acima do tamanho máximo', () => {
    expect(
      validarImagemPublicacao({ type: 'image/jpeg', size: IMAGEM_PUBLICACAO_TAMANHO_MAX + 1 }),
    ).not.toBeNull();
  });
});

describe('imagemPublicacaoValida', () => {
  it('aceita data URLs e URLs http(s)', () => {
    expect(imagemPublicacaoValida('data:image/jpeg;base64,AAAA')).toBe(true);
    expect(imagemPublicacaoValida('https://exemplo.com/foto.jpg')).toBe(true);
    expect(imagemPublicacaoValida('http://exemplo.com/foto.jpg')).toBe(true);
  });

  it('recusa valores vazios ou esquemas inesperados', () => {
    expect(imagemPublicacaoValida(null)).toBe(false);
    expect(imagemPublicacaoValida('')).toBe(false);
    expect(imagemPublicacaoValida('javascript:alert(1)')).toBe(false);
  });
});

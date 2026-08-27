# Contribuindo

## Desenvolvimento

```bash
pnpm install
pnpm check
```

Pull requests devem incluir testes para mudanças de comportamento. Use commits convencionais:

- `feat: adiciona uma funcionalidade`;
- `fix: corrige um defeito`;
- `docs: atualiza documentação`;
- `refactor: altera código sem mudar comportamento`;
- `feat!: mudança incompatível`.

## Releases

O workflow `Release` mantém automaticamente um pull request com a próxima versão e o changelog. Ao mesclar esse pull request:

1. o Release Please atualiza `package.json`, `CHANGELOG.md` e o manifesto;
2. cria a tag `vX.Y.Z` e a GitHub Release;
3. executa todas as validações;
4. publica o pacote no npm com provenance;
5. anexa o arquivo `.tgz` à GitHub Release.

O repositório precisa do secret `NPM_TOKEN`, contendo um token granular com permissão de publicação para `nestjs-azure-sdk`. Em **Settings > Actions > General**, habilite a criação de pull requests pelo `GITHUB_TOKEN` para o Release Please.

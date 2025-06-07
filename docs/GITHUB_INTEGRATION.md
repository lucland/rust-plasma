# Integração com GitHub para o Simulador de Fornalha de Plasma

Este guia fornece instruções detalhadas para configurar e gerenciar o código do Simulador de Fornalha de Plasma no GitHub, incluindo boas práticas para contribuição e desenvolvimento colaborativo.

## Índice

1. [Configuração Inicial do Repositório](#configuração-inicial-do-repositório)
2. [Arquivos .gitignore](#arquivos-gitignore)
3. [Estrutura de Branches](#estrutura-de-branches)
4. [Fluxo de Trabalho de Contribuição](#fluxo-de-trabalho-de-contribuição)
5. [Template de Pull Request](#template-de-pull-request)
6. [Ações do GitHub (CI/CD)](#ações-do-github-cicd)
7. [Releases e Versionamento](#releases-e-versionamento)

## Configuração Inicial do Repositório

### Criando um Novo Repositório no GitHub

1. Acesse [GitHub](https://github.com) e faça login na sua conta
2. Clique no botão "+" no canto superior direito e selecione "New repository"
3. Preencha as informações do repositório:
   - Nome: `plasma-furnace-simulator`
   - Descrição: "Simulador de Fornalha de Plasma para pesquisa de incineração de resíduos"
   - Visibilidade: Pública ou Privada (conforme sua preferência)
   - Inicialize com README: Sim
   - Adicione um arquivo .gitignore: Escolha "Dart" (adicionaremos o Rust manualmente)
   - Escolha uma licença: MIT License (ou outra de sua preferência)
4. Clique em "Create repository"

### Clonando o Repositório Localmente

```bash
# macOS
cd ~/Projects
git clone https://github.com/seu-usuario/plasma-furnace-simulator.git
cd plasma-furnace-simulator

# Windows
cd C:\Projects
git clone https://github.com/seu-usuario/plasma-furnace-simulator.git
cd plasma-furnace-simulator
```

### Configurando o Repositório Local

```bash
# Copie os arquivos do projeto para o repositório
cp -r /caminho/para/plasma_furnace_simulator/* .

# Adicione os arquivos ao controle de versão
git add .
git commit -m "Commit inicial: Adicionando código base do Simulador de Fornalha de Plasma"
git push origin main
```

## Arquivos .gitignore

### Para o Backend (Rust)

Crie um arquivo `backend/.gitignore` com o seguinte conteúdo:

```
# Arquivos gerados pelo Rust
/target/
**/*.rs.bk
Cargo.lock

# Arquivos de IDE
.idea/
.vscode/
*.iml

# Arquivos de sistema
.DS_Store
Thumbs.db

# Arquivos de compilação
*.o
*.so
*.dylib
*.dll
*.a
*.lib

# Arquivos de log
*.log

# Arquivos de ambiente
.env
.env.local
```

### Para o Frontend (Flutter)

Crie um arquivo `frontend/.gitignore` com o seguinte conteúdo:

```
# Arquivos e diretórios do Flutter
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
build/
ios/Flutter/.last_build_id

# Arquivos do Android
**/android/**/gradle-wrapper.jar
**/android/.gradle
**/android/captures/
**/android/gradlew
**/android/gradlew.bat
**/android/local.properties
**/android/**/GeneratedPluginRegistrant.*

# Arquivos do iOS
**/ios/**/*.mode1v3
**/ios/**/*.mode2v3
**/ios/**/*.moved-aside
**/ios/**/*.pbxuser
**/ios/**/*.perspectivev3
**/ios/**/*sync/
**/ios/**/.sconsign.dblite
**/ios/**/.tags*
**/ios/**/.vagrant/
**/ios/**/DerivedData/
**/ios/**/Icon?
**/ios/**/Pods/
**/ios/**/.symlinks/
**/ios/**/profile
**/ios/**/xcuserdata
**/ios/.generated/
**/ios/Flutter/App.framework
**/ios/Flutter/Flutter.framework
**/ios/Flutter/Flutter.podspec
**/ios/Flutter/Generated.xcconfig
**/ios/Flutter/ephemeral
**/ios/Flutter/app.flx
**/ios/Flutter/app.zip
**/ios/Flutter/flutter_assets/
**/ios/ServiceDefinitions.json
**/ios/Runner/GeneratedPluginRegistrant.*

# Arquivos do macOS
**/macos/Flutter/GeneratedPluginRegistrant.swift
**/macos/Flutter/ephemeral

# Arquivos do Windows
**/windows/flutter/generated_plugin_registrant.cc
**/windows/flutter/generated_plugin_registrant.h
**/windows/flutter/generated_plugins.cmake

# Arquivos do Linux
**/linux/flutter/generated_plugin_registrant.cc
**/linux/flutter/generated_plugin_registrant.h
**/linux/flutter/generated_plugins.cmake

# Arquivos de cobertura de código
coverage/

# Arquivos de símbolos
app.*.symbols

# Arquivos de obfuscação
app.*.map.json

# Exceções para arquivos de pacotes
!**/packages/flutter_tools/test/data/dart_dependencies_test/**/.packages

# Arquivos do VSCode
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets

# Arquivos de sistema
.DS_Store
Thumbs.db
```

### Para a Raiz do Projeto

Crie um arquivo `.gitignore` na raiz do projeto com o seguinte conteúdo:

```
# Arquivos de sistema
.DS_Store
Thumbs.db

# Arquivos de IDE
.idea/
.vscode/*
!.vscode/settings.json
!.vscode/tasks.json
!.vscode/launch.json
!.vscode/extensions.json
!.vscode/*.code-snippets
*.iml

# Arquivos de ambiente
.env
.env.local

# Arquivos de log
*.log

# Arquivos de distribuição
dist/
*.dmg
*.exe
*.zip
```

## Estrutura de Branches

Recomendamos seguir o modelo GitFlow para gerenciamento de branches:

- `main`: Branch principal que contém código estável e pronto para produção
- `develop`: Branch de desenvolvimento onde as features são integradas
- `feature/*`: Branches para desenvolvimento de novas funcionalidades
- `bugfix/*`: Branches para correção de bugs
- `release/*`: Branches para preparação de releases
- `hotfix/*`: Branches para correções urgentes em produção

### Comandos para Trabalhar com Branches

```bash
# Criar uma nova branch de feature
git checkout develop
git pull
git checkout -b feature/nova-funcionalidade

# Trabalhar na feature e fazer commits
git add .
git commit -m "Implementa nova funcionalidade"

# Atualizar a branch com as últimas alterações do develop
git checkout develop
git pull
git checkout feature/nova-funcionalidade
git merge develop

# Resolver conflitos se necessário
# ...

# Enviar a branch para o GitHub
git push -u origin feature/nova-funcionalidade
```

## Fluxo de Trabalho de Contribuição

1. **Fork do Repositório** (para contribuidores externos)
   - Acesse o repositório no GitHub
   - Clique no botão "Fork" no canto superior direito
   - Clone o fork para sua máquina local

2. **Crie uma Branch**
   - Para uma nova funcionalidade: `git checkout -b feature/nome-da-funcionalidade`
   - Para uma correção de bug: `git checkout -b bugfix/nome-do-bug`

3. **Desenvolva e Teste**
   - Implemente as alterações
   - Adicione testes
   - Verifique se todos os testes passam

4. **Commit e Push**
   - Faça commits com mensagens claras e descritivas
   - Envie as alterações para o GitHub: `git push origin feature/nome-da-funcionalidade`

5. **Crie um Pull Request**
   - Acesse o repositório no GitHub
   - Clique em "Pull requests" e depois em "New pull request"
   - Selecione sua branch e a branch de destino (geralmente `develop`)
   - Preencha o template de PR
   - Clique em "Create pull request"

6. **Revisão de Código**
   - Aguarde a revisão de outros desenvolvedores
   - Faça as alterações solicitadas, se necessário

7. **Merge**
   - Após aprovação, o PR será mesclado à branch de destino

## Template de Pull Request

Crie um diretório `.github` na raiz do projeto e um arquivo `PULL_REQUEST_TEMPLATE.md` dentro dele:

```markdown
## Descrição

[Descreva as alterações implementadas neste PR]

## Tipo de Alteração

- [ ] Correção de bug (alteração que corrige um problema)
- [ ] Nova funcionalidade (alteração que adiciona funcionalidade)
- [ ] Alteração significativa (correção ou recurso que faria com que a funcionalidade existente não funcionasse como esperado)
- [ ] Esta alteração requer uma atualização da documentação

## Motivação e Contexto

[Por que esta alteração é necessária? Qual problema ela resolve?]

## Como Isso Foi Testado?

[Descreva os testes que você executou para verificar suas alterações]

## Capturas de Tela (se aplicável)

[Adicione capturas de tela para ajudar a explicar suas alterações]

## Checklist:

- [ ] Meu código segue o estilo de código deste projeto
- [ ] Realizei uma autorrevisão do meu próprio código
- [ ] Comentei meu código, particularmente em áreas difíceis de entender
- [ ] Fiz as alterações correspondentes na documentação
- [ ] Minhas alterações não geram novos avisos
- [ ] Adicionei testes que provam que minha correção é eficaz ou que meu recurso funciona
- [ ] Testes unitários novos e existentes passam localmente com minhas alterações
- [ ] Quaisquer alterações dependentes foram mescladas e publicadas em módulos downstream
```

## Ações do GitHub (CI/CD)

Para configurar integração contínua e entrega contínua, crie um arquivo `.github/workflows/ci.yml`:

```yaml
name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test_backend:
    name: Test Backend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
      - name: Build
        run: cd backend && cargo build --verbose
      - name: Run tests
        run: cd backend && cargo test --verbose

  test_frontend:
    name: Test Frontend
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
          channel: 'stable'
      - name: Install dependencies
        run: cd frontend && flutter pub get
      - name: Analyze code
        run: cd frontend && flutter analyze
      - name: Run tests
        run: cd frontend && flutter test

  build_macos:
    name: Build macOS
    needs: [test_backend, test_frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
      - name: Build Backend
        run: cd backend && cargo build --release
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
          channel: 'stable'
      - name: Enable macOS
        run: flutter config --enable-macos-desktop
      - name: Build Frontend
        run: cd frontend && flutter build macos
      - name: Create DMG
        run: |
          brew install create-dmg
          mkdir -p dist
          cp -r frontend/build/macos/Build/Products/Release/plasma_furnace_ui.app dist/
          cp backend/target/release/plasma_simulation dist/
          create-dmg \
            --volname "Simulador de Fornalha de Plasma" \
            --window-pos 200 120 \
            --window-size 800 400 \
            --icon-size 100 \
            --app-drop-link 600 185 \
            "Simulador_de_Fornalha_de_Plasma-${{ github.sha }}-macOS.dmg" \
            "dist/"
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: macos-build
          path: Simulador_de_Fornalha_de_Plasma-${{ github.sha }}-macOS.dmg

  build_windows:
    name: Build Windows
    needs: [test_backend, test_frontend]
    if: github.ref == 'refs/heads/main'
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          override: true
      - name: Build Backend
        run: cd backend && cargo build --release
      - name: Setup Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: '3.10.0'
          channel: 'stable'
      - name: Enable Windows
        run: flutter config --enable-windows-desktop
      - name: Build Frontend
        run: cd frontend && flutter build windows
      - name: Create ZIP
        run: |
          mkdir -p dist
          cp -r frontend/build/windows/runner/Release/* dist/
          cp backend/target/release/plasma_simulation.exe dist/
          Compress-Archive -Path dist/* -DestinationPath Simulador_de_Fornalha_de_Plasma-${{ github.sha }}-Windows.zip
      - name: Upload Artifact
        uses: actions/upload-artifact@v3
        with:
          name: windows-build
          path: Simulador_de_Fornalha_de_Plasma-${{ github.sha }}-Windows.zip
```

## Releases e Versionamento

Para criar uma nova release:

1. Atualize a versão no arquivo `backend/Cargo.toml` e `frontend/pubspec.yaml`
2. Crie uma branch de release: `git checkout -b release/v1.0.0`
3. Faça os ajustes finais e testes
4. Mescle a branch de release no `main`: `git checkout main && git merge release/v1.0.0`
5. Crie uma tag: `git tag -a v1.0.0 -m "Versão 1.0.0"`
6. Envie a tag para o GitHub: `git push origin v1.0.0`
7. No GitHub, vá para "Releases" e clique em "Draft a new release"
8. Selecione a tag, adicione um título e descrição
9. Anexe os artefatos de build (DMG para macOS e ZIP/EXE para Windows)
10. Clique em "Publish release"

### Convenção de Versionamento Semântico

Recomendamos seguir o [Versionamento Semântico](https://semver.org/lang/pt-BR/):

- **MAJOR**: Alterações incompatíveis com versões anteriores
- **MINOR**: Adições de funcionalidades compatíveis com versões anteriores
- **PATCH**: Correções de bugs compatíveis com versões anteriores

Exemplo: 1.0.0, 1.1.0, 1.1.1, 2.0.0

# Tutorial Completo do Simulador de Fornalha de Plasma

Este tutorial fornece instruções detalhadas para configurar, executar e desenvolver o Simulador de Fornalha de Plasma em ambientes macOS (incluindo MacBook M1 Air) e Windows.

## Índice

1. [Requisitos do Sistema](#requisitos-do-sistema)
2. [Instalação das Dependências](#instalação-das-dependências)
   - [Instalação no macOS](#instalação-no-macos)
   - [Instalação no Windows](#instalação-no-windows)
3. [Configuração do Projeto](#configuração-do-projeto)
   - [Clonando o Repositório](#clonando-o-repositório)
   - [Configuração do Backend (Rust)](#configuração-do-backend-rust)
   - [Configuração do Frontend (Flutter)](#configuração-do-frontend-flutter)
4. [Execução do Projeto](#execução-do-projeto)
   - [Execução em Modo de Desenvolvimento](#execução-em-modo-de-desenvolvimento)
   - [Execução em Modo de Produção](#execução-em-modo-de-produção)
5. [Depuração com VSCode](#depuração-com-vscode)
   - [Configuração do VSCode](#configuração-do-vscode)
   - [Depuração do Backend (Rust)](#depuração-do-backend-rust)
   - [Depuração do Frontend (Flutter)](#depuração-do-frontend-flutter)
6. [Testes de Performance](#testes-de-performance)
   - [Testes de Performance do Backend](#testes-de-performance-do-backend)
   - [Testes de Performance do Frontend](#testes-de-performance-do-frontend)
7. [Geração de Executáveis](#geração-de-executáveis)
   - [Geração para macOS](#geração-para-macos)
   - [Geração para Windows](#geração-para-windows)
8. [Integração com GitHub](#integração-com-github)
   - [Configuração do Repositório](#configuração-do-repositório)
   - [Arquivos .gitignore](#arquivos-gitignore)
   - [Template de Pull Request](#template-de-pull-request)
9. [Estado Atual e Próximas Implementações](#estado-atual-e-próximas-implementações)
10. [Solução de Problemas Comuns](#solução-de-problemas-comuns)

## Requisitos do Sistema

### macOS
- macOS 11.0 (Big Sur) ou superior
- Mínimo de 8 GB de RAM (16 GB recomendado)
- 2 GB de espaço livre em disco
- Xcode 13.0 ou superior com Command Line Tools instalado

### Windows
- Windows 10 (64-bit) ou superior
- Mínimo de 8 GB de RAM (16 GB recomendado)
- 2 GB de espaço livre em disco
- Visual Studio 2019 ou superior com "Desktop development with C++" instalado

## Instalação das Dependências

### Instalação no macOS

#### 1. Instalar Homebrew

Abra o Terminal e execute:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Após a instalação, adicione o Homebrew ao seu PATH (especialmente importante para MacBook M1):

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

#### 2. Instalar Rust e Cargo

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Selecione a instalação padrão (opção 1) quando solicitado. Após a instalação, carregue o ambiente Rust:

```bash
source "$HOME/.cargo/env"
```

Verifique a instalação:

```bash
rustc --version
cargo --version
```

#### 3. Instalar Flutter

```bash
brew install flutter
```

Verifique a instalação e resolva quaisquer problemas:

```bash
flutter doctor
```

Para MacBook M1, pode ser necessário configurar o Rosetta para algumas ferramentas:

```bash
softwareupdate --install-rosetta
```

#### 4. Instalar Dependências Adicionais

```bash
brew install cmake pkg-config libomp
```

#### 5. Configurar o VSCode (Opcional, mas recomendado)

Instale o VSCode do site oficial ou via Homebrew:

```bash
brew install --cask visual-studio-code
```

Instale as extensões necessárias:
- Rust Analyzer
- Flutter
- Dart
- CodeLLDB (para depuração de Rust)

### Instalação no Windows

#### 1. Instalar Rust e Cargo

Baixe e execute o instalador do Rust de https://www.rust-lang.org/tools/install

Ou use o comando PowerShell:

```powershell
Invoke-WebRequest https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe -OutFile rustup-init.exe
.\rustup-init.exe
```

Selecione a instalação padrão (opção 1) quando solicitado.

Verifique a instalação:

```powershell
rustc --version
cargo --version
```

#### 2. Instalar Visual Studio Build Tools

Baixe e instale o Visual Studio 2019 ou superior com o workload "Desktop development with C++".

Ou instale apenas as Build Tools de https://visualstudio.microsoft.com/visual-cpp-build-tools/

#### 3. Instalar Flutter

Baixe o Flutter SDK de https://docs.flutter.dev/get-started/install/windows

Extraia o arquivo zip em um local como `C:\src\flutter` (evite caminhos com espaços ou caracteres especiais).

Adicione o diretório `flutter\bin` ao seu PATH:

```powershell
$env:Path += ";C:\src\flutter\bin"
[Environment]::SetEnvironmentVariable("Path", $env:Path, [EnvironmentVariableTarget]::User)
```

Verifique a instalação e resolva quaisquer problemas:

```powershell
flutter doctor
```

#### 4. Instalar Dependências Adicionais

Instale o CMake de https://cmake.org/download/

Ou use o Chocolatey:

```powershell
choco install cmake
```

#### 5. Configurar o VSCode (Opcional, mas recomendado)

Instale o VSCode do site oficial.

Instale as extensões necessárias:
- Rust Analyzer
- Flutter
- Dart
- CodeLLDB (para depuração de Rust)

## Configuração do Projeto

### Clonando o Repositório

#### No macOS

```bash
mkdir -p ~/Projects
cd ~/Projects
git clone https://github.com/seu-usuario/plasma_furnace_simulator.git
cd plasma_furnace_simulator
```

#### No Windows

```powershell
mkdir -p C:\Projects
cd C:\Projects
git clone https://github.com/seu-usuario/plasma_furnace_simulator.git
cd plasma_furnace_simulator
```

### Configuração do Backend (Rust)

#### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/backend
cargo build
```

#### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\backend
cargo build
```

### Configuração do Frontend (Flutter)

#### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/frontend
flutter pub get
flutter config --enable-macos-desktop
```

#### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\frontend
flutter pub get
flutter config --enable-windows-desktop
```

## Execução do Projeto

### Execução em Modo de Desenvolvimento

#### Backend (Rust)

##### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/backend
cargo run
```

##### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\backend
cargo run
```

#### Frontend (Flutter)

##### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/frontend
flutter run -d macos
```

##### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\frontend
flutter run -d windows
```

### Execução em Modo de Produção

#### Backend (Rust)

##### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/backend
cargo build --release
./target/release/plasma_simulation
```

##### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\backend
cargo build --release
.\target\release\plasma_simulation.exe
```

#### Frontend (Flutter)

##### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/frontend
flutter build macos
open build/macos/Build/Products/Release/plasma_furnace_ui.app
```

##### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\frontend
flutter build windows
start build\windows\runner\Release\plasma_furnace_ui.exe
```

## Depuração com VSCode

### Configuração do VSCode

Crie um diretório `.vscode` na raiz do projeto e adicione os seguintes arquivos:

#### launch.json

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Rust Backend",
      "type": "lldb",
      "request": "launch",
      "program": "${workspaceFolder}/backend/target/debug/plasma_simulation",
      "args": [],
      "cwd": "${workspaceFolder}/backend",
      "preLaunchTask": "rust: cargo build"
    },
    {
      "name": "Debug Flutter Frontend (macOS)",
      "type": "dart",
      "request": "launch",
      "program": "frontend/lib/main.dart",
      "args": ["-d", "macos"]
    },
    {
      "name": "Debug Flutter Frontend (Windows)",
      "type": "dart",
      "request": "launch",
      "program": "frontend/lib/main.dart",
      "args": ["-d", "windows"]
    }
  ]
}
```

#### tasks.json

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "rust: cargo build",
      "type": "shell",
      "command": "cargo build",
      "options": {
        "cwd": "${workspaceFolder}/backend"
      },
      "group": {
        "kind": "build",
        "isDefault": true
      }
    }
  ]
}
```

### Depuração do Backend (Rust)

1. Abra o VSCode na pasta raiz do projeto
2. Abra um arquivo Rust do backend
3. Defina pontos de interrupção (breakpoints) clicando na margem esquerda do editor
4. Pressione F5 ou selecione "Debug Rust Backend" no menu de depuração

#### Dicas para Depuração do Rust no MacBook M1

Para MacBook M1, pode ser necessário configurar o CodeLLDB para usar o Rosetta:

1. Abra as configurações do VSCode
2. Procure por "lldb.executable"
3. Defina como "/usr/bin/arch -x86_64 /usr/bin/lldb"

### Depuração do Frontend (Flutter)

1. Abra o VSCode na pasta raiz do projeto
2. Abra um arquivo Dart do frontend
3. Defina pontos de interrupção (breakpoints) clicando na margem esquerda do editor
4. Pressione F5 ou selecione "Debug Flutter Frontend (macOS)" ou "Debug Flutter Frontend (Windows)" no menu de depuração

#### Dicas para Depuração do Flutter

- Use o DevTools do Flutter para inspeção de widgets e análise de performance:
  ```bash
  flutter pub global activate devtools
  flutter pub global run devtools
  ```

- Para depuração de problemas de layout, ative o modo "Debug Paint":
  ```dart
  import 'package:flutter/rendering.dart';
  
  void main() {
    debugPaintSizeEnabled = true;
    runApp(MyApp());
  }
  ```

## Testes de Performance

### Testes de Performance do Backend

O backend inclui benchmarks usando a biblioteca Criterion. Para executar os benchmarks:

#### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/backend
cargo bench
```

#### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\backend
cargo bench
```

Para análise mais detalhada de performance:

```bash
cargo install flamegraph
cargo flamegraph
```

Isso gerará um arquivo SVG com o gráfico de chama (flamegraph) mostrando onde o tempo está sendo gasto.

### Testes de Performance do Frontend

Para testes de performance do Flutter:

#### No macOS

```bash
cd ~/Projects/plasma_furnace_simulator/frontend
flutter run --profile -d macos
```

#### No Windows

```powershell
cd C:\Projects\plasma_furnace_simulator\frontend
flutter run --profile -d windows
```

Use o DevTools do Flutter para análise de performance:

1. Quando o aplicativo estiver em execução, o console mostrará uma URL para o DevTools
2. Abra essa URL no navegador
3. Vá para a aba "Performance" para analisar o desempenho do aplicativo

Para análise de performance específica de renderização:

```dart
import 'package:flutter/rendering.dart';

void main() {
  debugPrintMarkNeedsLayoutStacks = true;
  debugPrintMarkNeedsPaintStacks = true;
  runApp(MyApp());
}
```

## Geração de Executáveis

### Geração para macOS

#### Backend (Rust)

```bash
cd ~/Projects/plasma_furnace_simulator/backend
cargo build --release
```

O executável estará em `target/release/plasma_simulation`.

#### Frontend (Flutter)

```bash
cd ~/Projects/plasma_furnace_simulator/frontend
flutter build macos
```

O aplicativo estará em `build/macos/Build/Products/Release/plasma_furnace_ui.app`.

#### Criação de DMG para Distribuição

Instale o `create-dmg`:

```bash
brew install create-dmg
```

Crie o DMG:

```bash
cd ~/Projects/plasma_furnace_simulator
mkdir -p dist
cp -r frontend/build/macos/Build/Products/Release/plasma_furnace_ui.app dist/
cp backend/target/release/plasma_simulation dist/
create-dmg \
  --volname "Simulador de Fornalha de Plasma" \
  --volicon "frontend/assets/icons/app_icon.icns" \
  --window-pos 200 120 \
  --window-size 800 400 \
  --icon-size 100 \
  --icon "plasma_furnace_ui.app" 200 190 \
  --hide-extension "plasma_furnace_ui.app" \
  --app-drop-link 600 185 \
  "Simulador_de_Fornalha_de_Plasma-1.0.0-macOS.dmg" \
  "dist/"
```

### Geração para Windows

#### Backend (Rust)

```powershell
cd C:\Projects\plasma_furnace_simulator\backend
cargo build --release
```

O executável estará em `target\release\plasma_simulation.exe`.

#### Frontend (Flutter)

```powershell
cd C:\Projects\plasma_furnace_simulator\frontend
flutter build windows
```

O aplicativo estará em `build\windows\runner\Release\plasma_furnace_ui.exe`.

#### Criação de Instalador para Distribuição

Instale o Inno Setup: https://jrsoftware.org/isdl.php

Crie um script de instalação `setup.iss`:

```iss
[Setup]
AppName=Simulador de Fornalha de Plasma
AppVersion=1.0.0
DefaultDirName={autopf}\Simulador de Fornalha de Plasma
DefaultGroupName=Simulador de Fornalha de Plasma
OutputDir=.
OutputBaseFilename=Simulador_de_Fornalha_de_Plasma-1.0.0-Windows-Setup
Compression=lzma
SolidCompression=yes

[Files]
Source: "frontend\build\windows\runner\Release\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs
Source: "backend\target\release\plasma_simulation.exe"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Simulador de Fornalha de Plasma"; Filename: "{app}\plasma_furnace_ui.exe"
Name: "{commondesktop}\Simulador de Fornalha de Plasma"; Filename: "{app}\plasma_furnace_ui.exe"
```

Execute o Inno Setup Compiler para gerar o instalador:

```powershell
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" setup.iss
```

## Integração com GitHub

### Configuração do Repositório

1. Crie um novo repositório no GitHub
2. Inicialize o repositório local e conecte-o ao GitHub:

```bash
cd ~/Projects/plasma_furnace_simulator
git init
git add .
git commit -m "Commit inicial"
git branch -M main
git remote add origin https://github.com/seu-usuario/plasma_furnace_simulator.git
git push -u origin main
```

### Arquivos .gitignore

#### Para Rust (backend/.gitignore)

```
/target
**/*.rs.bk
Cargo.lock
```

#### Para Flutter (frontend/.gitignore)

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
```

### Template de Pull Request

Crie um arquivo `.github/PULL_REQUEST_TEMPLATE.md` com o seguinte conteúdo:

```markdown
## Descrição

[Descreva as alterações implementadas neste PR]

## Tipo de Alteração

- [ ] Correção de bug (alteração que corrige um problema)
- [ ] Nova funcionalidade (alteração que adiciona funcionalidade)
- [ ] Alteração significativa (correção ou recurso que faria com que a funcionalidade existente não funcionasse como esperado)
- [ ] Esta alteração requer uma atualização da documentação

## Como Isso Foi Testado?

[Descreva os testes que você executou para verificar suas alterações]

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

## Estado Atual e Próximas Implementações

### Estado Atual do Projeto

O Simulador de Fornalha de Plasma atualmente implementa:

1. **Simulação Básica**: Núcleo de simulação de transferência de calor em plasma
2. **Geometria e Tochas**: Configuração de múltiplas tochas com posicionamento e orientação precisos
3. **Propriedades de Materiais**: Biblioteca de materiais com propriedades dependentes da temperatura
4. **Visualização Avançada**: Visualizações 2D e 3D interativas dos resultados
5. **Editor de Fórmulas**: Personalização de equações e modelos físicos
6. **Métricas e Exportação**: Análise quantitativa e exportação de resultados
7. **Validação de Modelos**: Comparação com dados experimentais ou soluções analíticas
8. **Estudos Paramétricos**: Exploração do espaço de parâmetros e otimização

### Próximas Implementações Planejadas

1. **Integração com AWS**: Offload de simulações pesadas para computação em nuvem
   - Implementação de API para comunicação com serviços AWS
   - Sistema de fila para gerenciamento de simulações remotas
   - Interface para monitoramento de simulações em execução na nuvem

2. **Simulação em Tempo Real**: Melhorias de desempenho para simulações interativas
   - Otimização do solucionador numérico
   - Implementação de técnicas de paralelização avançadas
   - Suporte para GPU via WebGPU ou CUDA

3. **Aprendizado de Máquina**: Modelos preditivos para otimização de parâmetros
   - Integração com bibliotecas de ML como TensorFlow ou PyTorch
   - Treinamento de modelos com dados de simulações anteriores
   - Previsão de resultados sem necessidade de simulação completa

4. **Colaboração em Tempo Real**: Compartilhamento e colaboração em projetos
   - Sistema de usuários e permissões
   - Compartilhamento de configurações e resultados
   - Edição colaborativa de projetos

5. **Aplicativo Móvel**: Versão para dispositivos móveis (iOS e Android)
   - Interface adaptada para telas menores
   - Visualização de resultados em dispositivos móveis
   - Controle remoto de simulações em execução

## Solução de Problemas Comuns

### Problemas de Compilação do Rust

#### Erro: "linker 'cc' not found"

**macOS**:
```bash
xcode-select --install
```

**Windows**:
Verifique se o Visual Studio Build Tools está instalado corretamente.

#### Erro: "failed to run custom build command for 'openssl-sys'"

**macOS**:
```bash
brew install openssl
export OPENSSL_DIR=$(brew --prefix openssl)
```

**Windows**:
```powershell
vcpkg install openssl:x64-windows
$env:OPENSSL_DIR = "C:\vcpkg\installed\x64-windows"
```

### Problemas com o Flutter

#### Erro: "Unable to locate Android SDK"

Este erro é normal ao desenvolver apenas para desktop. Você pode ignorá-lo se não estiver desenvolvendo para Android.

Para resolver (opcional):
```bash
flutter config --android-sdk /path/to/android/sdk
```

#### Erro: "CocoaPods not installed"

**macOS**:
```bash
sudo gem install cocoapods
```

#### Erro: "The Flutter directory is not a clone of the GitHub project"

```bash
flutter channel stable
flutter upgrade
```

### Problemas de Comunicação entre Frontend e Backend

Se o frontend não conseguir se comunicar com o backend:

1. Verifique se o backend está em execução
2. Verifique se as portas configuradas não estão bloqueadas
3. Verifique os logs do backend para erros

### Problemas Específicos do MacBook M1

#### Erro: "dyld: Library not loaded: @rpath/libswiftCore.dylib"

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

#### Erro ao compilar bibliotecas nativas

Algumas bibliotecas podem precisar do Rosetta:

```bash
softwareupdate --install-rosetta
```

Para mais informações, consulte a documentação técnica incluída no código-fonte.

# Guia de Compilação e Empacotamento

Este guia explica como compilar e empacotar o Simulador de Fornalha de Plasma para distribuição em macOS e Windows.

## Pré-requisitos

### Para macOS

- macOS 10.15 ou superior
- Xcode 12.0 ou superior com ferramentas de linha de comando
- Flutter SDK 3.0.0 ou superior
- Rust e Cargo 1.55.0 ou superior
- Homebrew (recomendado para instalação de dependências)

### Para Windows

- Windows 10 ou superior
- Visual Studio 2019 ou superior com suporte para C++
- Flutter SDK 3.0.0 ou superior
- Rust e Cargo 1.55.0 ou superior
- NSIS (Nullsoft Scriptable Install System) para criar o instalador (opcional)

## Instalação de Dependências

### macOS

1. Instale o Xcode e as ferramentas de linha de comando:
   ```
   xcode-select --install
   ```

2. Instale o Homebrew (se ainda não estiver instalado):
   ```
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

3. Instale o Flutter:
   ```
   brew install --cask flutter
   ```

4. Instale o Rust:
   ```
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

5. Verifique as instalações:
   ```
   flutter doctor
   rustc --version
   cargo --version
   ```

### Windows

1. Instale o Visual Studio com suporte para desenvolvimento em C++.

2. Baixe e instale o Flutter SDK do site oficial: https://flutter.dev/docs/get-started/install/windows

3. Instale o Rust usando o instalador rustup: https://www.rust-lang.org/tools/install

4. (Opcional) Instale o NSIS para criar o instalador: https://nsis.sourceforge.io/Download

5. Verifique as instalações:
   ```
   flutter doctor
   rustc --version
   cargo --version
   ```

## Estrutura do Projeto

```
plasma_furnace_simulator/
├── backend/                  # Código Rust para simulação numérica
├── frontend/                 # Aplicação Flutter
├── docs/                     # Documentação
└── scripts/                  # Scripts de empacotamento
    ├── package_macos.sh      # Script para macOS
    └── package_windows.bat   # Script para Windows
```

## Compilação e Empacotamento

### macOS

1. Abra o Terminal e navegue até o diretório raiz do projeto.

2. Torne o script de empacotamento executável:
   ```
   chmod +x scripts/package_macos.sh
   ```

3. Execute o script:
   ```
   ./scripts/package_macos.sh
   ```

4. Após a conclusão, o arquivo DMG será gerado no diretório `dist/`.

### Windows

1. Abra o Prompt de Comando como administrador e navegue até o diretório raiz do projeto.

2. Execute o script:
   ```
   scripts\package_windows.bat
   ```

3. Após a conclusão, o instalador (se o NSIS estiver instalado) ou o arquivo ZIP será gerado no diretório `dist\`.

## Solução de Problemas Comuns

### macOS

- **Erro de permissão ao executar o script**: Verifique se o script tem permissão de execução com `chmod +x scripts/package_macos.sh`.
- **Erro "Flutter not found"**: Verifique se o Flutter está no PATH com `echo $PATH` e adicione-o se necessário.
- **Erro ao criar o DMG**: Verifique se você tem permissões de escrita no diretório de saída.

### Windows

- **Erro "Flutter not found"**: Verifique se o Flutter está no PATH com `echo %PATH%` e adicione-o se necessário.
- **Erro de compilação do Rust**: Verifique se o Visual Studio está instalado corretamente com suporte para C++.
- **Erro ao criar o instalador**: Verifique se o NSIS está instalado e no PATH.

## Personalização

### Personalização do DMG (macOS)

Para personalizar a aparência do DMG, você pode modificar o script `package_macos.sh` e adicionar opções adicionais ao comando `hdiutil create`. Por exemplo:

```bash
hdiutil create -volname "$APP_NAME" -srcfolder "$MACOS_DIR" -ov -format UDZO -background "/path/to/background.png" -window-size 500 300 -icon-size 128 "$DMG_FILE"
```

### Personalização do Instalador (Windows)

Para personalizar o instalador Windows, você pode modificar o script NSIS gerado em `package_windows.bat`. Adicione mais seções, páginas personalizadas ou altere o comportamento de instalação conforme necessário.

## Distribuição

### macOS

O arquivo DMG gerado pode ser distribuído diretamente. Os usuários podem montá-lo clicando duas vezes e arrastar o aplicativo para a pasta Aplicativos.

Para distribuição na App Store, você precisará:
1. Registrar-se no Apple Developer Program
2. Obter certificados de assinatura
3. Usar o Xcode para preparar o aplicativo para a App Store

### Windows

O instalador EXE ou arquivo ZIP gerado pode ser distribuído diretamente. 

Para distribuição na Microsoft Store, você precisará:
1. Registrar-se no Microsoft Partner Center
2. Converter o aplicativo para o formato MSIX
3. Seguir o processo de submissão da Microsoft Store

## Notas Adicionais

- Os scripts de empacotamento são configurados para a versão 1.0.0. Para alterar a versão, edite a variável `VERSION` no início de cada script.
- Para adicionar ícones personalizados, substitua os arquivos de ícone nos diretórios apropriados antes de executar os scripts.
- Certifique-se de que todas as dependências estejam corretamente configuradas antes de executar os scripts de empacotamento.

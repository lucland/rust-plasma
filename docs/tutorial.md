# Tutorial - Simulador de Fornalha de Plasma

Este tutorial guiará você através dos passos básicos para começar a usar o Simulador de Fornalha de Plasma, desde a instalação até a execução de sua primeira simulação.

## Parte 1: Instalação e Configuração Inicial

### Instalação no macOS

1. Baixe o arquivo de instalação `PlasmaFurnaceSimulator-macOS.dmg` do site oficial.
2. Abra o arquivo DMG clicando duas vezes nele no Finder.
3. Arraste o ícone do aplicativo para a pasta Aplicativos.
4. Na primeira execução, clique com o botão direito no aplicativo e selecione "Abrir".
5. Se aparecer um aviso de segurança, vá para Preferências do Sistema > Segurança e Privacidade e clique em "Abrir Assim Mesmo".

### Instalação no Windows

1. Baixe o arquivo de instalação `PlasmaFurnaceSimulator-Windows.exe` do site oficial.
2. Execute o instalador clicando duas vezes no arquivo baixado.
3. Siga as instruções na tela para completar a instalação.
4. Após a instalação, o aplicativo estará disponível no menu Iniciar.

### Configuração Inicial

Ao abrir o aplicativo pela primeira vez, você verá a tela de boas-vindas. Siga estes passos:

1. Clique em "Novo Projeto".
2. Dê um nome ao seu projeto, como "Minha Primeira Simulação".
3. Escolha um local para salvar o projeto.
4. Selecione o modelo "Fornalha Básica" para começar.
5. Clique em "Criar".

## Parte 2: Configurando uma Simulação Básica

Agora vamos configurar uma simulação básica de fornalha de plasma:

### Configuração da Geometria

1. Na barra de navegação lateral, clique em "Configuração".
2. Na seção "Geometria", defina:
   - Raio da fornalha: 1.0 m
   - Altura da fornalha: 2.0 m
   - Resolução da malha: Média (20x16x20 células)

3. Clique em "Aplicar" para salvar as configurações.

### Configuração da Tocha de Plasma

1. Na mesma tela de configuração, vá para a seção "Tochas".
2. Clique em "Adicionar Tocha".
3. Configure a tocha:
   - Posição: X=0, Y=0, Z=0.5 (centro, a 0.5m da base)
   - Potência: 100 kW
   - Eficiência: 0.8 (80%)
   - Direção: Para cima (0, 0, 1)

4. Clique em "Salvar Tocha".

### Configuração do Material

1. Vá para a seção "Materiais".
2. No menu suspenso, selecione "Aço Carbono" da biblioteca de materiais.
3. Observe as propriedades do material:
   - Condutividade térmica: 45 W/(m·K)
   - Calor específico: 490 J/(kg·K)
   - Densidade: 7850 kg/m³
   - Emissividade: 0.8

4. Mantenha as configurações padrão e clique em "Aplicar".

### Configuração da Simulação

1. Vá para a seção "Simulação".
2. Configure os parâmetros de tempo:
   - Temperatura inicial: 300 K (temperatura ambiente)
   - Passo de tempo: 0.1 s
   - Duração da simulação: 60 s (1 minuto)

3. Clique em "Aplicar" para salvar as configurações.

## Parte 3: Executando a Simulação

Agora vamos executar a simulação:

1. Na barra de navegação lateral, clique em "Simulação".
2. Revise os parâmetros da simulação no painel lateral.
3. Clique no botão verde "Iniciar Simulação".
4. Observe o progresso da simulação:
   - A barra de progresso mostra o avanço da simulação
   - O gráfico de temperatura máxima é atualizado em tempo real
   - A visualização 2D mostra a evolução da temperatura

5. Quando a simulação atingir 60 segundos, ela será concluída automaticamente.
6. Clique em "Visualizar Resultados" para analisar os resultados em detalhes.

## Parte 4: Visualizando os Resultados

Vamos explorar os resultados da simulação:

### Visualização 2D

1. Na barra de navegação lateral, clique em "Visualização".
2. Selecione a guia "2D" no painel superior.
3. Escolha "Mapa de Calor" como tipo de visualização.
4. Selecione "Axial" como plano de corte.
5. Use o controle deslizante para ajustar a posição do corte ao longo do eixo Z.
6. Observe a distribuição de temperatura no plano selecionado.
7. Use a linha do tempo na parte inferior para ver a evolução da temperatura ao longo do tempo.

### Visualização 3D

1. Selecione a guia "3D" no painel superior.
2. Escolha "Volume" como tipo de visualização.
3. Use o mouse para rotacionar a visualização:
   - Clique e arraste para girar
   - Use a roda do mouse para zoom
   - Shift + clique e arraste para mover

4. No painel lateral, ajuste a escala de cores para melhor visualização.
5. Experimente com diferentes tipos de visualização:
   - Selecione "Isosuperfícies" e ajuste o valor da temperatura
   - Selecione "Cortes" e ajuste a posição dos planos de corte

## Parte 5: Analisando os Resultados

Vamos analisar os resultados quantitativamente:

1. Na barra de navegação lateral, clique em "Análise".
2. Observe as métricas principais:
   - Temperatura máxima: deve estar em torno de 800-1000 K
   - Temperatura média: deve estar em torno de 400-500 K
   - Gradiente máximo: indica a taxa máxima de variação da temperatura

3. Crie um gráfico personalizado:
   - Clique em "Novo Gráfico"
   - Selecione "Linha" como tipo de gráfico
   - Escolha "Temperatura Máxima" para o eixo Y
   - Escolha "Tempo" para o eixo X
   - Clique em "Gerar Gráfico"

4. Observe como a temperatura máxima evolui ao longo do tempo.
5. Exporte o gráfico clicando no ícone de download no canto superior direito.

## Parte 6: Exportando os Resultados

Vamos exportar os resultados para análise posterior:

1. Clique em "Exportar" na barra de ferramentas superior.
2. Selecione "Dados" como tipo de exportação.
3. Escolha "CSV" como formato.
4. Selecione quais dados exportar:
   - Temperatura em função do tempo
   - Temperatura em função da posição
   - Métricas calculadas

5. Escolha um local para salvar os arquivos exportados.
6. Clique em "Exportar" para concluir.

## Parte 7: Salvando e Compartilhando o Projeto

Para salvar e compartilhar seu projeto:

1. Clique em "Arquivo" > "Salvar" ou pressione Ctrl+S (Cmd+S no macOS).
2. Para compartilhar o projeto completo:
   - Clique em "Arquivo" > "Exportar" > "Projeto Completo"
   - Escolha um local para salvar o arquivo .pfp
   - Compartilhe este arquivo com colegas que também usam o Simulador de Fornalha de Plasma

3. Para gerar um relatório:
   - Clique em "Arquivo" > "Exportar" > "Relatório"
   - Configure as seções a incluir no relatório
   - Escolha o formato (PDF, HTML, DOCX)
   - Clique em "Gerar Relatório"

## Próximos Passos

Agora que você concluiu sua primeira simulação, aqui estão algumas sugestões para explorar mais o software:

1. **Experimente com diferentes configurações de tocha**:
   - Adicione múltiplas tochas
   - Varie a potência e posição
   - Observe o efeito na distribuição de temperatura

2. **Teste diferentes materiais**:
   - Use materiais da biblioteca
   - Crie materiais personalizados
   - Compare o comportamento térmico

3. **Explore estudos paramétricos**:
   - Vá para "Estudos Paramétricos"
   - Configure um estudo variando a potência da tocha e a condutividade térmica
   - Analise como esses parâmetros afetam a temperatura máxima

4. **Experimente com o editor de fórmulas**:
   - Vá para "Fórmulas"
   - Crie uma fórmula personalizada para a fonte de calor
   - Aplique a fórmula na simulação

5. **Aprenda com os tutoriais avançados**:
   - Acesse "Ajuda" > "Tutoriais"
   - Explore tutoriais sobre validação de modelos, otimização e casos específicos

Parabéns! Você concluiu o tutorial básico do Simulador de Fornalha de Plasma. Continue explorando as funcionalidades avançadas para aproveitar todo o potencial do software.

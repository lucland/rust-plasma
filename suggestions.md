Com certeza. Criei um prompt detalhado e estruturado que você pode passar diretamente para a IA da sua IDE (Kiro).

Este prompt foi desenhado para ser claro e acionável, instruindo a IA a executar exatamente as melhorias que discutimos: formalizar as decisões de arquitetura e adicionar notas estratégicas aos requisitos para guiar o desenvolvimento futuro da sua equipe.

-----

### Prompt para a IA da Kiro IDE

**Atue como meu assistente sênior de arquitetura de software.**

Sua tarefa é refatorar e organizar a documentação do projeto "Plasma Furnace Simulator" com base em uma análise estratégica recente. Você tem acesso a toda a codebase. Por favor, siga as instruções passo a passo abaixo.

**Objetivo Principal:** Formalizar decisões de arquitetura e enriquecer os requisitos com notas estratégicas para guiar o desenvolvimento futuro e facilitar a integração de novos membros na equipe.

-----

**Passo 1: Criar e Popular os Architecture Decision Records (ADRs)**

1.  Crie um novo diretório na raiz do projeto chamado `docs/adr/`.

2.  Mova o conteúdo da seção **"Phase Change Modeling Approaches"** do arquivo `README.md` para um novo arquivo chamado `docs/adr/001-modelo-de-mudanca-de-fase.md`.

3.  Mova o conteúdo da seção **"Solver Methods for Heat Transfer Simulation"** do arquivo `README.md` para um novo arquivo chamado `docs/adr/002-metodos-numericos-de-solucao.md`.

4.  Após mover o conteúdo, substitua as seções removidas no `README.md` pelo seguinte texto de resumo, mantendo os links relativos corretos:

    ```markdown
    # Decisões Técnicas e Arquiteturais

    Este projeto utiliza uma abordagem documentada para registrar decisões arquiteturais importantes. As justificativas detalhadas para as escolhas de implementação podem ser encontradas nos nossos Architecture Decision Records (ADRs).

    - **[ADR-001: Modelo de Mudança de Fase](./docs/adr/001-modelo-de-mudanca-de-fase.md)**: Justificativa para a escolha do Método da Entalpia para garantir a conservação de energia.
    - **[ADR-002: Métodos Numéricos de Solução](./docs/adr/002-metodos-numericos-de-solucao.md)**: Análise e escolha do método de Crank-Nicolson com SOR para estabilidade e precisão.
    ```

-----

**Passo 2: Enriquecer o `requirements.md` com Notas Estratégicas**

1.  Abra o arquivo `requirements.md`.

2.  Localize o **`Requirement 11: Waste-Specific Material Modeling`**. Ao final da sua descrição, adicione a seguinte nota:

    > ***Nota Estratégica do Líder Técnico:*** *A implementação deste requisito representa um aumento significativo na complexidade física do simulador, indo além da difusão de calor para incluir reações químicas (pirólise, gaseificação). Seu escopo deverá ser detalhado em um sub-projeto próprio, possivelmente com fases distintas (ex: v1 para secagem, v2 para pirólise simplificada), e pode requerer consultoria de um especialista em engenharia química.*

3.  Localize o **`Requirement 14: Live Furnace Integration`**. Ao final da sua descrição, adicione a seguinte nota:

    > ***Nota Estratégica do Líder Técnico:*** *Este requisito representa uma evolução arquitetural fundamental, transformando o simulador de uma ferramenta de análise desktop para uma plataforma de monitoramento em tempo real (Gêmeo Digital). Sua implementação exigirá um desenho de arquitetura dedicado (e um novo ADR) para abordar tópicos como streaming de dados (e.g., MQTT, OPC-UA), resiliência e armazenamento de séries temporais, antes que o desenvolvimento se inicie.*

-----

**Passo 3: Atualizar a Documentação da Estrutura do Projeto**

1.  Abra o arquivo `structure.md`.

2.  Atualize a árvore de diretórios em **"Root Directory Layout"** para incluir a nova pasta `docs/adr/`.

3.  Na seção **"Documentation"**, adicione uma descrição para o novo diretório:

    ```
    ### Documentation (`docs/`)
    ...
    - `docs/adr/` - Architecture Decision Records. Contém documentos que registram a justificativa por trás de escolhas arquiteturais significativas.
    ```

-----

Após completar todas as etapas, por favor, forneça um resumo das alterações realizadas, listando os arquivos que foram criados, modificados e o conteúdo que foi movido.



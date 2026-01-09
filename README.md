<h1 align="center">Sistema de Câmbio Online • M&A Consultoria 💵</h1>

<div>

[![License](https://img.shields.io/badge/Licença-Personalizada-red)](./LICENSE)&nbsp;&nbsp;
[![Status](https://img.shields.io/badge/Status-Finalizado-blue)]()&nbsp;&nbsp;
[![Deploy Status](https://img.shields.io/badge/Deploy-Oficial-yellow)](https://cotacaoonline.maconsultoriacambio.com.br/)

</div>

**Solução digital voltada à automação de operações de câmbio turismo**, construída com arquitetura **SPA (Single Page Application)** e com objetivo de **otimizar o fluxo de atendimento** da corretora através de um **sistema seguro, preciso e focado na experiência do usuário final**.

<p align="center">
  <a href="#projeto">Projeto</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#funcionalidades">Funcionalidades</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#tecnologias-e-ferramentas">Tecnologias</a>&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
  <a href="#estrutura-do-projeto">Estrutura</a>
</p>

<h2 id="projeto">PROJETO</h2>

> Este sistema foi desenvolvido para transpor as necessidades específicas da M&A Consultoria para o ambiente digital. Diferente de conversores genéricos, esta aplicação segue normas bancárias reais e oferece uma seção de FAQ detalhada para dar total suporte e transparência ao cliente durante a simulação.

- 🌐 <a href="https://cotacaoonline.maconsultoriacambio.com.br/">Acesse a aplicação</a>

<p align="center">
  <img src="assets/img/print.png" alt="Preview do Sistema" width="100%">
</p>

<h2 id="funcionalidades">FUNCIONALIDADES</h2>

- 📊 **Cotações em Tempo Real:** Integração com Google Sheets API para atualização dinâmica de taxas sem necessidade de banco de dados.
- 🧮 **Cálculos Financeiros:** Processamento automático de IOF, Valor Efetivo Total (VET) e Valor Total Final em conformidade com as taxas vigentes.
- 🏦 **Inteligência de Mercado:** Algoritmo que identifica horário comercial e feriados bancários (móveis e fixos) para liberar ou bloquear simulações.
- 🌍 **Sincronização de Fuso Horário:** Conversão forçada para o horário de Brasília (America/Sao_Paulo) para evitar inconsistências em acessos internacionais.
- 🛡️ **Arquitetura Fail-Safe:** Sistema de proteção que bloqueia operações caso a fonte de dados (Google Sheets) esteja inacessível ou obsoleta.
- 📧 **Fluxo de Solicitação:** Integração com EmailJS para envio de confirmações transacionais para o cliente e para o administrador.
- 🧹 **Sanitização RegEx:** Validação e formatação automática de campos sensíveis como CPF, Telefone e CEP.

<h2 id="tecnologias-e-ferramentas">TECNOLOGIAS E FERRAMENTAS</h2>

- **HTML5 →** Estrutura semântica e acessível (A11y).
- **CSS3 →** Estilização em componentes visuais simples.
- **Tailwind CSS →** Estilização utilitária moderna.
- **JavaScript (ES6+) →** Lógica central em Vanilla JS, manipulação de DOM e lógica temporal complexa.
- **Google Sheets API →** Backend as a Service (BaaS) para gestão de taxas.
- **EmailJS →** Serviço de disparo de e-mails transacionais.
- **Phosphor Icons →** Biblioteca de ícones elegantes para a interface.
- **Git/GitHub →** Controle de versionamento deploy via GitHub Pages.

---

<h2 id="estruturação-do-projeto">ESTRUTURAÇÃO DO PROJETO</h2>

```bash
📁 cambio-online-turismo
├── 📁 assets
│   └── 📂 img           # Logotipos e assets visuais
│
├── 📁 src
│   ├── 📂 css
│   │   └── style.css    # Variáveis CSS e estilos customizados
│   │
│   └── 📂 js
│       └── script.js    # Core do sistema (API, Cálculos e Regras)
│
├── index.html           # Interface principal (SPA)
├── CNAME                # Configuração de domínio personalizado
├── LICENSE              # Licença do projeto
└── README.md            # Documentação técnica
```

---

<h2>📝 LICENÇA</h2> 
<p>Este projeto possui uma **Licença Personalizada**. O código está disponível para consulta pública e portfólio, porém é proibida a sua reprodução, cópia ou uso comercial sem autorização expressa de **Lucas Code** e **M&A Consultoria Câmbio**. Confira os detalhes no arquivo [LICENSE](./LICENSE).</p>

<h2>🧑🏻‍💻 AUTOR</h2> 
<p>Desenvolvido por <a href="https://bio.site/lucascode">Lucas Code</a>.</p>

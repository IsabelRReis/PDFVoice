# PDFVoice
O PDFVoice é uma plataforma full-stack moderna que permite converter documentos PDF em faixas de áudio integradas e organizadas de forma contínua. Ele foi projetado para oferecer uma experiência de escuta confortável e acessível, ideal para estudantes, profissionais e leitores que preferem consumir conteúdos em trânsito.

## ✨ Funcionalidades Principais

* **📂 Upload Inteligente de PDFs**: Painel administrativo para processamento de PDF's.
* **🎙️ Síntese de Voz: Voz gerada diretamente no servidor com entonações naturais e fluidas.
* **🌐 Sintetizador Local do Dispositivo**: Fallback inteligente que permite usar a voz nativa do seu navegador, com um seletor dinâmico de vozes para escolher diferentes idiomas e sotaques.
* **⏯️ Reprodutor de Áudio Minimalista**: Dashboard interativo completo com  player, pular páginas, silenciar (mute), e acompanhamento dinâmico através de uma barra de progresso responsiva.
* **💾 Retenção de Progresso**: O player lembra exatamente onde você parou a leitura, mantendo seu histórico salvo.
* **🔒 Controle de Acesso Seguro**: Sistema integrado para gerenciar quais usuários normais têm acesso à reprodução de quais audiolivros, enquanto os administradores possuem permissão total.
* **📑 Logs de Auditoria**: Registro transparente de todas as atividades, desde uploads de arquivos até acessos e falhas do sistema.

---

## 🏗️ Lógica e Fluxo da Aplicação

O fluxo de processamento funciona de maneira encadeada entre as camadas da aplicação:

<img width="1024" height="558" alt="image" src="https://github.com/user-attachments/assets/0e1fd698-2c1e-4e37-b954-a4c793932c8c" />


1. **Upload e Extração**: O administrador carrega o arquivo PDF no frontend do aplicativo. O backend realiza a extração do conteúdo de texto puro estruturado por páginas utilizando o processador de PDF nativo.
2. **Segmentação e Cache**: O texto de cada página é tratado como um "chunk" individual, criando uma playlist sequencial onde cada página vira uma faixa de áudio específica.
3. **Sintetização**: 
   * **Voz do Servidor (Premium)**: O texto é enviado à API de síntese do servidor para gerar arquivos de áudio WAV nítidos com entonação humana ultra realista.
   * **Voz Local**: Caso queira economizar banda ou testar instantaneamente, o player utiliza a API de `SpeechSynthesis` do navegador web, onde você pode selecionar vozes locais instaladas no seu próprio dispositivo.

Instruções passo a passo para Rodar Localmente:
- Node.js (v18+).
  
Configuração de Variáveis: no arquivo .env
- GEMINI_API_KEY = sua_chave_google_gemini
  
Comandos:
- instalaÇÃO DE dependências:
   npm install
- Rodar a aplicação depois da instalação de dependências:
   npm run dev


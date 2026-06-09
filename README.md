**PDFVoice** é uma plataforma full-stack moderna que permite converter documentos PDF em faixas de áudio integradas e organizadas de forma contínua, ideal para estudantes, profissionais e leitores que preferem consumir conteúdos em trânsito.

---

## ✨ Funcionalidades Principais

* **📂 Upload Inteligente de PDFs**: Painel administrativo para envio e processamento de PDF's.
* **🎙️ Síntese de Voz de Alta Qualidade (Servidor)**: Voz gerada diretamente no servidor com entonações naturais e fluidas.
* **🌐 Sintetizador Local do Dispositivo**: Fallback inteligente que permite usar a voz nativa do seu navegador, com um seletor dinâmico de vozes para escolher diferentes idiomas e sotaques.
* **⏯️ Reprodutor de Áudio Minimalista**: Dashboard interativo completo com controle de velocidade de player, pular páginas, silenciar (mute), e acompanhamento dinâmico através de uma barra de progresso.
* **💾 Retenção de Progresso**: O player lembra exatamente onde você parou a leitura, mantendo seu histórico salvo.
* **🔒 Controle de Acesso Seguro (ACLs)**: Sistema integrado para gerenciar quais usuários normais têm acesso à reprodução de quais audiolivros, enquanto os administradores possuem permissão.
* **📑 Logs de Auditoria**: Registro transparente de todas as atividades, desde uploads de arquivos até acessos e falhas do sistema.

---

## 🏗️ Lógica e Fluxo da Aplicação

O fluxo de processamento funciona de maneira encadeada entre as camadas da nossa aplicação:


<img width="1024" height="558" alt="image" src="https://github.com/user-attachments/assets/e1ecbe21-34dc-471f-84cc-ea29d89fba2b" />


1. **Upload e Extração**: O administrador carrega o arquivo PDF no frontend do aplicativo. O backend realiza a extração do conteúdo de texto puro estruturado por páginas utilizando o processador de PDF nativo.
2. **Segmentação e Cache**: O texto de cada página é tratado como um "chunk" individual, criando uma playlist sequencial onde cada página vira uma faixa de áudio específica.
3. **Sintetização**: 
   * **Voz do Servidor (Premium)**: O texto é enviado à API de síntese do servidor para gerar arquivos de áudio WAV nítidos com entonação humana ultra realista.
   * **Voz Local**: Caso queira economizar banda ou testar instantaneamente, o player utiliza a API de `SpeechSynthesis` do navegador web, onde você pode selecionar vozes locais instaladas no seu próprio dispositivo.

---

## 🛠️ Como Rodar a Aplicação Localmente

Siga o passo a passo abaixo para instalar e rodar o projeto na sua máquina:

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
* [Node.js](https://nodejs.org/) (versão 18 ou superior)


### 2. Baixando o Projeto
```bash
git clone https://github.com/IsabelRReis/PDFVoice.git
```
### 3. Configuração de Variáveis de Ambiente
Na raiz do projeto, você encontrará o arquivo.

Crie um .env`
```bash
JWT_SECRET=super-secret-pdf-audiobook-key-2026
GEMINI_API_KEY=sua_chave_de_api_aqui
```

### 4. Instalando as Dependências
Execute o comando abaixo para instalar todos os pacotes necessários:
```bash
npm install
```

### 5. Executando em Ambiente de Desenvolvimento
Para iniciar a aplicação com recarga automática de alterações (Hot Reload):
```bash
npm run dev
```


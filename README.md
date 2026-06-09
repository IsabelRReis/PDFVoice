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

<div style="display: inline_block"><br>
  <img aligt="center" alt="TypeScript" height="30" width="40" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" /> 
  <img aligt="center" alt="CSS" height="30" width="40" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-plain.svg" /> 
  <img aligt="center" alt="HTML" height="30" width="40" src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-plain.svg" /> 
  <img aligt="center" alt="Gemini" height="30" width="30" src="https://img.icons8.com/?size=100&id=eoxMN35Z6JKg&format=png&color=000000"/>
  <img aligt="center" alt="Prisma" height="30" width="30" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/prisma/prisma-original.svg"/>
  <img aligt="center" alt="Google_Cloud" height="30" width="30" src="https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/googlecloud/googlecloud-original.svg" />     
</div
  
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

## Link da Aplicação 
<a href="https://pdf-audiobook-converter-269227672859.us-east1.run.app/">Clique aqui</a>

### 5. Executando em Ambiente de Desenvolvimento
Para iniciar a aplicação com recarga automática de alterações (Hot Reload):
```bash
npm run dev
```

## Usuário Padrão
<img width="1024" height="650" alt="2026-06-09 00-58-42" src="https://github.com/user-attachments/assets/8e2c97d4-c2e9-4242-b999-f023966adbcc" />

---

## Administrador
<img width="1024" height="650" alt="2026-06-09 00-57-00" src="https://github.com/user-attachments/assets/12abd3b9-34df-4ed8-aa68-1b2f8c34d566" />

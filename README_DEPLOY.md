# Rastreio de Encomendas

## Como fazer Deploy no Render.com (Grátis e Fácil)

Este projeto já está configurado para rodar no Render.com.

### Passos:

1. **Crie um Repositório no GitHub:**
   - Vá em [github.com/new](https://github.com/new).
   - Dê um nome (ex: `rastreio-encomendas`).
   - Clique em "Create repository".

2. **Envie o Código para o GitHub:**
   - Abra o terminal na pasta deste projeto.
   - Rode os comandos que o GitHub mostrar, parecidos com:
     ```bash
     git remote add origin https://github.com/SEU-USUARIO/rastreio-encomendas.git
     git branch -M main
     git push -u origin main
     ```

3. **Crie o Serviço no Render:**
   - Crie uma conta em [render.com](https://render.com).
   - Clique em **"New + "** -> **"Web Service"**.
   - Conecte sua conta do GitHub.
   - Selecione o repositório `rastreio-encomendas`.
   - Dê um nome para o serviço.
   - Em **Build Command**, certifique-se que está: `npm install && npx prisma generate`
   - Em **Start Command**, certifique-se que está: `node index.js`
   - Clique em **"Create Web Service"**.

4. **Configure as Variáveis de Ambiente:**
   - No painel do Render, vá na aba **"Environment"**.
   - Adicione as seguintes variáveis (copie do seu arquivo `.env` local):
     - `RESEND_API_KEY`: (Sua chave do Resend)
     - `DATABASE_URL`: `file:./dev.db`
     - `NODE_ENV`: `production`

5. **Pronto!**
   - O Render vai instalar e iniciar o site automaticamente.
   - O link do seu site estará disponível no topo da página.

**Atenção:** Como estamos usando SQLite (`dev.db`), se o serviço reiniciar (o que acontece no plano grátis), os dados podem ser resetados. Para produção séria, recomenda-se usar um banco de dados PostgreSQL (o Render oferece um pago, ou você pode usar o Railway/Neon.tech).

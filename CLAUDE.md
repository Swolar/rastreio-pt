# SaasRastreio

Sistema de rastreamento de encomendas com notificacoes automaticas por email.

## Comandos

```bash
npm install          # Instalar dependencias
npm start            # Iniciar servidor (porta 3000)
npm run build        # Gerar Prisma client (producao)
npx prisma db push   # Aplicar schema no banco de dados
```

## Arquitetura

Node.js/Express 5 com EJS templates e Prisma ORM.

- **Entrada**: `index.js` — Express, DB init, cron, middleware
- **Rotas**: `routes/index.js`
- **Controllers**: `controllers/orderController.js` (CRUD pedidos), `controllers/resendController.js` (reenvio + pagamento WayMB)
- **Services**: `services/emailService.js` (emails Resend API), `services/cronService.js` (cron automatico)
- **Views**: `views/` — EJS templates com partials (header/footer)
- **CSS**: `public/css/style.css`

## Database (Prisma + PostgreSQL)

Schema: `prisma/schema.prisma`

Modelos: **Order**, **Event**, **ResendPayment**

### Status do Pedido

| Valor | Status |
|-------|--------|
| 0 | Confirmado |
| 1 | Em Processamento |
| 2 | Expedido |
| 3 | Em Transito |
| 4 | Saiu para Entrega |
| 5 | Entrega Falhada |
| 6 | Reenvio Agendado |
| 7 | Entregue |

## Cron Automatico

- **00:00**: Avanca status 0→1→2→3→4 e 6→7, envia email a cada transicao
- **12:00**: Avanca status 4→5 (entrega falhada, 12h apos saiu p/ entrega)

## Variaveis de Ambiente (.env)

| Variavel | Uso |
|----------|-----|
| `DATABASE_URL` | PostgreSQL (Supabase) |
| `PORT` | Porta do servidor |
| `BASE_URL` | URL publica para links nos emails |
| `RESEND_API_KEY` | API key do Resend |
| `WAYMB_CLIENT_ID` | Gateway de pagamento WayMB |
| `WAYMB_CLIENT_SECRET` | Secret WayMB |
| `WAYMB_ACCOUNT_EMAIL` | Email WayMB |

## Deploy

Render.com com auto-deploy do branch `main` no GitHub (`Swolar/rastreio-pt`).

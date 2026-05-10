# SubastasPúblicas.es

Buscador de subastas públicas de España — **gratis y open source**.

## Que hace

- Scraper automatico de subastas del **BOE**, **Agencia Tributaria** y **Seguridad Social**
- Busqueda avanzada por provincia, tipo de bien, precio, origen
- Alertas por email cuando hay subastas nuevas que te interesan
- Mapa interactivo de subastas por provincia
- 100% gratuito, sin registro obligatorio

## Tech stack

- **Next.js 14** (App Router, SSR)
- **TypeScript**
- **Tailwind CSS** (dark theme)
- **SQLite** (better-sqlite3)
- **Cheerio** (HTML scraping)
- **Nodemailer** (email alerts)

## Setup

```bash
npm install
cp .env.example .env
# Edita .env con tus datos SMTP
npm run dev
```

## Scraping

```bash
# Manual
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/scrape

# O programa un cron cada hora
```

## API

- `GET /api/auctions?provincia=Madrid&tipo_bien=Vivienda&precio_max=100000`
- `GET /api/auctions?query=piso+centro&sort=precio_asc&page=1`
- `POST /api/alerts` — crear alerta email
- `GET /api/cron/scrape` — ejecutar scrapers

## Fuentes de datos

- [BOE Portal de Subastas](https://subastas.boe.es)
- [Agencia Tributaria](https://apcfacturacion.sedeagenciatributaria.gob.es)
- [Seguridad Social](https://subastas.seg-social.es)

## Licencia

MIT

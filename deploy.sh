#!/bin/bash
# Deploy de urbi en el VPS. Correr desde /root/urbi/urbi:
#   bash deploy.sh
set -e

echo "== git pull =="
git pull origin main

echo "== npm install =="
npm install

echo "== prisma migrate deploy =="
npx prisma migrate deploy

echo "== prisma generate =="
npx prisma generate

echo "== build en paralelo (la tienda sigue arriba con el build anterior) =="
rm -rf .next-build
NEXT_DIST_DIR=.next-build npm run build

echo "== reemplazar build y reiniciar =="
rm -rf .next-old
[ -d .next ] && mv .next .next-old
mv .next-build .next
pm2 restart urbi
rm -rf .next-old

echo "== listo — últimas líneas del log =="
sleep 2
pm2 logs urbi --lines 15 --nostream

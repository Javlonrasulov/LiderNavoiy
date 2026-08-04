FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

# sharp (libvips) + musl
RUN apk add --no-cache libc6-compat vips

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads/payments uploads/products uploads/chat uploads/clients && chmod -R 777 uploads

EXPOSE 3000

CMD ["node", "dist/main.js"]

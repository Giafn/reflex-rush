# ─── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# Compile custom server
RUN npx tsc server.ts --outDir . --esModuleInterop --module commonjs --target es2017 --skipLibCheck || \
    cp server.ts server.js

# ─── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

# Copy only necessary files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/server.js ./server.js

# Socket.IO needs these
COPY --from=builder /app/node_modules/socket.io ./node_modules/socket.io
COPY --from=builder /app/node_modules/socket.io-client ./node_modules/socket.io-client
COPY --from=builder /app/node_modules/engine.io ./node_modules/engine.io

EXPOSE 3000

CMD ["node", "server.js"]

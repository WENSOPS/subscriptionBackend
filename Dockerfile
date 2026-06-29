FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Install all deps (prisma CLI needed for generate)
RUN npm ci

# Generate prisma client
RUN npx prisma generate

# Copy rest of source
COPY . .

EXPOSE 3000

# Run migrations then start app
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
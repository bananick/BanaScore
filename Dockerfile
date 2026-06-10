# --- Build stage: install all deps, build frontend + server ---
FROM node:22-bookworm AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:all
# Drop dev dependencies so the runtime image stays lean.
RUN npm prune --omit=dev

# --- Runtime stage ---
FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
# Persist the SQLite database on a mounted volume.
ENV BANASCORE_DB=/data/banascore.db
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server
COPY --from=build /app/package.json ./package.json
VOLUME /data
EXPOSE 3001
CMD ["node", "dist-server/index.js"]

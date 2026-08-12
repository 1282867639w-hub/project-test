FROM node:24-alpine
WORKDIR /app
COPY creator-agent-studio/package.json ./
COPY creator-agent-studio/src ./src
COPY creator-agent-studio/public ./public
EXPOSE 3210
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3210 DATA_DIR=/data
CMD ["node", "src/server.js"]

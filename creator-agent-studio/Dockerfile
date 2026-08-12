FROM node:24-alpine
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY public ./public
EXPOSE 3210
ENV NODE_ENV=production HOST=0.0.0.0 PORT=3210 DATA_DIR=/data
CMD ["node", "--use-env-proxy", "src/server.js"]

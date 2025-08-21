FROM node:20-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm install --omit=dev
COPY src ./src
ENV NODE_ENV=production
ENV PORT=4000
EXPOSE 4000
CMD ["node","src/index.js"]



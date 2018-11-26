FROM node:10.13 AS builder
COPY . /app
WORKDIR /app
ENV CI=true
RUN yarn --network-concurrency 1 install && yarn test && yarn build

FROM nginx:latest
RUN apt update && apt install -y wget curl
COPY --from=builder /app/build /usr/share/nginx/html
COPY default.conf /etc/nginx/conf.d/default.conf
COPY htpasswd.passwd /etc/nginx/htpasswd.passwd

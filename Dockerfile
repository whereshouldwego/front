FROM node:22 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install

# 빌드 타임 변수 정의
ARG VITE_KAKAO_MAP_API_KEY
ARG VITE_KAKAO_CLIENT_ID
ARG VITE_KAKAO_REDIRECT_URI
ARG VITE_API_URL

ENV VITE_KAKAO_MAP_API_KEY=$VITE_KAKAO_MAP_API_KEY
ENV VITE_KAKAO_CLIENT_ID=$VITE_KAKAO_CLIENT_ID
ENV VITE_KAKAO_REDIRECT_URI=$VITE_KAKAO_REDIRECT_URI
ENV VITE_API_URL=$VITE_API_URL

COPY . .
RUN npm run build


FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY ./nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
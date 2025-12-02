# lightweight node js image, 'AS' names this stage as build
FROM node:20-alpine AS build

# install dependencies for building (git for private packages if needed) (apk-> alphine package keeper)
RUN apk add --no-cache git

# sets the working directory
WORKDIR /app

#copy package metadata first 
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./

# determines which package manager i am using
RUN npm ci;

# Copy the rest of the source
COPY . .

# Build the static assets (ensures NODE_ENV=production)
RUN npm run build

# stage 2 server with nginx
FROM nginx:stable-alpine AS production

# Remove default config and add our own nginx config
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built static files
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx","-g","daemon off;"]
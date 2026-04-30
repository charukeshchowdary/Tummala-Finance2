FROM node:20-slim

# Set working directory
WORKDIR /usr/src/app

# Install chrome dependencies and clean up aggressively to compress image
RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && apt-get purge --auto-remove -y wget gnupg \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /var/cache/apt/archives/*

# Copy package files
COPY package*.json ./

# Install only production dependencies and compress/clean NPM cache
RUN npm install --omit=dev && npm cache clean --force

# Copy app source
COPY . .

# Environment variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
ENV PORT=5000

# Expose port
EXPOSE 5000

# Start command
CMD [ "npm", "start" ]

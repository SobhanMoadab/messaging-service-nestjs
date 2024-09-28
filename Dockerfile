# Base image
FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the project files
COPY . .

# Build the project (if you're using TypeScript)
RUN npm run build

# Expose the port (replace <port> with your app's port)
EXPOSE 3001

# Start the application
CMD ["npm", "run", "start:prod"]
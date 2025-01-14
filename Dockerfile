# syntax=docker/dockerfile:1

# Use the official Ruby image from the Docker Hub
FROM ruby:3.3.6-slim

# Set the working directory
WORKDIR /myapp

# Install dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential libpq-dev nodejs postgresql-client libyaml-dev && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

# Copy the Gemfile and Gemfile.lock
COPY Gemfile Gemfile.lock ./

# Install gems
RUN bundle install

# Copy the rest of the application code
COPY . .

# Ensure the tmp directory exists
RUN mkdir -p tmp/pids

# Expose port 3000 to the host
EXPOSE 3000

# Start the Rails server
CMD ["bash", "-c", "rm -f tmp/pids/server.pid && bundle exec rails s -b '0.0.0.0'"]
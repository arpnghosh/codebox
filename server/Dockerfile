FROM node:22-alpine

RUN addgroup -S sandbox && \
    adduser -S codebox -G sandbox && \
    mkdir -p /home/codebox/app && \
    chown -R codebox:sandbox /home/codebox

RUN apk add --no-cache \
    git \
    vim \
    curl \
    bash \
    python3 \
    make \
    g++

USER codebox
WORKDIR /home/codebox/app

CMD ["tail", "-f", "/dev/null"]

FROM php:8.3-cli-bookworm

WORKDIR /var/www/html
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv curl ca-certificates libcurl4-openssl-dev \
    && docker-php-ext-install pdo_mysql curl \
    && python3 -m venv /opt/radius-venv \
    && rm -rf /var/lib/apt/lists/*

COPY ai_service/requirements.txt /tmp/ai-requirements.txt
RUN /opt/radius-venv/bin/pip install --no-cache-dir -r /tmp/ai-requirements.txt && rm /tmp/ai-requirements.txt
COPY . .
RUN groupadd --system radius && useradd --system --gid radius --home-dir /var/www/html --shell /usr/sbin/nologin radius \
    && mkdir -p uploads/listings uploads/profiles /tmp/radius-sessions \
    && chmod +x run.sh \
    && chown -R radius:radius /var/www/html /opt/radius-venv /tmp/radius-sessions
ENV PATH="/opt/radius-venv/bin:${PATH}" PYTHONUNBUFFERED=1
USER radius
EXPOSE 10000
CMD ["./run.sh"]

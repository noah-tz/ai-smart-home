FROM python:3.9-slim

RUN pip install --no-cache-dir google-auth-oauthlib google-api-python-client requests

RUN useradd --create-home --shell /bin/false appuser

WORKDIR /app
COPY google-smtp-relay.py /app/

RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 2525
CMD ["python", "google-smtp-relay.py", "--config", "/config/credentials.json", "--token", "/config/token.json", "--port", "2525"]

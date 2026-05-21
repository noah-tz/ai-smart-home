FROM python:3.9-slim
RUN pip install --no-cache-dir google-auth-oauthlib google-api-python-client requests
WORKDIR /app
COPY google-smtp-relay.py /app/
EXPOSE 2525
CMD ["python", "google-smtp-relay.py", "--config", "/config/credentials.json", "--token", "/config/token.json", "--port", "2525"]

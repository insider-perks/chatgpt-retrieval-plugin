FROM python:3.11-slim

ENV TZ=Etc/GMT
ENV PYTHONUNBUFFERED=1
ENV PORT=8080
ENV FLASK_ENV=production

WORKDIR /app

COPY requirements.txt .
COPY . .

RUN apt-get update -qy && \
    apt-get install -qy --no-install-recommends \
        ca-certificates \
        gcc \
        python3-dev \
        && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install gunicorn && \
    rm -rf /var/cache/apt/lists

EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"]
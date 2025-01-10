FROM python:3.11-slim

ENV TZ=Etc/GMT
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
COPY .env .
COPY . .

RUN apt-get update -qy && \
    apt-get install -qy --no-install-recommends \
        ca-certificates \
        gcc \
        python3-dev \
        && \
    pip install --no-cache-dir -r requirements.txt && \
    rm -rf /var/cache/apt/lists

EXPOSE 5000

CMD ["python", "main.py"]
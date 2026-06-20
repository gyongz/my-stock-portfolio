FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app.py ./

ENV MARKET_DATA_SERVICE_HOST=0.0.0.0
ENV MARKET_DATA_SERVICE_PORT=8001
EXPOSE 8001

CMD ["sh", "-c", "uvicorn app:app --host ${MARKET_DATA_SERVICE_HOST} --port ${MARKET_DATA_SERVICE_PORT}"]

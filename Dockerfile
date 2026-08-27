FROM python:3.14-slim

WORKDIR /app
COPY app ./app
COPY web ./web
COPY PRD.md README.md ./
RUN mkdir -p /app/data
ENV PORT=8097
ENV FINANCE_DB=/app/data/finance.db
EXPOSE 8097
CMD ["python3", "-m", "app.server"]

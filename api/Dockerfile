FROM python:3.12-slim

# Evita prompts interativos durante o build
ENV DEBIAN_FRONTEND=noninteractive
# Impede que o Python gere arquivos .pyc
ENV PYTHONDONTWRITEBYTECODE=1
# Garante que os logs apareçam em tempo real no terminal
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Dependências de sistema necessárias para o PyMySQL e o gcc
RUN apt-get update && apt-get install -y \
    gcc \
    pkg-config \
    default-libmysqlclient-dev \
    && rm -rf /var/lib/apt/lists/*

# Copia e instala dependências Python antes do código
# (aproveita o cache do Docker — só reinstala se requirements.txt mudar)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copia o restante do código da API
COPY . .

EXPOSE 8000

# Comando de inicialização
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
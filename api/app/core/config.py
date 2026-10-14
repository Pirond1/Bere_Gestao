from pathlib import Path

from pydantic_settings import BaseSettings

# Arquivos enviados pelo painel (fotos de produtos) — fora do git; no deploy precisa de volume persistente
UPLOADS_DIR = Path(__file__).resolve().parent.parent / "uploads"
UPLOADS_URL = "/uploads"


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    # Sessão (BG-17): renovada enquanto a pessoa usa o sistema; cai depois desse tempo parada.
    # Cliente: curta, cobre a compra. Admin: longa, a dona usa o painel no próprio celular o dia todo
    SESSAO_CLIENTE_HORAS: int = 3
    SESSAO_ADMIN_DIAS: int = 30
    MERCADOPAGO_ACCESS_TOKEN: str = ""
    # Secret gerado no painel do Mercado Pago ao configurar o webhook (valida o x-signature)
    MERCADOPAGO_WEBHOOK_SECRET: str = ""
    # Com credenciais de teste o comprador precisa ser o usuário de teste do Mercado Pago
    MERCADOPAGO_SANDBOX: bool = True
    # Envio de e-mail (BG-15). Em produção: servidor do provedor (ex.: smtp.gmail.com com senha de app)
    SMTP_HOST: str = "mailpit"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    # "starttls" (porta 587), "ssl" (porta 465) ou "nenhuma" (Mailpit)
    SMTP_SEGURANCA: str = "nenhuma"
    # Endereço que envia — precisa ser a conta autenticada no SMTP, senão o provedor recusa ou marca como spam
    SMTP_REMETENTE: str = "nao-responda@donabere.local"
    # Origens do frontend autorizadas a chamar a API, separadas por vírgula
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = {"env_file": ".env", "case_sensitive": True}


settings = Settings()

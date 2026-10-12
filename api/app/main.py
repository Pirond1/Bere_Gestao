import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import (
    agenda,
    auth,
    avaliacao,
    categoria,
    cliente,
    configuracao,
    endereco,
    pagamento,
    pedido,
    produto,
    relatorio,
    status_pedido,
    usuario,
)
from app.services import expiracao_service

logger = logging.getLogger(__name__)


async def _expirar_pagamentos_periodicamente() -> None:
    """Libera as vagas de pedidos não pagos dentro do prazo (BG-5)."""
    while True:
        await asyncio.sleep(expiracao_service.INTERVALO_SEGUNDOS)
        try:
            await asyncio.to_thread(expiracao_service.executar)
        except Exception:
            logger.exception("Falha na rotina de expiração de pagamentos")


@asynccontextmanager
async def lifespan(_: FastAPI):
    tarefa = asyncio.create_task(_expirar_pagamentos_periodicamente())
    yield
    tarefa.cancel()


app = FastAPI(title="Berê Gestão", version="1.0.0", lifespan=lifespan)

# O frontend (gui/) roda em outra origem e chama a API direto pelo navegador
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origem.strip() for origem in settings.CORS_ORIGINS.split(",") if origem.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(usuario.router)
app.include_router(cliente.router)
app.include_router(endereco.router)
app.include_router(categoria.router)
app.include_router(produto.router)
app.include_router(configuracao.router)
app.include_router(status_pedido.router)
app.include_router(agenda.router)
app.include_router(pedido.router)
app.include_router(pagamento.router)
app.include_router(avaliacao.router)
app.include_router(relatorio.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Berê Gestão API rodando"}
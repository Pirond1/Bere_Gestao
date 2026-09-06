from fastapi import FastAPI

from app.routers import (
    agenda,
    auth,
    avaliacao,
    categoria,
    cliente,
    configuracao,
    endereco,
    pedido,
    produto,
    status_pedido,
    usuario,
)

app = FastAPI(title="Berê Gestão", version="1.0.0")

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
app.include_router(avaliacao.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Berê Gestão API rodando"}
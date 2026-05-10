from fastapi import FastAPI

from app.routers import auth, categoria, cliente, endereco, produto, usuario

app = FastAPI(title="Berê Gestão", version="1.0.0")

app.include_router(auth.router)
app.include_router(usuario.router)
app.include_router(cliente.router)
app.include_router(endereco.router)
app.include_router(categoria.router)
app.include_router(produto.router)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Berê Gestão API rodando"}
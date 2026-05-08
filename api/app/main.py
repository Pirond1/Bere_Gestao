from fastapi import FastAPI

app = FastAPI(title="Berê Gestão", version="1.0.0")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Berê Gestão API rodando"}
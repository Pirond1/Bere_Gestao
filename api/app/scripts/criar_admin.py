"""Cria uma conta de administrador pelo terminal (BG-24).

Num banco novo (deploy) não existe nenhum admin, e `POST /usuarios` já exige um admin logado.
Uso: docker exec -it bere_api python -m app.scripts.criar_admin
"""
import getpass
import sys

from fastapi import HTTPException
from pydantic import TypeAdapter, EmailStr, ValidationError

import app.models  # noqa: F401 — registra todos os models (relationships por nome)
from app.db.session import SessionLocal
from app.models.tipo_usuario import TipoUsuarioModel
from app.schemas.usuario import UsuarioCreate
from app.services import senha_service, usuario_service


def _ler_email() -> str:
    while True:
        email = input("E-mail do administrador: ").strip().lower()
        try:
            return TypeAdapter(EmailStr).validate_python(email)
        except ValidationError:
            print("E-mail inválido, tente de novo.")


def _ler_senha(email: str) -> str:
    while True:
        senha = getpass.getpass("Senha: ")
        problema = senha_service.problema(senha, email=email)
        if problema:
            print(f"{problema}.")
            continue
        if getpass.getpass("Repita a senha: ") != senha:
            print("As senhas não conferem.")
            continue
        return senha


def main() -> int:
    email = _ler_email()
    senha = _ler_senha(email)

    db = SessionLocal()
    try:
        tipo_admin = db.query(TipoUsuarioModel).filter(TipoUsuarioModel.descricao == "admin").first()
        if tipo_admin is None:
            print("Tipo 'admin' não encontrado — rode as migrations antes (alembic upgrade head).")
            return 1
        usuario_service.criar(db, UsuarioCreate(email=email, senha=senha, tipo_id=tipo_admin.id))
    except HTTPException as erro:
        print(erro.detail)
        return 1
    finally:
        db.close()

    print(f"Administrador {email} criado. Entre pelo site com esse e-mail e senha.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

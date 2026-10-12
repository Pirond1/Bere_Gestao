from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import criar_token, hash_senha
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.auth import AlterarContaInput, RegistroInput


def registrar(db: Session, dados: RegistroInput) -> dict:
    if db.query(UsuarioModel).filter(UsuarioModel.email == dados.email).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="E-mail já cadastrado",
        )
    if db.query(ClienteModel).filter(ClienteModel.cpf == dados.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF já cadastrado",
        )

    usuario = UsuarioModel(
        email=dados.email,
        senha_hash=hash_senha(dados.senha),
        tipo_id=2,  # cliente
    )
    db.add(usuario)
    db.flush()  # gera o usuario.id sem commitar ainda

    cliente = ClienteModel(
        nome=dados.nome,
        cpf=dados.cpf,
        telefone=dados.telefone,
        data_nascimento=dados.data_nascimento,
        data_assinatura=date.today(),
        usuario_id=usuario.id,
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)

    token = criar_token({"sub": str(usuario.id), "tipo": "cliente"})
    return {"access_token": token, "token_type": "bearer", "cliente": cliente}


def alterar_conta(db: Session, usuario_atual: UsuarioModel, dados: AlterarContaInput) -> UsuarioModel:
    campos = dados.model_dump(exclude_unset=True)

    if "email" in campos:
        conflito = db.query(UsuarioModel).filter(
            UsuarioModel.email == campos["email"],
            UsuarioModel.id != usuario_atual.id,
        ).first()
        if conflito:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="E-mail já cadastrado",
            )
        usuario_atual.email = campos["email"]

    if "senha" in campos:
        usuario_atual.senha_hash = hash_senha(campos["senha"])

    # atualiza o perfil de cliente se existir
    campos_cliente = {k: campos[k] for k in ("nome", "telefone", "data_nascimento") if k in campos}
    if campos_cliente and usuario_atual.cliente:
        for campo, valor in campos_cliente.items():
            setattr(usuario_atual.cliente, campo, valor)

    db.commit()
    db.refresh(usuario_atual)
    return usuario_atual
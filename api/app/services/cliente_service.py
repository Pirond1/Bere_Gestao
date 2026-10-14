import re
from decimal import Decimal
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.tempo import hoje
from app.models.cliente import ClienteModel
from app.models.codigo_verificacao import CodigoVerificacaoModel
from app.models.endereco import EnderecoModel
from app.models.pedido import PedidoModel
from app.models.status_pedido import StatusPedidoModel
from app.models.usuario import UsuarioModel
from app.schemas.cliente import ClienteCreate, ClienteDetalheRead, ClienteUpdate
from app.services import status_pedido_service
from app.services.relatorio_service import foi_pago

# Pedido que ainda vai acontecer: excluir o cliente apagaria o contato de quem vai retirar
STATUS_EM_ABERTO = (status_pedido_service.AGUARDANDO_PAGAMENTO, *status_pedido_service.EM_ANDAMENTO)
# Nulo apaga; nos demais campos significa "não mudar"
CAMPOS_OPCIONAIS = {"telefone", "data_nascimento"}


def criar(db: Session, dados: ClienteCreate) -> ClienteModel:
    if db.query(ClienteModel).filter(ClienteModel.cpf == dados.cpf).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="CPF já cadastrado",
        )
    if db.query(ClienteModel).filter(ClienteModel.usuario_id == dados.usuario_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Usuário já possui um perfil de cliente",
        )
    cliente = ClienteModel(
        **dados.model_dump(),
        data_assinatura=hoje(),
    )
    db.add(cliente)
    db.commit()
    db.refresh(cliente)
    return cliente


def listar(db: Session, pagina: int = 1, limite: int = 20) -> list[ClienteModel]:
    offset = (pagina - 1) * limite
    return db.query(ClienteModel).offset(offset).limit(limite).all()


def _subquery_resumo(db: Session):
    """Pedidos pagos por cliente — mesma regra de venda dos relatórios (BG-6)."""
    return (
        db.query(
            PedidoModel.cliente_id.label("cliente_id"),
            func.count(PedidoModel.id).label("pedidos_pagos"),
            func.coalesce(func.sum(PedidoModel.valor_total), 0).label("total_gasto"),
            func.max(PedidoModel.data_pedido).label("ultimo_pedido"),
        )
        .filter(foi_pago())
        .group_by(PedidoModel.cliente_id)
        .subquery()
    )


def listar_painel(db: Session, busca: Optional[str], pagina: int, limite: int) -> dict:
    """Clientes ativos para o painel, por nome. Busca por nome, e-mail, CPF ou telefone."""
    resumo = _subquery_resumo(db)
    query = (
        db.query(ClienteModel, UsuarioModel.email, resumo.c.pedidos_pagos, resumo.c.total_gasto, resumo.c.ultimo_pedido)
        .join(UsuarioModel, ClienteModel.usuario_id == UsuarioModel.id)
        .outerjoin(resumo, resumo.c.cliente_id == ClienteModel.id)
        # Contas excluídas (anonimizadas) não aparecem
        .filter(UsuarioModel.ativo.is_(True))
    )
    termo = (busca or "").strip()
    if termo:
        condicoes = [ClienteModel.nome.ilike(f"%{termo}%"), UsuarioModel.email.ilike(f"%{termo}%")]
        digitos = re.sub(r"\D", "", termo)
        if len(digitos) >= 3:
            condicoes += [ClienteModel.cpf.like(f"%{digitos}%"), ClienteModel.telefone.like(f"%{digitos}%")]
        query = query.filter(or_(*condicoes))

    total = query.count()
    linhas = (
        query.order_by(ClienteModel.nome, ClienteModel.id).offset((pagina - 1) * limite).limit(limite).all()
    )
    itens = [
        {
            "id": cliente.id,
            "nome": cliente.nome,
            "email": email,
            "cpf": cliente.cpf,
            "telefone": cliente.telefone,
            "data_assinatura": cliente.data_assinatura,
            "pedidos_pagos": pedidos or 0,
            "total_gasto": Decimal(total_gasto or 0),
            "ultimo_pedido": ultimo,
        }
        for cliente, email, pedidos, total_gasto, ultimo in linhas
    ]
    return {"itens": itens, "total": total, "pagina": pagina, "limite": limite}


def buscar_por_id(db: Session, cliente_id: int) -> ClienteModel:
    cliente = db.query(ClienteModel).filter(ClienteModel.id == cliente_id).first()
    if not cliente:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Cliente não encontrado",
        )
    return cliente


def detalhe_painel(db: Session, cliente_id: int) -> ClienteDetalheRead:
    """Ficha completa para o painel: cadastro, endereço, resumo de compras e todos os pedidos."""
    cliente = buscar_por_id(db, cliente_id)
    resumo = _subquery_resumo(db)
    pedidos_pagos, total_gasto, ultimo = (
        db.query(resumo.c.pedidos_pagos, resumo.c.total_gasto, resumo.c.ultimo_pedido)
        .filter(resumo.c.cliente_id == cliente.id)
        .first()
    ) or (0, 0, None)
    ficha = ClienteDetalheRead.model_validate(cliente)
    return ficha.model_copy(
        update={
            "pedidos_pagos": pedidos_pagos,
            "total_gasto": Decimal(total_gasto),
            "ultimo_pedido": ultimo,
            # Mais recentes primeiro
            "pedidos": sorted(ficha.pedidos, key=lambda p: p.data_pedido, reverse=True),
        }
    )


def atualizar(db: Session, cliente_id: int, dados: ClienteUpdate) -> ClienteModel:
    cliente = buscar_por_id(db, cliente_id)
    campos = dados.model_dump(exclude_unset=True)
    if campos.get("cpf") and campos["cpf"] != cliente.cpf:
        conflito = db.query(ClienteModel).filter(
            ClienteModel.cpf == campos["cpf"], ClienteModel.id != cliente.id
        ).first()
        if conflito:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CPF já cadastrado em outra conta",
            )
    for campo, valor in campos.items():
        if valor is None and campo not in CAMPOS_OPCIONAIS:
            continue
        setattr(cliente, campo, valor)
    db.commit()
    db.refresh(cliente)
    return cliente


def deletar(db: Session, cliente_id: int) -> None:
    """Exclusão da conta (LGPD): anonimiza os dados pessoais e bloqueia o acesso.

    Pedidos e avaliações ficam no histórico (são da loja e entram nos relatórios), mas sem
    identificar a pessoa. Bloqueado enquanto houver pedido em andamento.
    """
    cliente = buscar_por_id(db, cliente_id)
    em_aberto = (
        db.query(PedidoModel)
        .join(StatusPedidoModel)
        .filter(PedidoModel.cliente_id == cliente.id, StatusPedidoModel.descricao.in_(STATUS_EM_ABERTO))
        .count()
    )
    if em_aberto:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Este cliente tem {em_aberto} pedido(s) em andamento — "
                "conclua ou cancele antes de excluir a conta"
            ),
        )

    usuario = cliente.usuario
    email_original = usuario.email
    # Libera e-mail e CPF para um novo cadastro
    usuario.email = f"deletado_{usuario.id}@removido.com"
    usuario.ativo = False
    cliente.nome = "Conta removida"
    cliente.cpf = f"DEL_{cliente.id}"
    cliente.telefone = None
    cliente.data_nascimento = None
    db.query(EnderecoModel).filter(EnderecoModel.cliente_id == cliente.id).delete()
    # Códigos pendentes também guardavam o e-mail
    db.query(CodigoVerificacaoModel).filter(
        or_(CodigoVerificacaoModel.usuario_id == usuario.id, CodigoVerificacaoModel.email == email_original)
    ).delete(synchronize_session=False)
    db.commit()

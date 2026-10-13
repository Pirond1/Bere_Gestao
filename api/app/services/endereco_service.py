import logging
import unicodedata
from typing import Optional

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.cliente import ClienteModel
from app.models.endereco import EnderecoModel
from app.schemas.endereco import CepRead, EnderecoCreate, EnderecoUpdate
from app.services import cliente_service

logger = logging.getLogger(__name__)

VIACEP_URL = "https://viacep.com.br/ws/{cep}/json/"
VIACEP_TIMEOUT_SEGUNDOS = 5


class ViaCepIndisponivel(Exception):
    """O ViaCEP não respondeu — o cadastro segue sem a consulta."""


def _consultar_viacep(cep: str) -> Optional[CepRead]:
    """Busca o CEP (só dígitos) no ViaCEP. None = CEP não existe."""
    try:
        resposta = httpx.get(VIACEP_URL.format(cep=cep), timeout=VIACEP_TIMEOUT_SEGUNDOS)
        resposta.raise_for_status()
        dados = resposta.json()
    except (httpx.HTTPError, ValueError) as erro:
        logger.warning("ViaCEP indisponível para %s: %s", cep, erro)
        raise ViaCepIndisponivel from erro
    # CEP com formato válido mas inexistente volta 200 com {"erro": "true"}
    if dados.get("erro"):
        return None
    return CepRead(
        cep=cep,
        rua=dados.get("logradouro") or None,
        bairro=dados.get("bairro") or None,
        cidade=dados["localidade"],
        uf=dados["uf"],
    )


def completar_cep(cep: str) -> CepRead:
    """CompleteCEP do diagrama: endereço do CEP para preencher o formulário (RF_B01)."""
    try:
        encontrado = _consultar_viacep(cep)
    except ViaCepIndisponivel:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível consultar o CEP agora — preencha o endereço manualmente",
        )
    if not encontrado:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CEP não encontrado")
    return encontrado


def _normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return " ".join(sem_acento.lower().split())


def validar_com_cep(dados: EnderecoCreate) -> Optional[CepRead]:
    """Confere cidade e UF com o CEP (RF_B01 — "completar e validar").

    Rua e bairro não são conferidos: mudam de grafia e CEPs gerais de cidade não os têm.
    Se o ViaCEP estiver fora do ar, não impede o cadastro (devolve None).
    """
    try:
        encontrado = _consultar_viacep(dados.cep)
    except ViaCepIndisponivel:
        return None
    if not encontrado:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="CEP não encontrado")
    if dados.uf != encontrado.uf or _normalizar(dados.cidade) != _normalizar(encontrado.cidade):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Este CEP é de {encontrado.cidade}/{encontrado.uf} — confira a cidade e a UF",
        )
    return encontrado


def salvar_do_cliente(db: Session, cliente: ClienteModel, dados: EnderecoCreate) -> EnderecoModel:
    """Cadastra ou atualiza o endereço do cliente — a loja é só de retirada, então é um por cliente."""
    oficial = validar_com_cep(dados)
    if oficial:
        # Grava a grafia oficial ("presidente prudente" → "Presidente Prudente")
        dados = dados.model_copy(update={"cidade": oficial.cidade})
    endereco = (
        db.query(EnderecoModel)
        .filter(EnderecoModel.cliente_id == cliente.id)
        .order_by(EnderecoModel.id)
        .first()
    )
    if endereco is None:
        endereco = EnderecoModel(cliente_id=cliente.id)
        db.add(endereco)
    for campo, valor in dados.model_dump().items():
        setattr(endereco, campo, valor)
    db.commit()
    db.refresh(endereco)
    return endereco


def criar(db: Session, cliente_id: int, dados: EnderecoCreate) -> EnderecoModel:
    cliente_service.buscar_por_id(db, cliente_id)  # garante que o cliente existe
    endereco = EnderecoModel(**dados.model_dump(), cliente_id=cliente_id)
    db.add(endereco)
    db.commit()
    db.refresh(endereco)
    return endereco


def listar(db: Session, cliente_id: int) -> list[EnderecoModel]:
    cliente_service.buscar_por_id(db, cliente_id)
    return db.query(EnderecoModel).filter(EnderecoModel.cliente_id == cliente_id).all()


def buscar_por_id(db: Session, cliente_id: int, endereco_id: int) -> EnderecoModel:
    endereco = (
        db.query(EnderecoModel)
        .filter(EnderecoModel.id == endereco_id, EnderecoModel.cliente_id == cliente_id)
        .first()
    )
    if not endereco:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Endereço não encontrado",
        )
    return endereco


def atualizar(db: Session, cliente_id: int, endereco_id: int, dados: EnderecoUpdate) -> EnderecoModel:
    endereco = buscar_por_id(db, cliente_id, endereco_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(endereco, campo, valor)
    db.commit()
    db.refresh(endereco)
    return endereco


def deletar(db: Session, cliente_id: int, endereco_id: int) -> None:
    endereco = buscar_por_id(db, cliente_id, endereco_id)
    db.delete(endereco)
    db.commit()
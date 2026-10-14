from fastapi import APIRouter, Depends, Path, status
from sqlalchemy.orm import Session

from app.core.deps import get_usuario_atual, verificar_acesso_cliente
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.endereco import CepRead, EnderecoCreate, EnderecoRead, EnderecoUpdate
from app.services import cliente_service, endereco_service

router = APIRouter(prefix="/clientes/{cliente_id}/enderecos", tags=["Endereços"])
cep_router = APIRouter(prefix="/enderecos", tags=["Endereços"])


@cep_router.get("/cep/{cep}", response_model=CepRead)
def consultar_cep(cep: str = Path(pattern=r"^\d{5}-?\d{3}$")):
    """Rua, bairro, cidade e UF do CEP, pelo ViaCEP — preenche o formulário de endereço."""
    return endereco_service.completar_cep(cep.replace("-", ""))


@router.post("/", response_model=EnderecoRead, status_code=status.HTTP_201_CREATED)
def criar_endereco(
    cliente_id: int,
    dados: EnderecoCreate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    return endereco_service.criar(db, cliente_id, dados)


@router.get("/", response_model=list[EnderecoRead])
def listar_enderecos(
    cliente_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    return endereco_service.listar(db, cliente_id)


@router.get("/{endereco_id}", response_model=EnderecoRead)
def buscar_endereco(
    cliente_id: int,
    endereco_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    return endereco_service.buscar_por_id(db, cliente_id, endereco_id)


@router.put("/{endereco_id}", response_model=EnderecoRead)
def atualizar_endereco(
    cliente_id: int,
    endereco_id: int,
    dados: EnderecoUpdate,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    return endereco_service.atualizar(db, cliente_id, endereco_id, dados)


@router.delete("/{endereco_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_endereco(
    cliente_id: int,
    endereco_id: int,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    cliente = cliente_service.buscar_por_id(db, cliente_id)
    verificar_acesso_cliente(usuario_atual, cliente)
    endereco_service.deletar(db, cliente_id, endereco_id)
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_cliente_atual, get_usuario_atual
from app.core.security import criar_token
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.auth import (
    AlterarContaInput,
    AlterarContaRead,
    LoginInput,
    MeRead,
    RegistroInput,
    RegistroRead,
    TokenResponse,
)
from app.schemas.endereco import EnderecoCreate, EnderecoRead
from app.services import auth_service, endereco_service, usuario_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/registrar", response_model=RegistroRead, status_code=status.HTTP_201_CREATED)
def registrar(dados: RegistroInput, db: Session = Depends(get_db)):
    return auth_service.registrar(db, dados)


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginInput, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar(db, dados.email, dados.senha)
    token = criar_token({"sub": str(usuario.id), "tipo": usuario.tipoUsuario.descricao})
    return TokenResponse(access_token=token)


@router.get("/me", response_model=MeRead)
def dados_da_conta(usuario_atual: UsuarioModel = Depends(get_usuario_atual)):
    """Dados mínimos da conta logada — o token só carrega o id e o perfil."""
    return MeRead(
        email=usuario_atual.email,
        nome=usuario_atual.cliente.nome if usuario_atual.cliente else None,
    )


@router.get("/perfil", response_model=AlterarContaRead)
def perfil(usuario_atual: UsuarioModel = Depends(get_usuario_atual)):
    """Dados completos da conta para a tela Minha conta (e-mail, cadastro e endereço)."""
    return usuario_atual


@router.put("/perfil/endereco", response_model=EnderecoRead)
def salvar_endereco(
    dados: EnderecoCreate,
    db: Session = Depends(get_db),
    cliente_atual: ClienteModel = Depends(get_cliente_atual),
):
    """Cadastra ou atualiza o endereço do cliente logado. Cidade e UF são conferidas com o CEP."""
    return endereco_service.salvar_do_cliente(db, cliente_atual, dados)


@router.put("/alterar", response_model=AlterarContaRead)
def alterar_conta(
    dados: AlterarContaInput,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Altera dados da conta. E-mail e senha exigem `senha_atual`."""
    return auth_service.alterar_conta(db, usuario_atual, dados)
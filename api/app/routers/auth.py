from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_cliente_atual, get_usuario_atual
from app.core.security import token_do_usuario
from app.db.session import get_db
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.schemas.auth import (
    AlterarContaInput,
    AlterarContaRead,
    CodigoEnviadoRead,
    ConfirmarCadastroInput,
    ConfirmarCodigoInput,
    LoginInput,
    MensagemRead,
    MeRead,
    RedefinirSenhaInput,
    RegistroInput,
    RegistroRead,
    ReenviarCodigoInput,
    SolicitarTrocaEmailInput,
    TokenResponse,
)
from app.schemas.endereco import EnderecoCreate, EnderecoRead
from app.services import auth_service, email_service, endereco_service, usuario_service

router = APIRouter(prefix="/auth", tags=["Autenticação"])


@router.post("/registrar", response_model=CodigoEnviadoRead, status_code=status.HTTP_202_ACCEPTED)
def registrar(dados: RegistroInput, db: Session = Depends(get_db)):
    """1ª etapa do cadastro: valida os dados e envia o código para o e-mail. A conta ainda não existe."""
    return auth_service.iniciar_cadastro(db, dados)


@router.post("/registrar/reenviar", response_model=CodigoEnviadoRead, status_code=status.HTTP_202_ACCEPTED)
def reenviar_codigo_cadastro(dados: ReenviarCodigoInput, db: Session = Depends(get_db)):
    return auth_service.reenviar_cadastro(db, dados.email)


@router.post("/registrar/confirmar", response_model=RegistroRead, status_code=status.HTTP_201_CREATED)
def confirmar_cadastro(dados: ConfirmarCadastroInput, db: Session = Depends(get_db)):
    """2ª etapa: com o código certo, cria a conta e já entra."""
    return auth_service.confirmar_cadastro(db, dados.email, dados.codigo)


@router.post("/senha/esqueci", response_model=MensagemRead, status_code=status.HTTP_202_ACCEPTED)
def esqueci_senha(dados: ReenviarCodigoInput, tarefas: BackgroundTasks, db: Session = Depends(get_db)):
    """Envia o código de redefinição. Responde igual exista ou não a conta (não revela e-mails cadastrados)."""
    envio = auth_service.solicitar_recuperacao(db, dados.email)
    # Em segundo plano: o tempo de resposta também não denuncia se a conta existe
    if envio:
        tarefas.add_task(email_service.enviar_em_segundo_plano, *envio)
    return {"mensagem": auth_service.MENSAGEM_RECUPERACAO}


@router.post("/senha/redefinir", response_model=MensagemRead)
def redefinir_senha(dados: RedefinirSenhaInput, db: Session = Depends(get_db)):
    auth_service.redefinir_senha(db, dados.email, dados.codigo, dados.nova_senha)
    return {"mensagem": "Senha redefinida. Entre com a nova senha."}


@router.post("/login", response_model=TokenResponse)
def login(dados: LoginInput, db: Session = Depends(get_db)):
    usuario = usuario_service.autenticar(db, dados.email, dados.senha)
    return TokenResponse(access_token=token_do_usuario(usuario))


@router.post("/renovar", response_model=TokenResponse)
def renovar_sessao(usuario_atual: UsuarioModel = Depends(get_usuario_atual)):
    """Token novo para quem está usando o sistema — a sessão só cai depois de um tempo parada."""
    return TokenResponse(access_token=token_do_usuario(usuario_atual))


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


@router.post("/email/solicitar", response_model=CodigoEnviadoRead, status_code=status.HTTP_202_ACCEPTED)
def solicitar_troca_email(
    dados: SolicitarTrocaEmailInput,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Confere a senha atual e envia um código para o novo e-mail. Só troca depois do código."""
    return auth_service.solicitar_troca_email(db, usuario_atual, dados.novo_email, dados.senha_atual)


@router.post("/email/confirmar", response_model=AlterarContaRead)
def confirmar_troca_email(
    dados: ConfirmarCodigoInput,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    return auth_service.confirmar_troca_email(db, usuario_atual, dados.codigo)


@router.put("/alterar", response_model=AlterarContaRead)
def alterar_conta(
    dados: AlterarContaInput,
    db: Session = Depends(get_db),
    usuario_atual: UsuarioModel = Depends(get_usuario_atual),
):
    """Altera dados da conta. Senha e CPF exigem `senha_atual`; o e-mail muda por /auth/email/..."""
    usuario, novo_token = auth_service.alterar_conta(db, usuario_atual, dados)
    resposta = AlterarContaRead.model_validate(usuario)
    resposta.access_token = novo_token
    return resposta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.models.usuario import UsuarioModel
from app.schemas.auth import MensagemRead
from app.schemas.configuracao import ConfiguracaoPublicaRead, ConfiguracaoRead, ConfiguracaoUpdate
from app.services import configuracao_service, email_service

router = APIRouter(prefix="/configuracoes", tags=["Configurações"])


@router.get("/", response_model=ConfiguracaoRead)
def buscar_configuracao(db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return configuracao_service.obter(db)


@router.get("/publica", response_model=ConfiguracaoPublicaRead)
def buscar_configuracao_publica(db: Session = Depends(get_db)):
    """Parâmetros que o cliente vê no checkout (ex.: prazo para pagar)."""
    return configuracao_service.obter(db)


@router.put("/", response_model=ConfiguracaoRead)
def atualizar_configuracao(
    dados: ConfiguracaoUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return configuracao_service.atualizar(db, dados)

@router.post("/email-teste", response_model=MensagemRead)
def enviar_email_teste(db: Session = Depends(get_db), admin: UsuarioModel = Depends(get_admin_atual)):
    """Manda um e-mail para o próprio admin — confere SMTP, nome do remetente e e-mail de resposta."""
    origem = email_service.remetente(db)
    mensagem = email_service.montar(
        "E-mail de teste — Dona Berê Doces",
        "Tudo certo com o envio de e-mails",
        [
            "Se você está lendo isto, a loja consegue enviar e-mails: códigos de cadastro, "
            "recuperação de senha e avisos.",
            f"Remetente: {origem.nome}. Respostas vão para: {origem.responder_para or 'o próprio endereço de envio'}.",
        ],
    )
    email_service.enviar_ou_erro(admin.email, mensagem, origem)
    return {"mensagem": f"E-mail de teste enviado para {admin.email}"}

"""Envio de e-mails pela loja (BG-15).

As credenciais do SMTP ficam no .env; o nome do remetente e o e-mail para respostas
vêm de `configuracoes`, editáveis pela proprietária no painel.
"""

import html
import logging
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services import configuracao_service

logger = logging.getLogger(__name__)

TIMEOUT_SEGUNDOS = 10

# Paleta da marca (gui/src/index.css)
CHOCOLATE = "#3e2723"
DOURADO = "#c4aa41"
BAUNILHA = "#fdf5e6"
CINZA = "#6d5f54"


class EmailIndisponivel(Exception):
    """O servidor de e-mail recusou ou não respondeu."""


@dataclass(frozen=True)
class Remetente:
    nome: str
    responder_para: Optional[str]


@dataclass(frozen=True)
class Mensagem:
    assunto: str
    html: str
    texto: str


def remetente(db: Session) -> Remetente:
    """Lido antes de enviar em segundo plano, quando a sessão do banco já terá fechado."""
    configuracao = configuracao_service.obter(db)
    return Remetente(configuracao.email_remetente_nome, configuracao.email_resposta)


def montar(assunto: str, titulo: str, paragrafos: list[str], codigo: Optional[str] = None) -> Mensagem:
    """E-mail na identidade da loja, com versão em texto puro para quem não abre HTML."""
    corpo = "".join(
        f'<p style="margin:0 0 16px;line-height:1.5">{html.escape(p)}</p>' for p in paragrafos
    )
    bloco_codigo = (
        f'<p style="margin:8px 0 24px;text-align:center">'
        f'<span style="display:inline-block;padding:14px 22px;border:2px solid {DOURADO};border-radius:10px;'
        f'font-size:32px;letter-spacing:8px;font-weight:bold;font-family:monospace;color:{CHOCOLATE}">'
        f"{html.escape(codigo)}</span></p>"
        if codigo
        else ""
    )
    conteudo_html = f"""<!doctype html>
<html lang="pt-BR"><body style="margin:0;padding:24px 12px;background:{BAUNILHA};font-family:Arial,Helvetica,sans-serif;color:{CHOCOLATE}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:{CHOCOLATE};padding:20px 24px;color:{DOURADO};font-size:20px;font-family:Georgia,serif">Dona Berê Doces</td></tr>
<tr><td style="padding:28px 24px 8px">
<h1 style="margin:0 0 16px;font-size:22px;font-family:Georgia,serif">{html.escape(titulo)}</h1>
{corpo}{bloco_codigo}
</td></tr>
<tr><td style="padding:16px 24px 24px;font-size:12px;color:{CINZA};border-top:1px solid #eee">
Você recebeu este e-mail porque ele foi usado na loja Dona Berê Doces. Se não foi você, pode ignorá-lo.
</td></tr>
</table></td></tr></table></body></html>"""

    linhas = [titulo, "", *paragrafos]
    if codigo:
        linhas += ["", f"Código: {codigo}"]
    linhas += ["", "—", "Dona Berê Doces"]
    return Mensagem(assunto, conteudo_html, "\n".join(linhas))


def enviar(destino: str, mensagem: Mensagem, origem: Remetente) -> None:
    """Envia pelo SMTP do .env. Levanta EmailIndisponivel se o servidor falhar."""
    email = EmailMessage()
    email["Subject"] = mensagem.assunto
    email["From"] = formataddr((origem.nome, settings.SMTP_REMETENTE))
    email["To"] = destino
    if origem.responder_para:
        email["Reply-To"] = origem.responder_para
    email.set_content(mensagem.texto)
    email.add_alternative(mensagem.html, subtype="html")

    try:
        if settings.SMTP_SEGURANCA == "ssl":
            servidor = smtplib.SMTP_SSL(
                settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SEGUNDOS,
                context=ssl.create_default_context(),
            )
        else:
            servidor = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=TIMEOUT_SEGUNDOS)
        with servidor:
            if settings.SMTP_SEGURANCA == "starttls":
                servidor.starttls(context=ssl.create_default_context())
            if settings.SMTP_USER:
                servidor.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            servidor.send_message(email)
    except (smtplib.SMTPException, OSError) as erro:
        logger.error("Falha ao enviar e-mail para %s: %s", destino, erro)
        raise EmailIndisponivel from erro


def enviar_ou_erro(destino: str, mensagem: Mensagem, origem: Remetente) -> None:
    """Para quando a pessoa está esperando o e-mail na tela: falha vira mensagem para ela."""
    try:
        enviar(destino, mensagem, origem)
    except EmailIndisponivel:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Não foi possível enviar o e-mail agora — tente novamente em instantes",
        )


def enviar_em_segundo_plano(destino: str, mensagem: Mensagem, origem: Remetente) -> None:
    """Para BackgroundTasks: a resposta já foi enviada, então a falha só fica no log."""
    try:
        enviar(destino, mensagem, origem)
    except EmailIndisponivel:
        pass

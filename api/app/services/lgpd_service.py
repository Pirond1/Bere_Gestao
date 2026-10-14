"""LGPD (BG-20): aceite da Política de Privacidade e direitos do titular (art. 18)."""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import verificar_senha
from app.core.tempo import hoje
from app.models.cliente import ClienteModel
from app.models.usuario import UsuarioModel
from app.services import cliente_service, codigo_service, email_service

# Mude junto com o texto de gui/src/pages/Privacidade.jsx: quem aceitou a versão antiga aceita de novo
TERMOS_VERSAO = "2026-10"


def termos_pendentes(cliente: Optional[ClienteModel]) -> bool:
    return cliente is not None and cliente.termos_versao != TERMOS_VERSAO


def registrar_aceite(cliente: ClienteModel) -> None:
    """Prova do consentimento (art. 6º, X): quando e qual versão. Não faz commit."""
    cliente.termos_aceitos_em = codigo_service.agora()
    cliente.termos_versao = TERMOS_VERSAO


def aceitar(db: Session, cliente: ClienteModel) -> None:
    registrar_aceite(cliente)
    db.commit()


def exigir_aceite(cliente: ClienteModel) -> None:
    """Pedido só depois de aceitar a política vigente (contas antigas aceitam ao entrar)."""
    if termos_pendentes(cliente):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Aceite a Política de Privacidade e os Termos de Uso para fazer pedidos",
        )


def exportar(cliente: ClienteModel) -> dict:
    """Acesso e portabilidade (art. 18, II e V): tudo o que a loja guarda sobre a pessoa."""
    endereco = cliente.enderecos[0] if cliente.enderecos else None
    pedidos = sorted(cliente.pedidos, key=lambda p: p.data_pedido, reverse=True)
    return {
        "gerado_em": hoje().isoformat(),
        "controlador": "Dona Berê Doces",
        "conta": {
            "email": cliente.usuario.email,
            "cliente_desde": cliente.data_assinatura.isoformat() if cliente.data_assinatura else None,
        },
        "cadastro": {
            "nome": cliente.nome,
            "cpf": cliente.cpf,
            "telefone": cliente.telefone,
            "data_nascimento": cliente.data_nascimento.isoformat() if cliente.data_nascimento else None,
        },
        "endereco": (
            {
                "cep": endereco.cep,
                "rua": endereco.rua,
                "numero": endereco.numero,
                "complemento": endereco.complemento,
                "bairro": endereco.bairro,
                "cidade": endereco.cidade,
                "uf": endereco.uf,
            }
            if endereco
            else None
        ),
        "aceite_termos": {
            "versao": cliente.termos_versao,
            "aceito_em_utc": cliente.termos_aceitos_em.isoformat() if cliente.termos_aceitos_em else None,
        },
        "pedidos": [
            {
                "numero": p.id,
                "feito_em_utc": p.data_pedido.isoformat(),
                "retirada": p.agenda.data.isoformat(),
                "status": p.status.descricao,
                "valor_total": str(p.valor_total),
                "observacoes": p.observacoes,
                "itens": [
                    {
                        "produto": i.produto.nome,
                        "quantidade": i.quantidade,
                        "preco_unitario": str(i.preco_unitario),
                        "subtotal": str(i.subtotal),
                    }
                    for i in p.itens
                ],
                "pagamentos": [
                    {
                        "metodo": pg.metodo.descricao,
                        "status": pg.status.descricao,
                        "valor": str(pg.valor),
                        "data_utc": pg.data_hora.isoformat(),
                    }
                    for pg in p.pagamentos
                ],
                "avaliacao": (
                    {"nota": p.avaliacao.nota, "comentario": p.avaliacao.comentario}
                    if p.avaliacao
                    else None
                ),
            }
            for p in pedidos
        ],
    }


def excluir_propria_conta(db: Session, usuario: UsuarioModel, senha_atual: str) -> Optional[tuple]:
    """Eliminação pelo próprio titular (art. 18, VI). Devolve o e-mail de confirmação a enviar.

    Mesmas regras da exclusão pelo painel: anonimiza e bloqueia com pedido em andamento.
    """
    if not senha_atual or not verificar_senha(senha_atual, usuario.senha_hash):
        # 400 e não 401: o frontend trata 401 como sessão expirada
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Senha atual incorreta")
    cliente = usuario.cliente
    if cliente is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Ação disponível apenas para clientes")

    # Guardados antes: a anonimização apaga nome e e-mail
    destino = usuario.email
    primeiro_nome = cliente.nome.split()[0]
    origem = email_service.remetente(db)
    cliente_service.deletar(db, cliente.id)

    mensagem = email_service.montar(
        "Sua conta foi excluída — Dona Berê Doces",
        "Sua conta foi excluída",
        [
            f"Olá, {primeiro_nome}. Como você pediu, sua conta na Dona Berê Doces foi excluída.",
            "Apagamos seu nome, CPF, telefone, data de nascimento e endereço. Os pedidos já feitos "
            "continuam no histórico da loja, sem identificar você, porque fazem parte da contabilidade.",
            "Você pode criar uma nova conta quando quiser. Obrigado por ter comprado com a gente!",
        ],
    )
    return destino, mensagem, origem

"""Base dos testes automatizados (BG-22).

- Banco SQLite em memória, recriado a cada teste: nunca toca no MySQL com os dados reais.
- Mercado Pago simulado (FakeMercadoPago): o teste decide se a order foi paga, recusada, etc.
- E-mails capturados numa lista em vez de enviados.
Rodar: docker exec bere_api pytest
"""

from datetime import date
from decimal import Decimal
from itertools import count

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401 — registra todos os models no metadata
from app.core.security import hash_senha, token_do_usuario
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.categoria import CategoriaModel
from app.models.cliente import ClienteModel
from app.models.configuracao import ConfiguracaoModel
from app.models.metodo_pagamento import MetodoPagamentoModel
from app.models.produto import ProdutoModel
from app.models.status_pagamento import StatusPagamentoModel
from app.models.status_pedido import StatusPedidoModel
from app.models.tipo_usuario import TipoUsuarioModel
from app.models.usuario import UsuarioModel
from app.services import email_service, lgpd_service
from app.services import mercadopago_service as mp

from apoio import CAPACIDADE_PADRAO, SENHA, auth, gerar_cpf



# --- Banco isolado ---------------------------------------------------------------

@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(engine)
    sessao = sessionmaker(bind=engine, autoflush=False)()

    # Mesmos dados das migrations de seed (a ordem importa: cliente é tipo_id=2)
    sessao.add_all([TipoUsuarioModel(descricao="admin"), TipoUsuarioModel(descricao="cliente")])
    sessao.add_all(StatusPedidoModel(descricao=d) for d in (
        "aguardando_pagamento", "confirmado", "em_producao", "pronto", "entregue", "cancelado",
    ))
    sessao.add_all(MetodoPagamentoModel(descricao=d) for d in ("pix", "cartao_credito"))
    sessao.add_all(StatusPagamentoModel(descricao=d) for d in (
        "pendente", "aprovado", "recusado", "cancelado", "expirado", "estornado",
    ))
    sessao.add(ConfiguracaoModel(
        capacidade_produtiva_padrao=CAPACIDADE_PADRAO,
        antecedencia_minima_dias=1,
        prazo_pagamento_minutos=30,
        dias_fechados=[],
        email_remetente_nome="Dona Berê Doces",
    ))
    categoria = CategoriaModel(nome="Bolos")
    sessao.add(categoria)
    sessao.flush()
    sessao.add(ProdutoModel(
        nome="Bolo de cenoura", descricao="Com cobertura de chocolate", preco=Decimal("45.50"),
        foto="/uploads/produtos/bolo.webp", disponivel=True, categoria_id=categoria.id,
    ))
    sessao.commit()

    yield sessao

    sessao.close()
    engine.dispose()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    # Sem "with": não sobe a rotina periódica de expiração (os testes a chamam direto)
    yield TestClient(app)
    app.dependency_overrides.clear()


# --- Serviços externos simulados -------------------------------------------------

class FakeMercadoPago:
    """Orders em memória. `pagar(id)` simula o cliente pagando; `estornos` registra devoluções."""

    def __init__(self):
        self.orders: dict[str, str] = {}
        self.estornos: list[str] = []
        self._ids = count(1)

    def _order(self, order_id: str) -> dict:
        status = self.orders[order_id]
        return {
            "id": order_id,
            "status": status,
            "status_detail": status,
            "transactions": {"payments": [{
                "id": f"PAY-{order_id}",
                "status": status,
                "status_detail": status,
                "payment_method": {
                    "id": "pix", "type": "bank_transfer",
                    "qr_code": "00020126-PIX-TESTE", "qr_code_base64": "QUJD", "ticket_url": "https://pix.teste",
                },
            }]},
        }

    def criar_order(self, dados, chave):
        order_id = f"ORD-{next(self._ids)}"
        self.orders[order_id] = mp.ORDER_ACAO_NECESSARIA
        return self._order(order_id)

    def buscar_order(self, order_id):
        return self._order(order_id)

    def cancelar_order(self, order_id):
        self.orders[order_id] = mp.ORDER_CANCELADA
        return self._order(order_id)

    def estornar_order(self, order_id):
        self.orders[order_id] = mp.ORDER_ESTORNADA
        self.estornos.append(order_id)
        return self._order(order_id)

    def pagar(self, order_id):
        self.orders[order_id] = mp.ORDER_PROCESSADA


@pytest.fixture(autouse=True)
def gateway(monkeypatch):
    fake = FakeMercadoPago()
    for nome in ("criar_order", "buscar_order", "cancelar_order", "estornar_order"):
        monkeypatch.setattr(mp, nome, getattr(fake, nome))
    # Assinatura do webhook: válida só com o cabeçalho de teste
    monkeypatch.setattr(mp, "assinatura_valida", lambda assinatura, *_: assinatura == "assinatura-ok")
    return fake


@pytest.fixture(autouse=True)
def emails(monkeypatch):
    """E-mails "enviados" durante o teste: [(destino, mensagem)]."""
    caixa = []
    monkeypatch.setattr(email_service, "enviar", lambda destino, mensagem, origem: caixa.append((destino, mensagem)))
    return caixa



# --- Pessoas e dados de apoio ----------------------------------------------------


@pytest.fixture
def admin(db):
    usuario = UsuarioModel(email="dona@example.com", senha_hash=hash_senha(SENHA), tipo_id=1)
    db.add(usuario)
    db.commit()
    return auth(token_do_usuario(usuario))


@pytest.fixture
def novo_cliente(db):
    """Fábrica de clientes já com a política aceita. Devolve (cabeçalho de auth, ClienteModel)."""

    def criar(email=None, aceitou_termos=True):
        n = len(db.query(UsuarioModel).all()) + 1
        usuario = UsuarioModel(email=email or f"cliente{n}@example.com", senha_hash=hash_senha(SENHA), tipo_id=2)
        db.add(usuario)
        db.flush()
        cliente = ClienteModel(
            nome=f"Cliente {n}", cpf=gerar_cpf(), telefone="18999990000",
            usuario_id=usuario.id, data_assinatura=date.today(),
        )
        if aceitou_termos:
            lgpd_service.registrar_aceite(cliente)
        db.add(cliente)
        db.commit()
        return auth(token_do_usuario(usuario)), cliente

    return criar


@pytest.fixture
def cliente(novo_cliente):
    return novo_cliente()[0]

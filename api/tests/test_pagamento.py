"""RF_F02 — pagamento (PIX/cartão via Mercado Pago), confirmação, estorno e expiração do PIX."""

from datetime import timedelta

from app.models.pagamento import PagamentoModel
from app.models.pedido import PedidoModel
from app.services import codigo_service, expiracao_service

from apoio import CAPACIDADE_PADRAO, fazer_pedido, pagar_com_pix


def status_pedido(client, headers, pedido_id):
    return client.get(f"/pedidos/{pedido_id}", headers=headers).json()["status"]["descricao"]


def test_pix_aprovado_confirma_o_pedido(client, gateway, cliente):
    pedido = fazer_pedido(client, cliente).json()
    assert pedido["status"]["descricao"] == "aguardando_pagamento"

    pagamento = pagar_com_pix(client, gateway, cliente, pedido["id"])

    assert pagamento["status"] == "aprovado"
    assert status_pedido(client, cliente, pedido["id"]) == "confirmado"


def test_pix_gerado_fica_pendente_com_qr_code(client, cliente):
    pedido = fazer_pedido(client, cliente).json()
    pagamento = client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "pix"}, headers=cliente).json()
    assert pagamento["status"] == "pendente"
    assert pagamento["qr_code"]


def test_cartao_exige_dados_do_cartao(client, cliente):
    pedido = fazer_pedido(client, cliente).json()
    resposta = client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "cartao_credito"}, headers=cliente)
    assert resposta.status_code == 422


def test_webhook_so_aceita_assinatura_valida(client, gateway, cliente):
    pedido = fazer_pedido(client, cliente).json()
    client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "pix"}, headers=cliente)
    order_id = list(gateway.orders)[-1]
    gateway.pagar(order_id)
    corpo = {"type": "order", "data": {"id": order_id}}

    assert client.post("/pagamentos/webhook", json=corpo, headers={"x-signature": "falsa"}).status_code == 401
    assert status_pedido(client, cliente, pedido["id"]) == "aguardando_pagamento"

    assert client.post("/pagamentos/webhook", json=corpo, headers={"x-signature": "assinatura-ok"}).status_code == 200
    assert status_pedido(client, cliente, pedido["id"]) == "confirmado"


def test_cancelar_pedido_pago_estorna_e_devolve_a_vaga(client, gateway, admin, novo_cliente):
    cliente = novo_cliente()[0]
    pedido = fazer_pedido(client, cliente).json()
    pagar_com_pix(client, gateway, cliente, pedido["id"])
    for _ in range(CAPACIDADE_PADRAO - 1):
        fazer_pedido(client, novo_cliente()[0])

    resposta = client.patch(f"/pedidos/{pedido['id']}/cancelar", json={"motivo": "Faltou ingrediente"}, headers=admin)

    assert resposta.status_code == 200
    assert resposta.json()["motivo_cancelamento"] == "Faltou ingrediente"
    assert len(gateway.estornos) == 1
    pagamentos = client.get(f"/pedidos/{pedido['id']}/pagamentos", headers=cliente).json()
    assert pagamentos[0]["status"] == "estornado"
    # A vaga voltou: o dia lotado aceita outro pedido
    assert fazer_pedido(client, novo_cliente()[0]).status_code == 201


def test_cliente_nao_cancela_pedido_em_producao(client, gateway, admin, cliente):
    pedido = fazer_pedido(client, cliente).json()
    pagar_com_pix(client, gateway, cliente, pedido["id"])
    client.patch(f"/pedidos/{pedido['id']}/avancar", headers=admin)  # confirmado → em produção

    resposta = client.patch(f"/pedidos/{pedido['id']}/cancelar", headers=cliente)
    assert resposta.status_code == 400
    assert "produção" in resposta.json()["detail"]


def test_pagamento_que_chega_depois_do_cancelamento_e_estornado(client, gateway, cliente):
    pedido = fazer_pedido(client, cliente).json()
    pagamento = client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "pix"}, headers=cliente).json()
    order_id = list(gateway.orders)[-1]
    client.patch(f"/pedidos/{pedido['id']}/cancelar", headers=cliente)

    # O cliente paga o PIX depois de o pedido ter sido cancelado
    gateway.orders[order_id] = "processed"
    client.post("/pagamentos/webhook", json={"type": "order", "data": {"id": order_id}}, headers={"x-signature": "assinatura-ok"})

    assert gateway.estornos == [order_id]
    assert client.get(f"/pagamentos/{pagamento['id']}", headers=cliente).json()["status"] == "estornado"


def _envelhecer(db, pedido_id, minutos):
    """Simula a passagem do tempo: pedido e pagamentos feitos `minutos` atrás, PIX vencido."""
    passado = codigo_service.agora() - timedelta(minutes=minutos)
    pedido = db.get(PedidoModel, pedido_id)
    pedido.data_pedido = passado
    for pagamento in db.query(PagamentoModel).filter(PagamentoModel.pedido_id == pedido_id):
        pagamento.data_hora = passado
        pagamento.expira_em = passado + timedelta(minutes=1)
    db.commit()


def _rodar_rotina_de_expiracao(db):
    expiracao_service._expirar_pix_vencidos(db)
    expiracao_service._cancelar_pedidos_sem_pagamento(db)


def test_pix_vencido_cancela_o_pedido_e_libera_a_vaga(client, db, cliente):
    pedido = fazer_pedido(client, cliente).json()
    client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "pix"}, headers=cliente)
    _envelhecer(db, pedido["id"], minutos=60)

    _rodar_rotina_de_expiracao(db)

    detalhe = client.get(f"/pedidos/{pedido['id']}", headers=cliente).json()
    assert detalhe["status"]["descricao"] == "cancelado"
    assert detalhe["motivo_cancelamento"] == "Pagamento não realizado dentro do prazo"


def test_pix_pago_no_ultimo_minuto_nao_e_cancelado(client, db, gateway, cliente):
    pedido = fazer_pedido(client, cliente).json()
    client.post(f"/pedidos/{pedido['id']}/pagamentos", json={"metodo": "pix"}, headers=cliente)
    gateway.pagar(list(gateway.orders)[-1])
    _envelhecer(db, pedido["id"], minutos=60)

    _rodar_rotina_de_expiracao(db)

    # A rotina confere no gateway antes de expirar: o pagamento existia
    assert status_pedido(client, cliente, pedido["id"]) == "confirmado"


def test_pedido_dentro_do_prazo_nao_e_cancelado(client, db, cliente):
    pedido = fazer_pedido(client, cliente).json()
    _rodar_rotina_de_expiracao(db)
    assert status_pedido(client, cliente, pedido["id"]) == "aguardando_pagamento"
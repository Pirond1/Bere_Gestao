"""RF_S01 (dashboard de vendas) e RF_S02 (NPS): só venda paga conta; NPS = % promotores − % detratores."""

from decimal import Decimal

from app.core.tempo import hoje

from apoio import dia_util, fazer_pedido, pagar_com_pix


def periodo():
    dia = hoje().isoformat()
    return {"inicio": dia, "fim": dia}


def pedido_pago(client, gateway, headers, quantidade=1, data=None):
    pedido = fazer_pedido(client, headers, data=data, quantidade=quantidade).json()
    pagar_com_pix(client, gateway, headers, pedido["id"])
    return pedido


def entregar(client, admin, pedido_id):
    # confirmado → em produção → pronto → retirado
    for _ in range(3):
        assert client.patch(f"/pedidos/{pedido_id}/avancar", headers=admin).status_code == 200


def test_vendas_contam_so_pedidos_pagos(client, gateway, admin, novo_cliente):
    pedido_pago(client, gateway, novo_cliente()[0], quantidade=2)  # 2 × 45,50
    fazer_pedido(client, novo_cliente()[0])  # não pago: não é venda

    relatorio = client.get("/relatorios/vendas", params=periodo(), headers=admin).json()

    assert relatorio["quantidade_pedidos"] == 1
    assert Decimal(relatorio["total_pago"]) == Decimal("91.00")
    assert relatorio["produtos_mais_vendidos"][0]["quantidade"] == 2


def test_pedido_estornado_sai_das_vendas(client, gateway, admin, cliente):
    pedido = pedido_pago(client, gateway, cliente)
    client.patch(f"/pedidos/{pedido['id']}/cancelar", headers=admin)

    relatorio = client.get("/relatorios/vendas", params=periodo(), headers=admin).json()

    assert relatorio["quantidade_pedidos"] == 0
    assert Decimal(relatorio["total_estornado"]) == Decimal("45.50")


def test_relatorios_sao_so_do_admin(client, cliente):
    assert client.get("/relatorios/vendas", params=periodo(), headers=cliente).status_code == 403


def test_avaliacao_so_depois_da_retirada_e_uma_por_pedido(client, gateway, admin, cliente):
    pedido = pedido_pago(client, gateway, cliente)
    url = f"/pedidos/{pedido['id']}/avaliacao/"

    antes = client.post(url, json={"nota": 10}, headers=cliente)
    assert antes.status_code == 400

    entregar(client, admin, pedido["id"])
    assert client.post(url, json={"nota": 10}, headers=cliente).status_code == 201
    assert client.post(url, json={"nota": 3}, headers=cliente).status_code == 400


def test_calculo_do_nps(client, gateway, admin, novo_cliente):
    # 2 promotores (9 e 10), 1 neutro (8), 1 detrator (5): NPS = (2 − 1) / 4 = 25
    for dia, nota in enumerate((10, 9, 8, 5), start=2):
        headers = novo_cliente()[0]
        # Um pedido por dia: a capacidade de teste é 2 pedidos/dia
        pedido = pedido_pago(client, gateway, headers, data=dia_util(dia))
        entregar(client, admin, pedido["id"])
        client.post(f"/pedidos/{pedido['id']}/avaliacao/", json={"nota": nota}, headers=headers)

    nps = client.get("/relatorios/nps", params=periodo(), headers=admin).json()

    assert (nps["promotores"], nps["neutros"], nps["detratores"]) == (2, 1, 1)
    assert nps["nps"] == 25
    assert nps["distribuicao"][10] == 1 and nps["distribuicao"][5] == 1


def test_nps_sem_avaliacoes_e_nulo(client, admin):
    assert client.get("/relatorios/nps", params=periodo(), headers=admin).json()["nps"] is None

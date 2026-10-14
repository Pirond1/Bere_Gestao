"""RF_F01 — agendamento respeita a capacidade produtiva do dia (agendamento_service)."""

from datetime import timedelta

from app.core.tempo import hoje

from apoio import CAPACIDADE_PADRAO, dia_util, fazer_pedido


def test_dia_aceita_pedidos_ate_a_capacidade(client, novo_cliente):
    for _ in range(CAPACIDADE_PADRAO):
        assert fazer_pedido(client, novo_cliente()[0]).status_code == 201

    resposta = fazer_pedido(client, novo_cliente()[0])
    assert resposta.status_code == 400
    assert "Não há vagas" in resposta.json()["detail"]


def test_cancelar_pedido_devolve_a_vaga(client, novo_cliente):
    pedidos = [fazer_pedido(client, h) for h, _ in (novo_cliente() for _ in range(CAPACIDADE_PADRAO))]
    cliente_que_cancela = pedidos[0]
    assert fazer_pedido(client, novo_cliente()[0]).status_code == 400

    # O cliente cancela o próprio pedido ainda não pago
    pedido_id = cliente_que_cancela.json()["id"]
    dono = cliente_que_cancela.request.headers["Authorization"]
    assert client.patch(f"/pedidos/{pedido_id}/cancelar", headers={"Authorization": dono}).status_code == 200

    assert fazer_pedido(client, novo_cliente()[0]).status_code == 201


def test_disponibilidade_mostra_vagas_restantes(client, cliente):
    fazer_pedido(client, cliente, data=dia_util(3))
    dias = {d["data"]: d for d in client.get("/agenda/disponibilidade?dias=10").json()}
    assert dias[dia_util(3)]["vagas_disponiveis"] == CAPACIDADE_PADRAO - 1


def test_antecedencia_minima(client, cliente):
    resposta = fazer_pedido(client, cliente, data=hoje().isoformat())
    assert resposta.status_code == 400
    assert "a partir de" in resposta.json()["detail"]


def test_dia_bloqueado_nao_aceita_pedidos(client, admin, cliente):
    assert client.put(f"/agenda/{dia_util()}", json={"bloqueada": True}, headers=admin).status_code == 200
    resposta = fazer_pedido(client, cliente)
    assert resposta.status_code == 400
    assert "Não haverá atendimento" in resposta.json()["detail"]


def test_dia_da_semana_fechado_e_excecao(client, admin, cliente):
    data = hoje() + timedelta(days=2)
    client.put("/configuracoes/", json={"dias_fechados": [data.weekday()]}, headers=admin)
    assert fazer_pedido(client, cliente, data=data.isoformat()).status_code == 400

    # Abrir aquele dia específico como exceção
    client.put(f"/agenda/{data.isoformat()}", json={"bloqueada": False}, headers=admin)
    assert fazer_pedido(client, cliente, data=data.isoformat()).status_code == 201


def test_dia_sem_ajuste_acompanha_a_capacidade_padrao(client, admin, novo_cliente):
    for _ in range(CAPACIDADE_PADRAO):
        fazer_pedido(client, novo_cliente()[0])
    assert fazer_pedido(client, novo_cliente()[0]).status_code == 400

    # Aumentar o padrão vale também para o dia que já tinha pedidos
    client.put("/configuracoes/", json={"capacidade_produtiva_padrao": CAPACIDADE_PADRAO + 1}, headers=admin)
    assert fazer_pedido(client, novo_cliente()[0]).status_code == 201


def test_capacidade_personalizada_nao_fica_abaixo_dos_pedidos(client, admin, cliente):
    fazer_pedido(client, cliente)
    resposta = client.put(f"/agenda/{dia_util()}", json={"capacidade_maxima": 0}, headers=admin)
    assert resposta.status_code == 400

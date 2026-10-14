"""Conta e segurança: cadastro com código (BG-15), força de senha, sessão (BG-17) e LGPD (BG-20)."""

import time

import pytest

from app.services import senha_service

from apoio import SENHA, codigo_do_email, fazer_pedido, gerar_cpf


def dados_cadastro(email="nova@example.com", **extra):
    return {
        "email": email, "senha": SENHA, "nome": "Joana Silva", "cpf": gerar_cpf(),
        "telefone": "18999990000", "aceite_termos": True, **extra,
    }


@pytest.mark.parametrize(
    "senha",
    ["abc", "abcdefgh", "12345678a", "senha2024", "Brigadeiro1", "aaaa1111", "joana2024x"],
)
def test_senhas_fracas_sao_recusadas(senha):
    assert senha_service.problema(senha, nome="Joana Silva", email="joana@example.com") is not None


def test_senha_forte_e_aceita():
    assert senha_service.problema("doce-de-leite-7", nome="Joana Silva", email="joana@example.com") is None


def test_cadastro_so_cria_a_conta_depois_do_codigo(client, emails):
    assert client.post("/auth/registrar", json=dados_cadastro()).status_code == 202
    # Ainda não existe conta
    assert client.post("/auth/login", json={"email": "nova@example.com", "senha": SENHA}).status_code == 401

    codigo = codigo_do_email(emails, "nova@example.com")
    resposta = client.post("/auth/registrar/confirmar", json={"email": "nova@example.com", "codigo": codigo})

    assert resposta.status_code == 201
    assert client.post("/auth/login", json={"email": "nova@example.com", "senha": SENHA}).status_code == 200


def test_cadastro_exige_aceite_e_telefone(client):
    sem_aceite = client.post("/auth/registrar", json=dados_cadastro(aceite_termos=False))
    assert sem_aceite.status_code == 422
    dados = dados_cadastro()
    del dados["telefone"]
    assert client.post("/auth/registrar", json=dados).status_code == 422


def test_codigo_errado_conta_tentativas(client, emails):
    client.post("/auth/registrar", json=dados_cadastro())
    certo = codigo_do_email(emails, "nova@example.com")
    errado = "000000" if certo != "000000" else "111111"

    for _ in range(5):
        client.post("/auth/registrar/confirmar", json={"email": "nova@example.com", "codigo": errado})
    resposta = client.post("/auth/registrar/confirmar", json={"email": "nova@example.com", "codigo": certo})

    # Depois de 5 erros nem o código certo vale mais
    assert resposta.status_code == 400
    assert "Muitas tentativas" in resposta.json()["detail"]


def test_esqueci_a_senha_nao_revela_quem_tem_conta(client, novo_cliente):
    _, cliente = novo_cliente(email="existe@example.com")
    existe = client.post("/auth/senha/esqueci", json={"email": "existe@example.com"})
    nao_existe = client.post("/auth/senha/esqueci", json={"email": "ninguem@example.com"})
    assert (existe.status_code, existe.json()) == (nao_existe.status_code, nao_existe.json())


def test_redefinir_senha_com_codigo(client, emails, novo_cliente):
    novo_cliente(email="joana@example.com")
    client.post("/auth/senha/esqueci", json={"email": "joana@example.com"})
    codigo = codigo_do_email(emails, "joana@example.com")

    resposta = client.post(
        "/auth/senha/redefinir",
        json={"email": "joana@example.com", "codigo": codigo, "nova_senha": "bolo-de-fuba-42"},
    )

    assert resposta.status_code == 200
    assert client.post("/auth/login", json={"email": "joana@example.com", "senha": "bolo-de-fuba-42"}).status_code == 200


def test_trocar_senha_derruba_as_outras_sessoes(client, novo_cliente):
    novo_cliente(email="joana@example.com")
    login = lambda: client.post("/auth/login", json={"email": "joana@example.com", "senha": SENHA}).json()["access_token"]  # noqa: E731
    celular, computador = login(), login()

    time.sleep(1.1)  # o `iat` do token é em segundos
    resposta = client.put(
        "/auth/alterar",
        json={"senha": "bolo-de-fuba-42", "senha_atual": SENHA},
        headers={"Authorization": f"Bearer {celular}"},
    )
    token_novo = resposta.json()["access_token"]

    assert client.get("/auth/perfil", headers={"Authorization": f"Bearer {computador}"}).status_code == 401
    assert client.get("/auth/perfil", headers={"Authorization": f"Bearer {token_novo}"}).status_code == 200


def test_trocar_senha_exige_a_senha_atual(client, cliente):
    resposta = client.put("/auth/alterar", json={"senha": "bolo-de-fuba-42"}, headers=cliente)
    assert resposta.status_code == 400


def test_conta_antiga_aceita_os_termos_antes_de_pedir(client, novo_cliente):
    headers, _ = novo_cliente(aceitou_termos=False)
    assert client.get("/auth/me", headers=headers).json()["termos_pendentes"] is True
    assert fazer_pedido(client, headers).status_code == 403

    client.post("/auth/termos/aceitar", headers=headers)
    assert fazer_pedido(client, headers).status_code == 201


def test_excluir_minha_conta_anonimiza(client, db, emails, novo_cliente):
    headers, cliente = novo_cliente(email="joana@example.com")

    assert client.post("/auth/conta/excluir", json={"senha_atual": "errada"}, headers=headers).status_code == 400
    assert client.post("/auth/conta/excluir", json={"senha_atual": SENHA}, headers=headers).status_code == 204

    db.refresh(cliente)
    assert cliente.nome == "Conta removida" and cliente.telefone is None
    assert client.get("/auth/perfil", headers=headers).status_code == 401
    assert any(destino == "joana@example.com" for destino, _ in emails)


def test_nao_exclui_conta_com_pedido_em_andamento(client, novo_cliente):
    headers, _ = novo_cliente()
    fazer_pedido(client, headers)
    resposta = client.post("/auth/conta/excluir", json={"senha_atual": SENHA}, headers=headers)
    assert resposta.status_code == 409


def test_cliente_nao_acessa_o_painel(client, cliente):
    assert client.get("/pedidos/painel", headers=cliente).status_code == 403
    assert client.get("/clientes/painel", headers=cliente).status_code == 403

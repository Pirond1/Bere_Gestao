"""Funções de apoio usadas pelos testes (BG-22)."""

import re
from datetime import timedelta
from itertools import count

from app.core.tempo import hoje

SENHA = "doce-de-leite-7"
CAPACIDADE_PADRAO = 2
_cpfs = count(1)


def gerar_cpf() -> str:
    """CPF válido e único por teste (dígitos verificadores calculados)."""
    base = [int(d) for d in f"{next(_cpfs):09d}"]
    for i in range(2):
        soma = sum(base[j] * (10 + i - j) for j in range(9 + i))
        base.append(soma * 10 % 11 % 10)
    return "".join(map(str, base))


def codigo_do_email(caixa, destino) -> str:
    """Código de 6 dígitos do último e-mail enviado para `destino`."""
    mensagem = [m for d, m in caixa if d == destino][-1]
    return re.search(r"Código: (\d{6})", mensagem.texto).group(1)


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def dia_util(dias: int = 2) -> str:
    """Data de retirada futura (respeita a antecedência mínima de 1 dia)."""
    return (hoje() + timedelta(days=dias)).isoformat()


def fazer_pedido(client, headers, data=None, quantidade=1):
    return client.post(
        "/pedidos/",
        json={"data_retirada": data or dia_util(), "itens": [{"produto_id": 1, "quantidade": quantidade}]},
        headers=headers,
    )


def pagar_com_pix(client, gateway, headers, pedido_id) -> dict:
    """Gera o PIX, simula o pagamento no gateway e sincroniza (como a tela do PIX faz)."""
    pagamento = client.post(f"/pedidos/{pedido_id}/pagamentos", json={"metodo": "pix"}, headers=headers).json()
    gateway.pagar(list(gateway.orders)[-1])
    return client.get(f"/pagamentos/{pagamento['id']}", headers=headers).json()

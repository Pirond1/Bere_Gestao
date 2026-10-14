"""Força de senha no padrão NIST SP 800-63B.

A norma recomenda priorizar o tamanho e bloquear senhas conhecidas/óbvias, em vez de exigir
maiúscula + símbolo — essas regras levam a senhas previsíveis como "Senha@123".
"""

import re
import unicodedata
from typing import Optional

SENHA_MINIMA = 8
# O bcrypt só considera os primeiros 72 bytes; 64 caracteres deixa folga para acentos
SENHA_MAXIMA = 64

# Senhas e palavras mais usadas no Brasil e no mundo, mais as óbvias para esta loja.
# Comparadas sem acento, em minúsculas e também sem os números/símbolos do fim ("brasil2024" → "brasil")
SENHAS_COMUNS = frozenset(
    """
    123456 1234567 12345678 123456789 1234567890 12345678910 123123 123321 111111 000000 112233
    121212 123654 147258 147258369 159753 654321 666666 696969 7777777 87654321 987654321 abc123
    abcd1234 a1b2c3d4 qwerty qwerty123 qwertyuiop asdfgh asdfghjkl zxcvbnm 1q2w3e4r 1q2w3e4r5t
    q1w2e3r4 qazwsx password passw0rd password1 senha senha1 senha12 senha123 senha1234 senhasenha
    minhasenha mudar mudar123 trocar admin admin123 administrador root teste teste123 test test123
    usuario user login acesso entrar welcome bemvindo iloveyou teamo amor amorzinho meuamor
    deus deusefiel jesus jesuscristo cristo fe esperanca familia felicidade saudade brasil
    flamengo corinthians palmeiras santos saopaulo gremio internacional cruzeiro vasco botafogo
    fluminense atletico bahia vitoria sport futebol neymar pele gabriel gabriela lucas mateus
    pedro maria ana julia beatriz felipe rafael guilherme daniel princesa principe estrela
    anjo anjinho bebe docinho chocolate morango brigadeiro doce doces bolo bolos confeitaria
    bere donabere donaberedoces dragon monkey master shadow sunshine football baseball
    superman batman letmein trustno1 whatever freedom secret segredo naosei qualquer nada
    """.split()
)


def _normalizar(texto: str) -> str:
    sem_acento = unicodedata.normalize("NFD", texto).encode("ascii", "ignore").decode()
    return sem_acento.lower()


def _partes_pessoais(nome: Optional[str], email: Optional[str], cpf: Optional[str]) -> list[str]:
    """Trechos dos dados da pessoa que não podem aparecer na senha."""
    partes = []
    if nome:
        partes += [p for p in _normalizar(nome).split() if len(p) >= 3]
    if email:
        local = _normalizar(email.split("@")[0])
        partes += [p for p in re.split(r"[^a-z0-9]+", local) if len(p) >= 3]
    if cpf:
        digitos = re.sub(r"\D", "", cpf)
        # O CPF inteiro e o começo dele (a parte que as pessoas costumam usar)
        partes += [digitos, digitos[:6]] if len(digitos) >= 6 else []
    return partes


def problema(
    senha: str,
    nome: Optional[str] = None,
    email: Optional[str] = None,
    cpf: Optional[str] = None,
) -> Optional[str]:
    """Explica por que a senha é fraca, ou None se ela for aceitável."""
    if len(senha) < SENHA_MINIMA:
        return f"A senha precisa ter pelo menos {SENHA_MINIMA} caracteres"
    if len(senha) > SENHA_MAXIMA:
        return f"A senha pode ter no máximo {SENHA_MAXIMA} caracteres"
    if not re.search(r"[A-Za-zÀ-ÿ]", senha) or not re.search(r"\d", senha):
        return "Use letras e números na senha"

    normalizada = _normalizar(senha)
    # "aaaa1111", "12121212ab": poucos caracteres diferentes
    if len(set(normalizada)) < 4:
        return "A senha repete demais os mesmos caracteres"
    # Palavra ou sequência comum com um enfeite: "brasil2024", "Brigadeiro1", "12345678a"
    letras = re.sub(r"[^a-z]", "", normalizada)
    numeros = re.sub(r"\D", "", normalizada)
    comum = (
        normalizada in SENHAS_COMUNS
        or (len(letras) >= 4 and letras in SENHAS_COMUNS)
        or (len(numeros) >= 6 and numeros in SENHAS_COMUNS)
    )
    if comum:
        return "Essa senha é muito comum e fácil de adivinhar — escolha outra"
    if any(parte in normalizada for parte in _partes_pessoais(nome, email, cpf)):
        return "A senha não pode conter seu nome, e-mail ou CPF"
    return None

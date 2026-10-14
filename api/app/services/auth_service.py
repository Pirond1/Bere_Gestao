from datetime import date
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.tempo import hoje
from app.core.security import criar_token, hash_senha, token_do_usuario, verificar_senha
from app.models.cliente import ClienteModel
from app.models.codigo_verificacao import CodigoVerificacaoModel
from app.models.usuario import UsuarioModel
from app.schemas.auth import AlterarContaInput, RegistroInput
from app.services import codigo_service, email_service, lgpd_service, senha_service

MENSAGEM_RECUPERACAO = (
    "Se houver uma conta com este e-mail, enviamos um código para redefinir a senha. "
    "Confira também a caixa de spam."
)


# --- Cadastro em duas etapas: dados → código no e-mail → conta criada ---


def _conferir_disponibilidade(db: Session, email: str, cpf: str) -> None:
    if db.query(UsuarioModel).filter(UsuarioModel.email == email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
    if db.query(ClienteModel).filter(ClienteModel.cpf == cpf).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="CPF já cadastrado")


def _enviar_codigo(db: Session, destino: str, codigo: str, assunto: str, titulo: str, motivo: str) -> None:
    mensagem = email_service.montar(
        assunto,
        titulo,
        [motivo, f"O código vale por {codigo_service.VALIDADE_MINUTOS} minutos. Não compartilhe com ninguém."],
        codigo=codigo,
    )
    email_service.enviar_ou_erro(destino, mensagem, email_service.remetente(db))


def _codigo_enviado(registro: CodigoVerificacaoModel) -> dict:
    return {
        "email": registro.email,
        "expira_em": registro.expira_em,
        "reenvio_em_segundos": codigo_service.INTERVALO_REENVIO_SEGUNDOS,
    }


def iniciar_cadastro(db: Session, dados: RegistroInput) -> dict:
    """Valida tudo e envia o código. A conta só é criada em `confirmar_cadastro`."""
    _conferir_disponibilidade(db, dados.email, dados.cpf)
    pendente = dados.model_dump(mode="json", exclude={"senha", "email", "aceite_termos"})
    # A senha já vai em hash — o cadastro pendente nunca guarda a senha em texto
    pendente["senha_hash"] = hash_senha(dados.senha)
    try:
        codigo, registro = codigo_service.gerar(db, codigo_service.CADASTRO, dados.email, dados=pendente)
    except codigo_service.AguardeReenvio as espera:
        raise codigo_service.erro_aguarde(espera)
    _enviar_codigo(
        db, dados.email, codigo,
        "Seu código de cadastro — Dona Berê Doces",
        "Confirme seu e-mail",
        f"Olá, {dados.nome.split()[0]}! Use o código abaixo para concluir seu cadastro.",
    )
    db.commit()
    return _codigo_enviado(registro)


def reenviar_cadastro(db: Session, email: str) -> dict:
    """Novo código para o cadastro pendente (os dados do formulário são reaproveitados)."""
    pendente = codigo_service.ultimo_pendente(db, codigo_service.CADASTRO, email)
    if not pendente or not pendente.dados:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cadastro não encontrado — preencha o formulário novamente",
        )
    dados = pendente.dados
    try:
        codigo, registro = codigo_service.gerar(db, codigo_service.CADASTRO, email, dados=dados)
    except codigo_service.AguardeReenvio as espera:
        raise codigo_service.erro_aguarde(espera)
    _enviar_codigo(
        db, email, codigo,
        "Seu código de cadastro — Dona Berê Doces",
        "Confirme seu e-mail",
        f"Olá, {dados['nome'].split()[0]}! Use o código abaixo para concluir seu cadastro.",
    )
    db.commit()
    return _codigo_enviado(registro)


def confirmar_cadastro(db: Session, email: str, codigo: str) -> dict:
    registro = codigo_service.verificar(db, codigo_service.CADASTRO, email, codigo)
    dados = registro.dados
    # Alguém pode ter usado o e-mail ou o CPF enquanto o código estava na caixa de entrada
    _conferir_disponibilidade(db, email, dados["cpf"])

    usuario = UsuarioModel(email=email, senha_hash=dados["senha_hash"], tipo_id=2)  # cliente
    db.add(usuario)
    db.flush()  # gera o usuario.id sem commitar ainda
    cliente = ClienteModel(
        nome=dados["nome"],
        cpf=dados["cpf"],
        telefone=dados.get("telefone"),
        data_nascimento=date.fromisoformat(dados["data_nascimento"]) if dados.get("data_nascimento") else None,
        data_assinatura=hoje(),
        usuario_id=usuario.id,
    )
    db.add(cliente)
    # O aceite foi obrigatório no formulário; vale a partir da criação da conta
    lgpd_service.registrar_aceite(cliente)
    # O cadastro pendente guardava dados pessoais: não precisa mais deles (LGPD — mínimo necessário)
    registro.dados = None
    db.commit()
    db.refresh(cliente)

    token = criar_token({"sub": str(usuario.id), "tipo": "cliente"})
    return {"access_token": token, "token_type": "bearer", "cliente": cliente}


# --- Recuperação de senha ---


def solicitar_recuperacao(db: Session, email: str) -> Optional[tuple]:
    """Gera o código se a conta existir. Devolve o que enviar em segundo plano (ou None).

    A resposta para a pessoa é sempre a mesma: não revela quais e-mails têm conta.
    """
    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
    if not usuario or not usuario.ativo:
        return None
    try:
        codigo, _ = codigo_service.gerar(db, codigo_service.RECUPERACAO_SENHA, usuario.email, usuario_id=usuario.id)
    except codigo_service.AguardeReenvio:
        # Pedido repetido em menos de 60 s: o código anterior continua valendo
        return None
    db.commit()
    nome = usuario.cliente.nome.split()[0] if usuario.cliente else None
    mensagem = email_service.montar(
        "Redefinição de senha — Dona Berê Doces",
        "Redefinir sua senha",
        [
            f"Olá{', ' + nome if nome else ''}! Recebemos um pedido para redefinir a senha da sua conta.",
            f"Use o código abaixo em até {codigo_service.VALIDADE_MINUTOS} minutos. "
            "Se não foi você, ignore este e-mail — sua senha continua a mesma.",
        ],
        codigo=codigo,
    )
    return usuario.email, mensagem, email_service.remetente(db)


def _trocar_senha(usuario: UsuarioModel, nova_senha: str) -> None:
    """Grava a senha nova e derruba as sessões abertas em outros aparelhos."""
    usuario.senha_hash = hash_senha(nova_senha)
    # Sem microssegundos: o `iat` do token é em segundos, e o token novo (mesmo segundo) precisa valer
    usuario.senha_alterada_em = codigo_service.agora().replace(microsecond=0)


def redefinir_senha(db: Session, email: str, codigo: str, nova_senha: str) -> None:
    usuario = db.query(UsuarioModel).filter(UsuarioModel.email == email).first()
    if not usuario or not usuario.ativo:
        # Mesma mensagem de código inválido: não confirma se a conta existe
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código expirado — peça um novo código")
    _validar_forca(nova_senha, usuario)
    codigo_service.verificar(db, codigo_service.RECUPERACAO_SENHA, usuario.email, codigo)
    _trocar_senha(usuario, nova_senha)
    db.commit()


# --- Troca de e-mail: senha atual + código no novo endereço ---


def solicitar_troca_email(db: Session, usuario: UsuarioModel, novo_email: str, senha_atual: str) -> dict:
    _conferir_senha_atual(usuario, senha_atual)
    if novo_email.lower() == usuario.email.lower():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este já é o seu e-mail")
    if db.query(UsuarioModel).filter(UsuarioModel.email == novo_email).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
    try:
        codigo, registro = codigo_service.gerar(
            db, codigo_service.TROCA_EMAIL, novo_email, usuario_id=usuario.id
        )
    except codigo_service.AguardeReenvio as espera:
        raise codigo_service.erro_aguarde(espera)
    _enviar_codigo(
        db, novo_email, codigo,
        "Confirme seu novo e-mail — Dona Berê Doces",
        "Confirme seu novo e-mail",
        "Use o código abaixo para confirmar que este é o novo e-mail da sua conta na Dona Berê Doces.",
    )
    db.commit()
    return _codigo_enviado(registro)


def confirmar_troca_email(db: Session, usuario: UsuarioModel, codigo: str) -> UsuarioModel:
    # O novo e-mail é o do último pedido de troca desta conta
    pendente = (
        db.query(CodigoVerificacaoModel)
        .filter(
            CodigoVerificacaoModel.finalidade == codigo_service.TROCA_EMAIL,
            CodigoVerificacaoModel.usuario_id == usuario.id,
            CodigoVerificacaoModel.usado_em.is_(None),
        )
        .order_by(CodigoVerificacaoModel.id.desc())
        .first()
    )
    if not pendente:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Código expirado — peça um novo código")
    novo_email = pendente.email
    codigo_service.verificar(db, codigo_service.TROCA_EMAIL, novo_email, codigo)
    if db.query(UsuarioModel).filter(UsuarioModel.email == novo_email, UsuarioModel.id != usuario.id).first():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")

    antigo = usuario.email
    usuario.email = novo_email
    db.commit()
    db.refresh(usuario)

    # Avisa o endereço antigo: se não foi a pessoa, ela fica sabendo e procura a loja
    aviso = email_service.montar(
        "Seu e-mail foi alterado — Dona Berê Doces",
        "O e-mail da sua conta foi alterado",
        [
            # Sem o novo endereço: o aviso vai para uma caixa que pode não ser mais só da pessoa
            "O e-mail de acesso da sua conta na Dona Berê Doces foi alterado.",
            "Se foi você, está tudo certo e não precisa fazer nada. Se não foi, fale com a loja o quanto antes.",
        ],
    )
    email_service.enviar_em_segundo_plano(antigo, aviso, email_service.remetente(db))
    return usuario


# --- Alterações protegidas pela senha atual ---


def _conferir_senha_atual(usuario: UsuarioModel, senha_atual: Optional[str]) -> None:
    # 400 e não 401: o frontend trata 401 como sessão expirada e deslogaria o cliente
    if not senha_atual:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Informe sua senha atual para alterar e-mail, CPF ou senha",
        )
    if not verificar_senha(senha_atual, usuario.senha_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha atual incorreta",
        )


def _validar_forca(senha: str, usuario: UsuarioModel, cpf: Optional[str] = None) -> None:
    cliente = usuario.cliente
    erro = senha_service.problema(
        senha,
        nome=cliente.nome if cliente else None,
        email=usuario.email,
        cpf=cpf or (cliente.cpf if cliente else None),
    )
    if erro:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=erro)


def alterar_conta(
    db: Session, usuario_atual: UsuarioModel, dados: AlterarContaInput
) -> tuple[UsuarioModel, Optional[str]]:
    """Devolve a conta e, se a senha mudou, um token novo — o atual cai junto com as outras sessões."""
    campos = dados.model_dump(exclude_unset=True)
    # Nulo em senha/nome/CPF significa "não mudar"; no nascimento, apaga (telefone nulo o schema recusa)
    for campo in ("senha", "nome", "cpf", "senha_atual"):
        if campos.get(campo) is None:
            campos.pop(campo, None)

    cliente = usuario_atual.cliente
    troca_cpf = cliente is not None and "cpf" in campos and campos["cpf"] != cliente.cpf
    if troca_cpf or "senha" in campos:
        _conferir_senha_atual(usuario_atual, campos.get("senha_atual"))

    if troca_cpf:
        conflito = db.query(ClienteModel).filter(
            ClienteModel.cpf == campos["cpf"],
            ClienteModel.id != cliente.id,
        ).first()
        if conflito:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="CPF já cadastrado em outra conta",
            )
        cliente.cpf = campos["cpf"]

    if "senha" in campos:
        _validar_forca(campos["senha"], usuario_atual)
        _trocar_senha(usuario_atual, campos["senha"])

    # atualiza o perfil de cliente se existir
    campos_cliente = {k: campos[k] for k in ("nome", "telefone", "data_nascimento") if k in campos}
    if campos_cliente and cliente:
        for campo, valor in campos_cliente.items():
            setattr(cliente, campo, valor)

    db.commit()
    db.refresh(usuario_atual)
    return usuario_atual, token_do_usuario(usuario_atual) if "senha" in campos else None

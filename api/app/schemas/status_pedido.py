from pydantic import BaseModel


class StatusPedidoRead(BaseModel):
    id: int
    descricao: str

    model_config = {"from_attributes": True}
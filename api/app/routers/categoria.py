from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.deps import get_admin_atual
from app.db.session import get_db
from app.schemas.categoria import CategoriaCreate, CategoriaRead, CategoriaUpdate
from app.services import categoria_service

router = APIRouter(prefix="/categorias", tags=["Categorias"])


@router.post("/", response_model=CategoriaRead, status_code=status.HTTP_201_CREATED)
def criar_categoria(dados: CategoriaCreate, db: Session = Depends(get_db), _=Depends(get_admin_atual)):
    return categoria_service.criar(db, dados)


@router.get("/", response_model=list[CategoriaRead])
def listar_categorias(db: Session = Depends(get_db)):
    return categoria_service.listar(db)


@router.get("/{categoria_id}", response_model=CategoriaRead)
def buscar_categoria(categoria_id: int, db: Session = Depends(get_db)):
    return categoria_service.buscar_por_id(db, categoria_id)


@router.put("/{categoria_id}", response_model=CategoriaRead)
def atualizar_categoria(
    categoria_id: int,
    dados: CategoriaUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    return categoria_service.atualizar(db, categoria_id, dados)


@router.delete("/{categoria_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_categoria(
    categoria_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_admin_atual),
):
    categoria_service.deletar(db, categoria_id)
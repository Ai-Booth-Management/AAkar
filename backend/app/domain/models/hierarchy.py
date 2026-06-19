from typing import Optional
from sqlmodel import SQLModel, Field, Relationship


class HierarchyNode(SQLModel, table=True):
    __tablename__ = "hierarchy_node"

    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(index=True)
    name: str
    level: str
    parent_id: Optional[int] = Field(default=None, foreign_key="hierarchy_node.id")

    children: list["HierarchyNode"] = Relationship(
        back_populates="parent",
        sa_relationship_kwargs={"join_depth": 3},
    )
    parent: Optional["HierarchyNode"] = Relationship(
        back_populates="children",
        sa_relationship_kwargs={"remote_side": "HierarchyNode.id"},
    )

from datetime import date
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Priority = Literal["low", "medium", "high"]


class Card(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    details: str
    # Optional so boards saved before these fields existed still load
    priority: Priority | None = None
    dueDate: date | None = None


class Column(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    cardIds: list[str]


class Board(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns: list[Column]
    cards: dict[str, Card]

    @model_validator(mode="after")
    def check_references(self):
        column_ids = [column.id for column in self.columns]
        if len(column_ids) != len(set(column_ids)):
            raise ValueError("Column ids must be unique")
        for key, card in self.cards.items():
            if key != card.id:
                raise ValueError(f"Card key {key!r} does not match card id {card.id!r}")
        placed = [card_id for column in self.columns for card_id in column.cardIds]
        if sorted(placed) != sorted(self.cards):
            raise ValueError("Every card must appear in exactly one column, and every cardId must exist in cards")
        return self


BoardName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=60)]
Username = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9_.-]{3,32}$")]
Password = Annotated[str, Field(min_length=8, max_length=128)]


class Credentials(BaseModel):
    username: Username
    password: Password


class Login(BaseModel):
    username: str
    password: str


class PasswordChange(BaseModel):
    current: str
    new: Password


class User(BaseModel):
    id: int
    username: str


class BoardSummary(BaseModel):
    id: int
    name: str
    cardCount: int
    updatedAt: str


class BoardCreate(BaseModel):
    name: BoardName


class BoardRename(BaseModel):
    name: BoardName


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    reply: str
    board: Board | None

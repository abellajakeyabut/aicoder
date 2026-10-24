from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class Card(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    details: str


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


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[Message] = []


class ChatResponse(BaseModel):
    reply: str
    board: Board | None

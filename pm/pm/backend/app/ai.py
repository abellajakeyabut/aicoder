import os

from openai import OpenAI
from pydantic import BaseModel, ConfigDict

from app.models import Board, Card, Column, Message

MODEL = "openai/gpt-oss-120b"

SYSTEM_PROMPT = """You are the assistant for a Kanban board app. You help the user plan their project and can change their board.

The board is JSON: {"columns": [{"id", "title", "cardIds"}], "cards": [{"id", "title", "details"}]}.
Each column lists its cards in order in "cardIds". Every card appears in exactly one column, and every id in "cardIds" is a card.

Rules:
- The latest user message starts with the current board. Act only on that message. Earlier messages are context: any changes they asked for are already in the current board, so never apply them again.
- When the user refers to an existing card ("that card", a title), change that card in place; do not create a new one.
- Keep existing column and card ids unchanged.
- The columns are fixed: never add or remove columns, but you may rename them.
- New cards get a new unique id such as "card-<short random text>"; use "" for details if there are none.
- To move a card, remove its id from one column's "cardIds" and insert it into another.
- If the user asks for a change, set "board" to the full updated board. Otherwise set "board" to null.
- Always set "reply" to a short message for the user describing what you did or answering the question.
"""


class AIBoard(BaseModel):
    # Cards as a list: strict Structured Outputs does not allow objects with arbitrary keys
    model_config = ConfigDict(extra="forbid")

    columns: list[Column]
    cards: list[Card]

    @classmethod
    def from_board(cls, board: Board) -> "AIBoard":
        return cls(columns=board.columns, cards=list(board.cards.values()))

    def to_board(self) -> Board:
        return Board(columns=self.columns, cards={card.id: card for card in self.cards})


class AIResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reply: str
    board: AIBoard | None


def client() -> OpenAI:
    # Created per call so the app starts (and tests run) without a key
    return OpenAI(base_url="https://openrouter.ai/api/v1", api_key=os.environ["OPENROUTER_API_KEY"])


def ask(prompt: str) -> str:
    response = client().chat.completions.create(
        model=MODEL, messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content


def chat(board: Board, message: str, history: list[Message]) -> AIResponse | None:
    # The board goes in the latest message, after the history: with it in the system prompt the
    # model sometimes re-applied changes from earlier messages (duplicate cards)
    board_json = AIBoard.from_board(board).model_dump_json()
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *(m.model_dump() for m in history),
        {"role": "user", "content": f"Current board:\n{board_json}\n\n{message}"},
    ]
    response = client().chat.completions.parse(
        model=MODEL,
        messages=messages,
        response_format=AIResponse,
        # Only route to OpenRouter providers that support response_format. CoreWeave is excluded:
        # it returns no reasoning for this model and its boards often lose or misplace cards
        extra_body={"provider": {"require_parameters": True, "ignore": ["CoreWeave"]}},
    )
    return response.choices[0].message.parsed

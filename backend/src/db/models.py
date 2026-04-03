# models.py
from sqlmodel import SQLModel, Field, Column, Relationship
from sqlalchemy.dialects import postgresql as pg
from datetime import datetime
from typing import Optional, List
import uuid


# models.py
class User(SQLModel, table=True):
    __tablename__ = "users"
    
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    username: str
    email: str
    first_name: str
    last_name: str
    role: str = Field(
        sa_column=Column(pg.VARCHAR, nullable=False, server_default="user")
    )
    is_verified: bool = Field(default=False)
    password_hash: str = Field(
        sa_column=Column(pg.VARCHAR, nullable=False), exclude=True
    )
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP, default=datetime.utcnow)
    )
    updated_at: datetime = Field(  # ✅ Changed from update_at
        sa_column=Column(pg.TIMESTAMP, default=datetime.utcnow)
    )
    
    # Relationships
    todos: List["Todo"] = Relationship(
        back_populates="user", 
        sa_relationship_kwargs={"lazy": "selectin"}
    )
    campaigns: List["Campaign"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"lazy": "selectin"}
    )
    
    def __repr__(self):
        return f"<User {self.username}>"

class Todo(SQLModel, table=True):
    __tablename__ = "todos"
    
    uid: uuid.UUID = Field(
        sa_column=Column(pg.UUID, nullable=False, primary_key=True, default=uuid.uuid4)
    )
    title: str = Field(max_length=255)
    detail: Optional[str] = Field(default=None)
    completed: bool = Field(default=False)
    due_date: Optional[datetime] = Field(default=None)
    
    user_uid: Optional[uuid.UUID] = Field(default=None, foreign_key="users.uid")
    
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP, default=datetime.utcnow)
    )
    updated_at: datetime = Field(  # ✅ Changed from update_at
        sa_column=Column(pg.TIMESTAMP, default=datetime.utcnow)
    )
    
    user: Optional[User] = Relationship(back_populates="todos")
    
    def __repr__(self):
        return f"<Todo {self.title}>"



# models.py (Campaign class only - add this to your existing models.py)

class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"
    
    # ─── Primary Key ──────────────────────────────────────────────────────────
    id: uuid.UUID = Field(
        sa_column=Column(
            pg.UUID(as_uuid=True), 
            nullable=False, 
            primary_key=True, 
            default=uuid.uuid4
        )
    )
    
    # ─── Core Campaign Fields (aligns with mock data) ─────────────────────────
    name: str = Field(max_length=255, nullable=False)
    client: str = Field(max_length=255, nullable=False)
    status: str = Field(
        sa_column=Column(
            pg.VARCHAR(50), 
            nullable=False, 
            server_default="draft"
        )
    )
    budget: float = Field(
        sa_column=Column(
            pg.NUMERIC(precision=15, scale=2), 
            nullable=False
        )
    )
    
    # ─── Metrics Fields ───────────────────────────────────────────────────────
    spend: float = Field(
        sa_column=Column(
            pg.NUMERIC(precision=15, scale=2), 
            nullable=False, 
            server_default="0"
        )
    )
    impressions: int = Field(
        sa_column=Column(
            pg.BIGINT, 
            nullable=False, 
            server_default="0"
        )
    )
    clicks: int = Field(
        sa_column=Column(
            pg.BIGINT, 
            nullable=False, 
            server_default="0"
        )
    )
    conversions: int = Field(
        sa_column=Column(
            pg.BIGINT, 
            nullable=False, 
            server_default="0"
        )
    )
    
    # ─── Step 1: Client Details ───────────────────────────────────────────────
    industry: Optional[str] = Field(default=None, max_length=255)
    website: Optional[str] = Field(default=None, max_length=500)
    key_competitors: Optional[List[str]] = Field(
        default=None,
        sa_column=Column(pg.JSONB, nullable=True)
    )
    
    # ─── Step 2: Campaign Objective & Targeting ───────────────────────────────
    objective: Optional[str] = Field(
        default=None,
        sa_column=Column(pg.VARCHAR(50), nullable=True)
    )
    target_audience: Optional[dict] = Field(
        default=None,
        sa_column=Column(pg.JSONB, nullable=True)
    )
    start_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True)
    )
    end_date: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True)
    )
    avg_conversion_value: Optional[float] = Field(
        default=None,
        sa_column=Column(
            pg.NUMERIC(precision=15, scale=2), 
            nullable=True
        )
    )
    
    # ─── Step 3: Creative Preferences ─────────────────────────────────────────
    creative_preferences: Optional[dict] = Field(
        default=None,
        sa_column=Column(pg.JSONB, nullable=True)
    )
    
    # ─── Soft Delete ──────────────────────────────────────────────────────────
    deleted_at: Optional[datetime] = Field(
        default=None,
        sa_column=Column(pg.TIMESTAMP(timezone=True), nullable=True, index=True)
    )
    
    # ─── Foreign Key ──────────────────────────────────────────────────────────
    user_uid: Optional[uuid.UUID] = Field(
        default=None, 
        foreign_key="users.uid", 
        index=True
    )
    
    # ─── Timestamps ───────────────────────────────────────────────────────────
    created_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True), 
            nullable=False, 
            default=datetime.utcnow
        )
    )
    updated_at: datetime = Field(
        sa_column=Column(
            pg.TIMESTAMP(timezone=True), 
            nullable=False, 
            default=datetime.utcnow
        )
    )
    
    # ─── Relationships ────────────────────────────────────────────────────────
    user: Optional["User"] = Relationship(
        back_populates="campaigns",
        sa_relationship_kwargs={"lazy": "selectin"}
    )
    
    def __repr__(self):
        return f"<Campaign {self.name} ({self.status})>"

class Alert(SQLModel, table=True):
    __tablename__ = "alerts"

    id: uuid.UUID = Field(
        sa_column=Column(pg.UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    )
    campaign_id: uuid.UUID = Field(foreign_key="campaigns.id", index=True)
    campaign_name: str = Field(max_length=255)
    user_uid: uuid.UUID = Field(foreign_key="users.uid", index=True)
    alert_type: str = Field(max_length=50)  # e.g., "budget_exceeded", "ctr_drop"
    message: str = Field(max_length=500)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(
        sa_column=Column(pg.TIMESTAMP(timezone=True), default=datetime.utcnow)
    )

    def __repr__(self):
        return f"<Alert {self.alert_type} for {self.campaign_name}>"
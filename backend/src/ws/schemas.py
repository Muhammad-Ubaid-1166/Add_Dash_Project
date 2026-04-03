from pydantic import BaseModel
from datetime import datetime
import uuid

class AlertMessage(BaseModel):
    id: uuid.UUID
    campaign_id: uuid.UUID
    campaign_name: str
    alert_type: str
    message: str
    created_at: datetime
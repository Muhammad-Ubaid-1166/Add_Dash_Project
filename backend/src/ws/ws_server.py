from src.auth.utils import decode_token
import asyncio
import random
import logging
from fastapi import WebSocket, WebSocketDisconnect
from sqlmodel import select
from src.db.main import AsyncSessionLocal
from src.db.models import Campaign, Alert
from src.auth.utils import decode_token
from src.ws.schemas import AlertMessage

logger = logging.getLogger(__name__)

# ====================
# Connection Manager
# ====================
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket, user_uid: str):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WS Connected: {user_uid}. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_to_user(self, message: dict, user_uid: str):
        dead_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead_sockets.append(connection)
        for socket in dead_sockets:
            self.active_connections.remove(socket)

# Instantiate the manager globally so the background task can access it
manager = ConnectionManager()


# ====================
# Background Simulator
# ====================
async def alert_simulator():
    while True:
        await asyncio.sleep(15)
        
        # Skip everything if no one is connected
        if not manager.active_connections:
            continue
            
        try:
            async with AsyncSessionLocal() as session:
                stmt = select(Campaign).where(
                    Campaign.deleted_at.is_(None), 
                    Campaign.status == "active"
                )
                result = await session.execute(stmt)
                active_campaigns = result.scalars().all()
                
                breached_campaign = None
                alert_type = None
                message = None

                for c in active_campaigns:
                    # Check Budget Threshold (>90% spent)
                    if c.budget > 0 and (c.spend / c.budget) > 0.9:
                        breached_campaign = c
                        alert_type = "budget_exceeded"
                        message = f"Spend alert! '{c.name}' has used {round((c.spend/c.budget)*100)}% of its budget."
                        break
                    
                    # Check CTR Threshold (<1%)
                    if c.impressions > 0:
                        ctr = (c.clicks / c.impressions) * 100
                        if ctr < 1.0:
                            breached_campaign = c
                            alert_type = "ctr_drop"
                            message = f"CTR alert! '{c.name}' CTR dropped to {round(ctr, 2)}% (below 1%)."
                            break

                # If no real breach, simulate a fake one
                if not breached_campaign and active_campaigns:
                    breached_campaign = random.choice(active_campaigns)
                    alert_type = random.choice(["budget_exceeded", "ctr_drop"])
                    if alert_type == "budget_exceeded":
                        message = f"Simulated Spend alert for '{breached_campaign.name}'."
                    else:
                        message = f"Simulated CTR drop for '{breached_campaign.name}'."

                # If we have a campaign, save to DB and broadcast
                if breached_campaign:
                    new_alert = Alert(
                        campaign_id=breached_campaign.id,
                        campaign_name=breached_campaign.name,
                        user_uid=breached_campaign.user_uid,
                        alert_type=alert_type,
                        message=message
                    )
                    session.add(new_alert)
                    await session.commit()
                    await session.refresh(new_alert)

                    ws_message = AlertMessage(
                        id=new_alert.id,
                        campaign_id=breached_campaign.id,
                        campaign_name=breached_campaign.name,
                        alert_type=alert_type,
                        message=message,
                        created_at=new_alert.created_at
                    ).model_dump(mode="json")

                    await manager.broadcast_to_user(ws_message, breached_campaign.user_uid)
                    logger.info(f"Alert fired: {message}")

        except Exception as e:
            logger.error(f"Alert simulator error: {e}")


async def websocket_endpoint(websocket: WebSocket, token: str):
    # token is already extracted by FastAPI — no need for path parsing
    payload = decode_token(token)
    if not payload:
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    user_uid = payload.get("user", {}).get("user_uid")
    if not user_uid:
        await websocket.close(code=4001, reason="Invalid token payload")
        return

    # 3. Connect & Store
    await manager.connect(websocket, user_uid)
    
    # 4. Send unread alerts on connect
    async with AsyncSessionLocal() as session:
        stmt = select(Alert).where(
            Alert.user_uid == user_uid,
            Alert.is_read == False
        ).order_by(Alert.created_at.desc())
        
        result = await session.execute(stmt)
        unread_alerts = result.scalars().all()
        
        for alert in unread_alerts:
            ws_message = AlertMessage(
                id=alert.id,
                campaign_id=alert.campaign_id,
                campaign_name=alert.campaign_name,
                alert_type=alert.alert_type,
                message=alert.message,
                created_at=alert.created_at
            ).model_dump(mode="json")
            await websocket.send_json(ws_message)

    # 4. Keep alive
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket)
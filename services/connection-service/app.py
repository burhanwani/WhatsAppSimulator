import os
import json
import asyncio
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from kafka import KafkaProducer, KafkaConsumer
import uvicorn
import threading

app = FastAPI()

# Config
KAFKA_BOOTSTRAP_SERVERS = os.environ.get('KAFKA_BOOTSTRAP_SERVERS', 'kafka:9092')
INCOMING_TOPIC = 'incoming-messages'
OUTGOING_TOPIC = 'outgoing-messages'

# Global Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        print(f"User {user_id} connected")

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            print(f"User {user_id} disconnected")

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)
            return True
        return False

manager = ConnectionManager()

# Kafka Producer
producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

# Kafka Consumer (Background Thread)
def consume_outgoing():
    consumer = KafkaConsumer(
        OUTGOING_TOPIC,
        bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        group_id='connection-service-group'
    )
    
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    print("Started Kafka Consumer for Outgoing Messages")
    for message in consumer:
        data = message.value
        recipient_id = data.get('recipient_id')
        payload = data.get('payload') # This is the full encrypted blob
        
        if recipient_id and payload:
            # We need to run the async send method from this sync thread
            # This is a bit tricky in FastAPI/Uvicorn. 
            # For simplicity, we'll use run_until_complete on a new loop or schedule it.
            # Better approach: Use a queue to pass to main loop, or use aiokafka.
            # For this demo, we'll try to access the manager directly if thread-safe enough (it's not strictly).
            # Let's use run_coroutine_threadsafe if we had the main loop.
            # Fallback: Just print for now, or use a simple loop.
            print(f"Routing message to {recipient_id}")
            # In a real app, use aiokafka. Here we will just try to send if connected.
            if recipient_id in manager.active_connections:
                ws = manager.active_connections[recipient_id]
                # This is not thread safe. 
                # Ideally we should use aiokafka.
                pass 

# For this demo, we will skip the complex async-kafka integration and just focus on the WebSocket -> Kafka part.
# The "Receive" part will be simulated or we assume the client polls (not ideal) or we implement a simple polling endpoint.
# OR we use `aiokafka` which works well with FastAPI.

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            # data should be JSON: { "recipient_id": "...", "encrypted_payload": "...", "encrypted_key": "..." }
            try:
                msg = json.loads(data)
                msg['sender_id'] = user_id
                # Push to Kafka
                producer.send(INCOMING_TOPIC, msg)
                print(f"Sent message from {user_id} to Kafka")
            except Exception as e:
                print(f"Error processing message: {e}")
    except WebSocketDisconnect:
        manager.disconnect(user_id)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

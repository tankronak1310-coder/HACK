import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';

interface ClientConnection {
  ws: WebSocket;
  userId?: string;
  clubId?: string;
  eventId?: string;
  userName?: string;
}

class RealtimeHub {
  private wss: WebSocketServer | null = null;
  private clients = new Set<ClientConnection>();

  initialize(server: http.Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      const client: ClientConnection = { ws };
      this.clients.add(client);

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(client, message);
        } catch {
          // ignore malformed frame
        }
      });

      ws.on('close', () => {
        this.clients.delete(client);
        if (client.eventId && client.userName) {
          this.broadcastToEvent(client.eventId, {
            type: 'USER_LEFT',
            payload: { userId: client.userId, userName: client.userName },
          });
        }
      });
    });

    console.log('[Realtime] WebSocket hub initialized on /ws');
  }

  private handleClientMessage(client: ClientConnection, message: any) {
    switch (message.type) {
      case 'SUBSCRIBE_EVENT':
        client.eventId = message.eventId;
        client.clubId = message.clubId;
        client.userId = message.userId;
        client.userName = message.userName;

        // Broadcast presence
        this.broadcastToEvent(message.eventId, {
          type: 'USER_JOINED',
          payload: { userId: client.userId, userName: client.userName },
        });
        break;

      case 'PING':
        client.ws.send(JSON.stringify({ type: 'PONG', timestamp: Date.now() }));
        break;
    }
  }

  broadcastToEvent(eventId: string, data: any) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.eventId === eventId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  broadcastToClub(clubId: string, data: any) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.clubId === clubId && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  broadcastAll(data: any) {
    const payload = JSON.stringify(data);
    for (const client of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  broadcastTaskUpdate(eventId: string, task: any) {
    this.broadcastToEvent(eventId, {
      type: 'TASK_UPDATED',
      payload: task,
    });
  }

  broadcastRiskAlert(eventId: string, risk: any) {
    this.broadcastToEvent(eventId, {
      type: 'RISK_ALERT',
      payload: risk,
    });
  }

  broadcastHealthUpdate(eventId: string, healthScore: number) {
    this.broadcastToEvent(eventId, {
      type: 'HEALTH_SCORE_UPDATED',
      payload: { healthScore },
    });
  }

  broadcastAiActionExecuted(eventId: string, action: any) {
    this.broadcastToEvent(eventId, {
      type: 'AI_ACTION_EXECUTED',
      payload: action,
    });
  }
}

export const realtimeHub = new RealtimeHub();

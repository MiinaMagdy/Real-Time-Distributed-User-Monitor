import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SocketService } from './socket.service';
import { Subscription } from 'rxjs';

interface ServerInfo {
  serverName: string;
  connectedUsers: number;
  lastEvent: 'connected' | 'disconnected';
  timestamp: Date;
}

interface EventLog {
  type: 'connected' | 'disconnected';
  server: string;
  users: number;
  totalOnline: number;
  timestamp: Date;
}

interface ServersStats {
  servers: Record<string, { serverName: string; connectedUsers: number }>;
  onlineUsers: number;
  currentServer: string;
  socketID: string;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Server Monitor';
  totalOnlineUsers = 0;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'connecting';
  myServer = '';
  servers = new Map<string, ServerInfo>();
  eventLog: EventLog[] = [];
  currentTime = new Date();

  private subscriptions: Subscription[] = [];
  private timeInterval: ReturnType<typeof setInterval> | null = null;

  constructor(private socketService: SocketService) { }

  ngOnInit() {
    // Update clock every second
    this.timeInterval = setInterval(() => {
      this.currentTime = new Date();
    }, 1000);

    const connSub = this.socketService.listen<ServersStats>('user:connected').subscribe((data) => {
      this.connectionStatus = 'connected';
      if (this.socketService.getSocketId() === data.socketID) {
        this.myServer = data.currentServer;
      }
      this.updateState(data, 'connected');
    });

    const discSub = this.socketService.listen<ServersStats>('user:disconnected').subscribe((data) => {
      this.connectionStatus = 'connected';
      this.updateState(data, 'disconnected');
    });

    this.subscriptions.push(connSub, discSub);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(s => s.unsubscribe());
    if (this.timeInterval) clearInterval(this.timeInterval);
    this.socketService.disconnect();
  }

  private updateState(data: ServersStats, eventType: 'connected' | 'disconnected') {
    this.totalOnlineUsers = Number(data.onlineUsers) || 0;
    console.log(data)
    // Update all server entries from the servers record
    for (const [name, serverData] of Object.entries(data.servers)) {
      const previous = this.servers.get(name);
      const connectedUsers = Number(serverData.connectedUsers) || 0;

      this.servers.set(name, {
        serverName: name,
        connectedUsers,
        lastEvent: data.currentServer === name ? eventType : (previous?.lastEvent ?? eventType),
        timestamp: data.currentServer === name ? new Date() : (previous?.timestamp ?? new Date())
      });

      // Log event only for the server whose user count changed
      if (data.currentServer === name) {
        this.eventLog.unshift({
          type: eventType,
          server: name,
          users: connectedUsers,
          totalOnline: this.totalOnlineUsers,
          timestamp: new Date()
        });
      }
    }

    if (this.eventLog.length > 20) {
      this.eventLog = this.eventLog.slice(0, 20);
    }
  }

  get serverList(): ServerInfo[] {
    return Array.from(this.servers.values());
  }

  get activeServerCount(): number {
    return this.servers.size;
  }

  getServerLoadPercent(server: ServerInfo): number {
    if (this.totalOnlineUsers === 0) return 0;
    return Math.round((server.connectedUsers / this.totalOnlineUsers) * 100);
  }

  getTimeSince(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 5) return 'just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }
}

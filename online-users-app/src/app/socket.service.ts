import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { io, Socket } from "socket.io-client";

@Injectable({
    providedIn: "root",
})
export class SocketService {
    private socket: Socket;

    constructor() {
        this.socket = io("http://localhost:8080", {
            transports: ["websocket"],
        });
    }

    emit(event: string, data?: unknown): void {
        this.socket.emit(event, data);
    }

    listen<T>(event: string): Observable<T> {
        return new Observable<T>((observer) => {
            this.socket.on(event, (data: T) => {
                observer.next(data);
            });

            return () => {
                this.socket.off(event);
            };
        });
    }

    getSocketId(): string | undefined {
        return this.socket.id;
    }

    disconnect(): void {
        this.socket.disconnect();
    }
}
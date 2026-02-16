
## 🎯 Project Goal
Build a learning-focused web application that:
- Shows the number of online users currently connected.
- Displays how many servers are serving the app.
- Provides per-server details (e.g., number of connected users).
- Explores concepts like **network connections, load balancing, caching (Redis), and sockets**.

This project is not about production readiness—it’s about **learning how pieces connect together**.

---

## 🛠️ Core Components
- **Front-end (Web Page)**  
  - Displays online user count and server details.
  - Can be simple HTML/JS or a framework like Angular.

- **Back-end (Servers)**  
  - Multiple server instances (replicas).
  - Each handles user connections via sockets (e.g., WebSocket).

- **Load Balancer**  
  - Distributes incoming connections across servers.
  - Could be Nginx, HAProxy, or a simple round-robin script.

- **Redis (Cache/Shared Store)**  
  - Central place to store connection counts.
  - Ensures all servers share a consistent view of online users.

---

## 🧩 Architecture Flow
1. User connects → Load balancer decides which server.  
2. Server registers connection in Redis.  
3. Redis keeps global count of all users.  
4. Front-end queries servers → servers fetch from Redis → display stats.

---

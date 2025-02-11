package wsmanager

import (
	"fmt"
	"log"
	"sync"

	"github.com/gorilla/websocket"
)

// WebSocketManager struct to handle multiple connections per user
type WebSocketManager struct {
	clients map[string][]*websocket.Conn
	mu      sync.Mutex
}

// Global instance
var Manager = NewWebSocketManager()

// NewWebSocketManager initializes a new WebSocketManager
func NewWebSocketManager() *WebSocketManager {
	return &WebSocketManager{
		clients: make(map[string][]*websocket.Conn),
	}
}

// AddConnection adds a new WebSocket connection for a user
func (m *WebSocketManager) AddConnection(userID string, conn *websocket.Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Println("Adding connection for user", userID)
	m.clients[userID] = append(m.clients[userID], conn)
}

// RemoveConnection removes a WebSocket connection for a user
func (m *WebSocketManager) RemoveConnection(userID string, conn *websocket.Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()

	connections := m.clients[userID]
	for i, c := range connections {
		if c == conn {
			m.clients[userID] = append(connections[:i], connections[i+1:]...)
			break
		}
	}

	if len(m.clients[userID]) == 0 {
		delete(m.clients, userID)
	}
}

// BroadcastMessage sends a message to all connections of a user
func (m *WebSocketManager) BroadcastMessage(userID string, message interface{}) {
	m.mu.Lock()
	defer m.mu.Unlock()
	fmt.Println("Broadcasting message to user", m.clients[userID])

	if connections, exists := m.clients[userID]; exists {
		for _, conn := range connections {
			err := conn.WriteJSON(message)
			if err != nil {
				log.Println("Error sending message:", err)
			}
		}
	}
}
